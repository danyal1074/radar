import fs from "fs";

async function inspectModelPage() {
  const url = "https://baravard.com/pricing/310/پراید-132-se/";
  const res = await fetch(encodeURI(url), {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    },
  });
  console.log("Status:", res.status);
  const html = await res.text();
  fs.writeFileSync(".data/baravard_pride_132_se.html", html, "utf8");
  console.log("Length:", html.length);

  // Look for JSON-LD or table
  const jsonLds = [...html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  console.log("JSON-LD scripts:", jsonLds.length);
  for (let i = 0; i < jsonLds.length; i++) {
    console.log(`JSON-LD ${i}:`, jsonLds[i][1].substring(0, 500));
  }

  // Look for table rows
  const trs = [...html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)];
  console.log("Table rows:", trs.length);
  for (let i = 0; i < Math.min(trs.length, 15); i++) {
    console.log(`TR ${i}:`, trs[i][1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
  }
}

inspectModelPage().catch(console.error);
