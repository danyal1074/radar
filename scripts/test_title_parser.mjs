function decodeHtmlEntities(str) {
  return str.replace(/&#x([0-9a-fA-F]+);/g, (_, hex) =>
    String.fromCharCode(parseInt(hex, 16))
  );
}

function parseCardTitle(rawTitle) {
  let decoded = decodeHtmlEntities(rawTitle).trim();
  // Strip prefix like "محدوده قیمت خرید و فروش" or "تخمین قیمت ... کارکرده"
  decoded = decoded.replace(/^.*?خرید و فروش\s+/i, "");

  const m = decoded.match(/^(.*?)\s+با بازه تولید\s+(\d{4})\s+تا\s+(?:سال\s+)?(\d{4})\s+از قیمت\s+([\d.]+)\s+تا\s+([\d.]+)\s+(میلیون|میلیارد)/i);
  if (!m) return null;

  const name = m[1].trim();
  const startYear = parseInt(m[2], 10);
  const endYear = parseInt(m[3], 10);
  const unit = m[6];
  const mult = unit === "میلیارد" ? 1_000_000_000 : 1_000_000;
  const minPrice = Math.round(parseFloat(m[4]) * mult);
  const maxPrice = Math.round(parseFloat(m[5]) * mult);

  return { name, startYear, endYear, minPrice, maxPrice };
}

const titles = [
  "محدوده قیمت خرید و فروش &#x67E;&#x631;&#x627;&#x6CC;&#x62F; 132 SE با بازه تولید 1392 تا سال 1398 از قیمت 780 تا 980 &#x645;&#x6CC;&#x644;&#x6CC;&#x648;&#x646; در بازار خودرو ایران",
  "&#x67E;&#x698;&#x648; 508 GT Line با بازه تولید 2016 تا سال 2017 از قیمت 4.980 تا 5.540 &#x645;&#x6CC;&#x644;&#x6CC;&#x627;&#x631;&#x62F; در بازار خودرو ایران",
  "&#x67E;&#x698;&#x648; 207 &#x67E;&#x627;&#x646;&#x648;&#x631;&#x627;&#x645;&#x627; &#x62F;&#x646;&#x62F;&#x647; &#x627;&#x6CC; TU5 با بازه تولید 1399 تا سال 1404 از قیمت 2.250 تا 2.810 &#x645;&#x6CC;&#x644;&#x6CC;&#x627;&#x631;&#x62F; در بازار خودرو ایران",
];

for (const t of titles) {
  console.log(parseCardTitle(t));
}
