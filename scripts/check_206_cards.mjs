import fs from "fs";

async function inspectCards() {
  const res = await fetch("https://baravard.com/pricing/peugeot/");
  const html = await res.text();
  
  const matches = [...html.matchAll(/title="محدوده قیمت خرید و فروش ([^"]*206[^"]*)"/gi)];
  for (const m of matches) {
    console.log("206 title:", m[1]);
  }

  // Also check for "فرانسوی"
  const frenchMatches = [...html.matchAll(/title="محدوده قیمت خرید و فروش ([^"]*فرانسوی[^"]*)"/gi)];
  for (const m of frenchMatches) {
    console.log("French title:", m[1]);
  }
}

inspectCards();
