import fs from "fs";

const html = fs.readFileSync(".data/baravard_pride.html", "utf8");

// Search for any element or text with "از" and "تا" and "میلیون" or "تومان"
// Let's find matches for "310" or "پراید 132"
const regex = /<a[^>]*href=["']([^"']*pricing\/\d+\/[^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi;
const matches = [...html.matchAll(regex)];
console.log("Model link matches:", matches.length);
for (let i = 0; i < Math.min(matches.length, 10); i++) {
  const clean = matches[i][2].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  console.log(`Link: ${matches[i][1]} -> Text: ${clean}`);
}
