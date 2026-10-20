import fs from "fs";

const html = fs.readFileSync(".data/baravard_pride.html", "utf8");

// Look for cards, text, year ranges, etc.
// Let's find matches for "151" or "132" or "131"
const lines = html.split("\n");
console.log("Total lines:", lines.length);

// Let's inspect JSON-LD #6 completely
const match = html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
if (match) {
  for (const m of match) {
    if (m.includes('"AggregateOffer"') || m.includes('"Product"')) {
      const jsonStr = m.replace(/<script[^>]*>/i, "").replace(/<\/script>/i, "");
      const parsed = JSON.parse(jsonStr);
      console.log("Found ItemList with items:", parsed.itemListElement?.length);
      console.log("Sample items:", JSON.stringify(parsed.itemListElement?.slice(0, 5), null, 2));
    }
  }
}

// Let's also inspect one car page: e.g. /pricing/973/پراید-151-gx/ or pride 132
// What other URLs are in JSON-LD #6?
