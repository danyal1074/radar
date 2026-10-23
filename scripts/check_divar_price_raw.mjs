async function f() {
  const r = await fetch('https://divar.ir/s/mashhad/car', {
    headers: { 'User-Agent': 'Mozilla/5.0' }
  });
  const h = await r.text();
  const m = [...h.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)];
  for (const match of m) {
    try {
      const p = JSON.parse(match[1]);
      const list = Array.isArray(p) ? p : [p];
      for (const item of list) {
        if (item['@type'] === 'Car' && item.offers?.price) {
          console.log('Car name:', item.name);
          console.log('offers.price raw:', item.offers.price);
          console.log('offers.priceCurrency:', item.offers.priceCurrency);
          console.log('offers full:', JSON.stringify(item.offers));
          return;
        }
      }
    } catch(e) {}
  }
}
f();
