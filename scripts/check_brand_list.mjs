import fs from "fs";

const html = fs.readFileSync(".data/baravard.html", "utf8");

const jsonLds = [...html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
for (const m of jsonLds) {
  if (m[1].includes("لیست قیمت برندهای خودرو") || m[1].includes("ItemList")) {
    const data = JSON.parse(m[1]);
    console.log("Found brand list, total items:", data.itemListElement?.length);
    console.log("First 5 brands:", JSON.stringify(data.itemListElement?.slice(0, 5), null, 2));
  }
}
