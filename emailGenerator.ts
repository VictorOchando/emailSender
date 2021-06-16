//POR QUE TENGO QUE USAR FS2???? esto de que va junior
const fs2 = require("fs");
//let bodyTemplate = fs2.readFileSync("./templates/newsBody.html").toString();

function buildEmailBody(news, userTags) {
    let newsConcat = "";
    news.forEach((e) => {
        let included = false;
        let newsCategories = "";
        e.tags.forEach((t) => {
            if (userTags.includes(t.name)) {
                included = true;
            }
            newsCategories = newsCategories + `[${t.name}] `;
        });
        if (included) {
            let newsBodyTemporal = fs2
                .readFileSync("./templates/newsBody.html")
                .toString()
                .replace("##$#categories#$##", newsCategories)
                .replace("##$#newsTitle#$##", e.title)
                .replace("##$#news#$##", e.body)
                .replace("##$#newsUrl#$##", e.link);

            if (e.link == "") {
                newsBodyTemporal.replace("Link a la noticia", "");
            }
            newsConcat = newsConcat + newsBodyTemporal;
        }
    });

    return newsConcat;
}

module.exports = buildEmailBody;
