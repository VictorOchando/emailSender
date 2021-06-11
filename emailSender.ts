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
    .get(process.env.apiUrl + "admin", options)
    .then((r) => r.data)
    .then((r) =>
        r.forEach((element) => {
            console.log(element.senddate);
            let parentId = element._id;
            adminCrons.push({
                id: element._id,
                cron: new CronJob("* * * * *", () => {
                    prepareEmails(parentId);
                    console.log(parentId);
                }),
            });
        })
    )
    .then(() => adminCrons.forEach((a) => a.cron.start()))
    .catch((err) => console.log(err));
//deberia comprobar si tiene una fecha valida antes de start, por si alguien tiene desactivado los envios

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
                    console.log(parentId);
                }),
            });
        })
        .then(() => {
            let adminCron = adminCrons.find((admin) => admin.id == id);
            adminCron.cron.start();
            console.log("nuevo cron empezado");
            res.send();
        })
        .catch((err) => console.log(err));
});

app.get("/settime/:id", (req, res) => {
    let id = req.params.id;
    axios
        .get(process.env.apiUrl + "admin/" + id, options)
        .then((r) => r.data)
        .then((r) => {
            let adminCron = adminCrons.find((admin) => admin.id == id);
            adminCron.cron.setTime(new CronTime(r.senddate));
            console.log(r.senddate);
            adminCron.cron.start();
            res.send();
        })
        .catch((err) => console.log(err));
});

function prepareEmails(id: string) {
    users = [];
    news = [];
    axios
        .all([
            axios.get(process.env.apiUrl + "users/owner/" + id, options),
            axios.get(process.env.apiUrl + "news/owner/" + id, options),
        ])
        .then(
            axios.spread((usersResponse, newsResponse) => {
                console.log(users.length);
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
//-----------------TRANSPORT DE SENDINBLUE--------------
// var transport = nodemailer.createTransport({
//     host: process.env.sendInBlueHost,
//     port: process.env.sendInBluePort,
//     auth: {
//         user: process.env.sendInBlueUser,
//         pass: process.env.sendInBluePass,
//     },
// });

var transport = nodemailer.createTransport({
    host: process.env.mailtrapHost,
    port: process.env.mailtrapPort,
    auth: {
        user: process.env.mailtrapUser,
        pass: process.env.mailtrapPass,
    },
});

transport.verify(function (error) {
    if (error) {
        console.log(error);
    } else {
        console.log("Server is ready to take our messages");
    }
});

function sendEmail(bodyEmail, email) {
    console.log("sent email");
    transport.sendMail(
        {
            from: '"Newsletter FPCT" <hermesduck@hotmail.com>',
            to: email,
            subject: "Newsletter personalizada de la FPCT",
            text: "text",
            html: bodyEmail,
        },
        (error, info) => {
            if (error) {
                return console.log(error);
            }
            console.log("Message sent: %s", info.messageId);
        }
    );
}

app.listen(port, () => {
    console.log(`emailSender escuchando en el puerto ${port}`);
});
