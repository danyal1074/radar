import fs from "fs";

const html = fs.readFileSync(".data/baravard_pride.html", "utf8");

const idx = html.indexOf("/pricing/310/");
if (idx !== -1) {
  console.log("Snippet of card:\n", html.substring(idx - 50, idx + 600));
}
