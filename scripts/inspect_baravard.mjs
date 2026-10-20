import fs from "fs";

async function run() {
  const res = await fetch("https://baravard.com/pricing", {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    },
  });
  const html = await res.text();
  fs.writeFileSync(".data/baravard.html", html, "utf8");
  console.log("HTML length:", html.length);

  // Check for keywords
  const keywords = ["پراید", "پژو", "تومان", "میلیون", "مدل", "تولید", "pricing"];
  for (const kw of keywords) {
    const count = (html.match(new RegExp(kw, "g")) || []).length;
    console.log(`Keyword '${kw}': ${count} occurrences`);
  }

  // Look for links or brand blocks
  const links = [...html.matchAll(/href="([^"]*pricing[^"]*)"/gi)].map((m) => m[1]);
  console.log("Pricing links found:", [...new Set(links)].slice(0, 20));

  // Find sample snippets around "پراید"
  const idx = html.indexOf("پراید");
  if (idx !== -1) {
    console.log("Snippet around 'پراید':\n", html.substring(Math.max(0, idx - 200), idx + 400));
  }
}

run().catch(console.error);
