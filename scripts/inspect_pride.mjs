import fs from "fs";

async function checkSub() {
  const url = "https://baravard.com/pricing/pride";
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    },
  });
  const html = await res.text();
  fs.writeFileSync(".data/baravard_pride.html", html, "utf8");
  console.log("Pride page length:", html.length);

  // Look for JSON-LD or script data
  const jsonLdMatches = [...html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  console.log("JSON-LD scripts found:", jsonLdMatches.length);
  for (let i = 0; i < jsonLdMatches.length; i++) {
    console.log(`--- JSON-LD #${i + 1} ---`);
    console.log(jsonLdMatches[i][1].substring(0, 1000));
  }

  // Look for models / tables / cards
  const links = [...html.matchAll(/href="([^"]*pricing\/pride\/[^"]*)"/gi)].map((m) => m[1]);
  console.log("Pride sub links found:", [...new Set(links)]);
}

checkSub().catch(console.error);
