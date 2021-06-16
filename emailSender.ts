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
let custom = {};
let adminCrons = [];

app.use(express.json());

const options = {
    headers: {
        Authorization: process.env.authToken,
    },
};

initialize();

app.post("/recover", (req, res) => {
    //console.log(req);
    let recoverToken = req.body.recoverToken;
    let email = req.body.email;

    let recoverEmail = fs
        .readFileSync("./templates/recoverTemplate.html")
        .toString()
        .replace(
            "##$#recoverUrl#$##",
            `hermesduck.com/#/recover/${recoverToken}`
        );

    sendEmail(
        recoverEmail,
        email,
        "HermesDuck <hermesduck@gmail.com>",
        "Restablecimiento de contraseña"
    );
    res.send("mensaje recibido");
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
                //custom: r.newsletterCustom,
                cron: new CronJob(r.senddate, function () {
                    prepareEmails(parentId);
                }),
                sendstate: r.sendstate,
            });
        })
        .then(() => {
            let adminCron = adminCrons.find((admin) => admin.id == id);
            if (adminCron.sendstate) {
                adminCron.cron.start();
                console.log("nuevo cron empezado");
            }
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
            if (adminCron.sendstate) {
                adminCron.cron.start();
            }
            res.send();
        })
        .catch((err) => console.log(err.message));
});

function initialize() {
    axios
        .get(process.env.apiUrl + "admin/", options)
        .then((r) => r.data)
        .then((r) =>
            r.forEach((element) => {
                console.log(element.senddate);
                let parentId = element._id;
                //let customParent = element.newsletterCustom;
                adminCrons.push({
                    id: element._id,
                    //custom: element.newsletterCustom,
                    cron: new CronJob(element.senddate, function () {
                        console.log(element.senddate);
                        prepareEmails(parentId);
                    }),
                    sendstate: element.sendstate,
                });
            })
        )
        .then(() =>
            adminCrons.forEach((a) => {
                if (a.sendstate) {
                    a.cron.start();
                }
            })
        )
        .catch((err) => console.log(err.message));
}

function prepareEmails(id) {
    users = [];
    news = [];
    custom = {};

    axios
        .all([
            axios.get(process.env.apiUrl + "users/owner/" + id, options),
            axios.get(process.env.apiUrl + "news/owner/" + id, options),
            axios.get(process.env.apiUrl + "admin/", options),
        ])
        .then(
            axios.spread((usersResponse, newsResponse, adminsResponse) => {
                users = usersResponse.data;
                news = newsResponse.data;
                custom = adminsResponse.data.find(
                    (admin) => admin._id == id
                ).newsletterCustom;

                if (users.length > 0 && news.length > 0) {
                    buildEmail(users, news, custom);
                }
            })
        );
}

function buildEmail(users, news, custom) {
    let builtCustomized = fs
        .readFileSync("./templates/newsTemplate.html")
        .toString()
        .replace("##$#headerImgLink#$##", custom.templateImage)
        .replace("##$#headerTitle#$##", custom.headerTitle)
        .replace("##$#headerText#$##", custom.headerText)
        .replace("##$#footerText1#$##", custom.footer1)
        .replace("##$#footerText2#$##", custom.footer2)
        .replace("##$#webUrl#$##", custom.webUrl)
        .replace("##$#webText#$##", custom.webText)
        .replace("##$#footerDirections#$##", custom.footerDirection)
        .replace(/#ffa73b/g, custom.templateColor);

    // if (custom.headerImgLink) {
    //     builtEmail.replace("##$#headerImgLink#$##", custom.headerImgLink);
    // } else {
    //     builtEmail.replace("##$#headerImgLink#$##", "");
    // }
    // if (custom.headerTitle) {
    //     builtEmail.replace("##$#headerTitle#$##", custom.headerTitle);
    // } else {
    //     builtEmail.replace("##$#headerTitle#$##", "");
    // }
    // if (custom.headerText) {
    //     builtEmail.replace("##$#headerText#$##", custom.headerText);
    // } else {
    //     builtEmail.replace("##$#headerText#$##", "");
    // }
    // if (custom.footerText1) {
    //     builtEmail.replace("##$#footerText1#$##", custom.footerText1);
    // } else {
    //     builtEmail.replace("##$#footerText1#$##", "");
    // }
    // if (custom.footerText2) {
    //     builtEmail.replace("##$#footerText2#$##", custom.footerText2);
    // } else {
    //     builtEmail.replace("##$#footerText2#$##", "");
    // }
    // if (custom.webUrl) {
    //     builtEmail.replace("##$#webUrl#$##", custom.webUrl);
    // } else {
    //     builtEmail.replace("##$#webUrl#$##", "");
    // }
    // if (custom.webText) {
    //     builtEmail.replace("##$#webText#$##", custom.webText);
    // } else {
    //     builtEmail.replace("##$#webText#$##", "");
    // }

    users.forEach((u) => {
        let tags = [];
        u.tags.forEach((element) => {
            tags.push(element.name);
        });

        let builtEmailBody = emailGenerator(news, tags);
        if (builtEmailBody) {
            let builtEmail = builtCustomized.replace(
                "##$#newsBody#$##",
                builtEmailBody
            );

            sendEmail(
                builtEmail,
                u.email,
                custom.emailFrom,
                custom.emailSubject
            );
        }
    });
}

function sendEmail(bodyEmail, email, from, subject) {
    transport.sendMail(
        {
            from: from, //"FPCT <hermesduck@gmail.com>", //cambiar para hacer dinamico
            to: email,
            subject: subject,
            text: "",
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

var transport = nodemailer.createTransport({
    host: process.env.sendInBlueHost,
    port: process.env.sendInBluePort,
    auth: {
        user: process.env.sendInBlueUser,
        pass: process.env.sendInBluePass,
    },
});

transport.verify(function (error) {
    if (error) {
        console.log(error.message);
    } else {
        console.log("Server is ready to take our messages");
    }
});

app.listen(port, () => {
    console.log(`emailSender escuchando en el puerto ${port}`);
});

//----DEBUG ----
// var transport = nodemailer.createTransport({
//     host: process.env.mailtrapHost,
//     port: process.env.mailtrapPort,
//     auth: {
//         user: process.env.mailtrapUser,
//         pass: process.env.mailtrapPass,
//     },
// });
