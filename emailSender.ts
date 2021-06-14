//TODO: forzar saltos de linea, por que fs2 en el generator
const nodemailer = require("nodemailer");
let fs = require("fs");
const emailGenerator = require("./emailGenerator.ts");
const CronJob = require("cron").CronJob;
const CronTime = require("cron").CronTime;
const axios = require("axios");
require("dotenv").config();
const express = require("express");
const app = express();
const port = 3010;
let cronTask;
let cronArtemis;

let users = [];
let news = [];
let adminCrons = [];

const options = {
    headers: {
        Authorization: process.env.authToken,
    },
};

axios
    .get(process.env.apiUrl + "admin/", options)
    .then((r) => r.data)
    .then((r) =>
        r.forEach((element) => {
            console.log(element.senddate);
            let parentId = element._id;
            adminCrons.push({
                id: element._id,
                cron: new CronJob(element.senddate, function () {
                    console.log(element.senddate);
                    prepareEmails(parentId);
                }),
            });
        })
    )
    .then(() => adminCrons.forEach((a) => a.cron.start()))
    .catch((err) => console.log(err.message));
//deberia comprobar si tiene una fecha valida antes de start, por si alguien tiene desactivado los envios

app.post("/recover", (req, res) => {
    let recoverToken = req.body.recoverToken;
    let email = req.body.email;
    let recoverEmail = `<div>${recoverToken}</div>`;
    sendEmail(recoverEmail, email);
});

app.get("/newadmin/:id", (req, res) => {
    let id = req.params.id;
    axios
        .get(process.env.apiUrl + "admin/" + req.params.id, options)
        .then((r) => r.data)
        .then((r) => {
            let parentId = r._id;
            adminCrons.push({
                id: r._id,
                cron: new CronJob(r.senddate, function () {
                    prepareEmails(parentId);
                }),
            });
        })
        .then(() => {
            let adminCron = adminCrons.find((admin) => admin.id == id);
            adminCron.cron.start();
            console.log("nuevo cron empezado");
            res.send();
        })
        .catch((err) => console.log(err.message));
});

app.get("/settime/:id", (req, res) => {
    let id = req.params.id;
    axios
        .get(process.env.apiUrl + "admin/" + id, options)
        .then((r) => r.data)
        .then((r) => {
            let adminCron = adminCrons.find((admin) => admin.id == id);
            adminCron.cron.setTime(new CronTime(r.senddate));
            console.log("fecha cambiada a" + r.senddate);
            adminCron.cron.start();
            res.send();
        })
        .catch((err) => console.log(err.message));
});

function prepareEmails(id) {
    users = [];
    news = [];
    axios
        .all([
            axios.get(process.env.apiUrl + "users/owner/" + id, options),
            axios.get(process.env.apiUrl + "news/owner/" + id, options),
        ])
        .then(
            axios.spread((usersResponse, newsResponse) => {
                users = usersResponse.data;
                news = newsResponse.data;

                if (users.length > 0 && news.length > 0) {
                    buildEmail(users, news);
                }
            })
        );
}

function buildEmail(users, news) {
    users.forEach((u) => {
        let tags = [];
        u.tags.forEach((element) => {
            tags.push(element.name);
        });

        let builtEmailBody = emailGenerator(news, tags);
        if (builtEmailBody) {
            console.log("builtemail");
            let builtEmail = fs
                .readFileSync("./templates/newsTemplate.html")
                .toString()
                .replace("##$#newsBody#$##", builtEmailBody);

            sendEmail(builtEmail, u.email);
        }
    });
}

var transport = nodemailer.createTransport({
    host: process.env.sendInBlueHost,
    port: process.env.sendInBluePort,
    auth: {
        user: process.env.sendInBlueUser,
        pass: process.env.sendInBluePass,
    },
});

// var transport = nodemailer.createTransport({
//     host: process.env.mailtrapHost,
//     port: process.env.mailtrapPort,
//     auth: {
//         user: process.env.mailtrapUser,
//         pass: process.env.mailtrapPass,
//     },
// });

transport.verify(function (error) {
    if (error) {
        console.log(error.message);
    } else {
        console.log("Server is ready to take our messages");
    }
});

function sendEmail(bodyEmail, email) {
    transport.sendMail(
        {
            from: '"Newsletter FPCT" <hermesduck@gmail.com>',
            to: email,
            subject: "Newsletter personalizada de la FPCT",
            text: "text",
            html: bodyEmail,
        },
        (error, info) => {
            if (error) {
                return console.log(error.message);
            }
            console.log("Message sent: %s", email);
        }
    );
}

app.listen(port, () => {
    console.log(`emailSender escuchando en el puerto ${port}`);
});
