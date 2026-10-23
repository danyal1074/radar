async function test() {
  const r = await fetch('https://baravard.com/pricing/quick', {
    headers: { 'User-Agent': 'Mozilla/5.0' }
  });
  const html = await r.text();
  console.log('Quick page size:', html.length);

  // Look for cards or title attributes
  const titleMatches = [...html.matchAll(/title="محدوده قیمت خرید و فروش ([^"]+)"/gi)];
  console.log(`Title matches found: ${titleMatches.length}`);
  for (const tm of titleMatches) {
    console.log('->', tm[1]);
  }

  // Look for JSON-LD or schema
  const scripts = [...html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  for (const s of scripts) {
    try {
      const d = JSON.parse(s[1]);
      if (d.itemListElement) {
        console.log('ItemListElement found:', d.itemListElement.length);
        for (const el of d.itemListElement) {
          console.log(el.item?.name, '--> offers:', JSON.stringify(el.item?.offers));
        }
      }
    } catch(e) {}
  }
}

test();
