import fs from "fs";

const html = fs.readFileSync(".data/baravard.html", "utf8");

// Search for cards or tables in baravard.html
// Check for <div class="...
const matchCards = [...html.matchAll(/<div class="[^"]*card[^"]*"[\s\S]*?<\/div>/gi)];
console.log("Card matches:", matchCards.length);

// Look for patterns like "سال" or "مدل" or "تولید"
const regex = /<a[^>]*href=["'](\/pricing\/[^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
const aTags = [...html.matchAll(regex)];
console.log("A tags with pricing:", aTags.length);
for (let i = 0; i < Math.min(aTags.length, 30); i++) {
  const text = aTags[i][2].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  console.log(`[${i}] ${aTags[i][1]} -> ${text}`);
}

// Check JSON-LD in baravard.html
const jsonLds = [...html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
console.log("JSON-LD scripts in /pricing:", jsonLds.length);
for (let i = 0; i < jsonLds.length; i++) {
  console.log(`JSON-LD ${i}:`, jsonLds[i][1].substring(0, 300));
}
