import fs from "fs";

const html = fs.readFileSync(".data/baravard_pride.html", "utf8");

let pos = 0;
while (true) {
  const idx = html.indexOf("/pricing/310/", pos);
  if (idx === -1) break;
  console.log(`Found /pricing/310/ at pos ${idx}:`);
  console.log(html.substring(Math.max(0, idx - 100), Math.min(html.length, idx + 500)));
  console.log("-----------------------------------------");
  pos = idx + 1;
}
