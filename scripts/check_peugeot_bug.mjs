import fs from "fs";

async function inspectPeugeot() {
  const res = await fetch("https://baravard.com/pricing/peugeot/");
  const html = await res.text();
  const idx = html.indexOf("206 SD V8");
  if (idx !== -1) {
    console.log(html.substring(idx - 200, idx + 600));
  }
  const idxFrench = html.indexOf("فرانسوی");
  if (idxFrench !== -1) {
    console.log("Found فرانسوی:");
    console.log(html.substring(idxFrench - 200, idxFrench + 600));
  }
}

inspectPeugeot();
