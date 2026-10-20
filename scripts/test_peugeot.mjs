import fs from "fs";

async function testPeugeot() {
  const url = "https://baravard.com/pricing/peugeot/";
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    },
  });
  const html = await res.text();
  console.log("Peugeot HTML length:", html.length);

  // Look for title attributes
  const titleMatches = [...html.matchAll(/title="محدوده قیمت خرید و فروش ([^"]+)"/gi)];
  console.log("Title matches count:", titleMatches.length);
  for (let i = 0; i < Math.min(titleMatches.length, 10); i++) {
    console.log(`[${i}] ${titleMatches[i][1]}`);
  }

  // Also check JSON-LD
  const jsonLds = [...html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  for (const m of jsonLds) {
    if (m[1].includes('"AggregateOffer"') || m[1].includes('"Product"')) {
      const data = JSON.parse(m[1]);
      console.log("Peugeot JSON-LD products count:", data.itemListElement?.length);
      console.log("Sample 3:", JSON.stringify(data.itemListElement?.slice(0, 3), null, 2));
    }
  }
}

testPeugeot().catch(console.error);
