import fs from "fs";

const html = fs.readFileSync(".data/baravard_pride.html", "utf8");

// Look for cards, text containing "تولید" or "از" or "تا" or numbers
const cardMatches = [...html.matchAll(/<div[^>]*class=["'][^"']*pricing-item[^"']*["'][\s\S]*?<\/div>\s*<\/div>/gi)];
console.log("Pricing items count:", cardMatches.length);

// Let's search for "پراید 131" in the html
const idx = html.indexOf("پراید 131 SE");
if (idx !== -1) {
  console.log("Snippet around 'پراید 131 SE':\n");
  console.log(html.substring(idx - 100, idx + 800));
}

// Let's also search for "132"
const idx132 = html.indexOf("132");
if (idx132 !== -1) {
  console.log("Snippet around '132':\n");
  console.log(html.substring(idx132 - 100, idx132 + 800));
}
