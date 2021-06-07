//TODO: forzar saltos de linea, por que fs2 en el generator

import { createConstructSignature } from "typescript";

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

let users = [];
let news = [];

const options = {
    headers: {
        Authorization: process.env.authToken,
    },
};

cronTask = new CronJob("0 12 * * 5", function () {
    getData();
});
cronTask.start();
//ACTUALIZAR FECHA DE ACTUALIZACION

app.get("/", (req, res) => {
    axios
        .get(process.env.apiUrl + "senddate", options)
        .then((r) => r.data)
        .then((r) => r[0].date)
        .then((r) => cronTask.setTime(new CronTime(r)))
        .then((r) => cronTask.start())
        .then((r) => res.send(`Fecha cambiada correctamente`))
        .catch((err) => console.log(err));
});

function getData() {
    users = [];
    news = [];
    axios
        .all([
            axios.get(process.env.apiUrl + "users", options),
            axios.get(process.env.apiUrl + "news", options),
        ])
        .then(
            axios.spread((usersResponse, newsResponse) => {
                users = usersResponse.data;
                news = newsResponse.data;
                buildEmail(users, news);
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
            let builtEmail = fs
                .readFileSync("./templates/newsTemplate.html")
                .toString()
                .replace("##$#newsBody#$##", builtEmailBody);

            sendEmail(builtEmail, u.email);
        }
    });
}

var transport = nodemailer.createTransport({
    host: "smtp.mailtrap.io",
    port: 2525,
    auth: {
        user: "8f6fd4c67e7b8c",
        pass: "c9aaddf4e4feaf",
    },
});

transport.verify(function (error) {
    if (error) {
        console.log(error);
    } else {
        console.log("Server is ready to take our messages");
    }
});

//TEMPORAL PARA LANZARLO SIN CRON
//getData();

function sendEmail(bodyEmail, email) {
    transport.sendMail(
        {
            from: '"Newsletter FPCT" <newsletter@fpct.com>',
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
