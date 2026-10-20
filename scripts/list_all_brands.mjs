import fs from "fs";

const html = fs.readFileSync(".data/baravard.html", "utf8");
const jsonLds = [...html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
let brands = [];
for (const m of jsonLds) {
  if (m[1].includes("لیست قیمت برندهای خودرو") || m[1].includes("ItemList")) {
    try {
      const data = JSON.parse(m[1]);
      if (data.itemListElement && data.itemListElement.length > 0) {
        brands = data.itemListElement.map((x) => ({
          name: x.item?.name,
          url: x.item?.url,
          description: x.item?.description,
          modelsCount: x.item?.additionalProperty?.value,
        }));
      }
    } catch (e) {}
  }
}

console.log("Total brands from baravard.com/pricing:", brands.length);
console.log(brands.map((b) => `${b.name} (${b.url})`));

