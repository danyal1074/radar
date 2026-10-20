import fs from "fs";

async function inspectJsonLdProducts() {
  const res = await fetch("https://baravard.com/pricing/peugeot/");
  const html = await res.text();
  
  const jsonLds = [...html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  for (const m of jsonLds) {
    if (m[1].includes('"Product"')) {
      const data = JSON.parse(m[1]);
      for (const el of data.itemListElement) {
        if (el.item.name.includes("فرانسوی") || el.item.name.includes("206")) {
          console.log(`JSON-LD: "${el.item.name}" -> low: ${el.item.offers?.lowPrice}, high: ${el.item.offers?.highPrice}`);
        }
      }
    }
  }
}

inspectJsonLdProducts();
