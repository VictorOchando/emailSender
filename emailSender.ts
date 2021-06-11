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

// let objetoPrueba = {
//     id: "12356515125",
//     cron: new CronJob("* * * * *", function () {
//         //sendEmail("aaa", "victor_lp_gtr@hotmail.com");
//         console.log("cronArtemisssssssss");
//     }),
// };
// objetoPrueba.cron.start();

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
                    //EJECUTAR EL CRONJOB
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
                    //getData(); --COMO PASARLE SU ID AQUI?
                    prepareEmails(parentId);
                    //EJECUTAR EL CRONJOB
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
        .catch((err) => console.log(err)); //se podria buscar el id para mas seguridad
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
    // axios
    //     .get(process.env.apiUrl + "senddate", options)
    //     .then((r) => r.data)
    //     .then((r) => r[0].date)
    //     .then((r) => cronTask.setTime(new CronTime(r)))
    //     .then((r) => cronTask.start())
    //     .then((r) => res.send(`Fecha cambiada correctamente`))
    //     .catch((err) => console.log(err));
});

// cronTask = new CronJob("* * * * *", function () {
//     //getData();
//     //sendEmail("bbb", "victor_las_palmas@hotmail.com");
//     console.log("cronTask");
// });
// cronTask.start();

// cronArtemis = new CronJob("* * * * *", function () {
//     //sendEmail("aaa", "victor_lp_gtr@hotmail.com");
//     console.log("cronArtemis");
// });
// cronArtemis.start();

// let cronTres = new CronJob("* * * * *", function () {
//     //sendEmail();
//     //sendEmail("c cc", "ochando3d@gmail.com");
//     console.log("cronTres");
// });
// cronTres.start();

//ACTUALIZAR FECHA DE ACTUALIZACION

// function getData() {
//     users = [];
//     news = [];
//     axios
//         .all([
//             axios.get(process.env.apiUrl + "users", options),
//             axios.get(process.env.apiUrl + "news", options),
//         ])
//         .then(
//             axios.spread((usersResponse, newsResponse) => {
//                 users = usersResponse.data;
//                 news = newsResponse.data;
//                 buildEmail(users, news);
//             })
//         );
// }

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

//TEMPORAL PARA LANZARLO SIN CRON
//getData();

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
