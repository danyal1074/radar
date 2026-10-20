import fs from "fs";

const html = fs.readFileSync(".data/baravard_pride.html", "utf8");
console.log(html.substring(127900, 129000));
