async function test() {
  const r = await fetch('https://baravard.com/pricing', {
    headers: { 'User-Agent': 'Mozilla/5.0' }
  });
  const html = await r.text();
  const brandLinks = [...new Set([...html.matchAll(/href=["'](\/pricing\/[a-zA-Z0-9_-]+)["']/g)].map(m => m[1]))];
  console.log('Total brand links in Baravard:', brandLinks.length);
  console.log('First 20:', brandLinks.slice(0, 20));

  // Test fetching quick, saina, peugeot, dena, tara
  const testSlugs = ['/pricing/quick', '/pricing/saina', '/pricing/peugeot', '/pricing/dena', '/pricing/tara'];
  for (const slug of testSlugs) {
    const res = await fetch(`https://baravard.com${slug}`, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    const sHtml = await res.text();
    const titleMatches = [...sHtml.matchAll(/title="محدوده قیمت خرید و فروش ([^"]+)"/gi)];
    console.log(`\nSlug ${slug} has ${titleMatches.length} models:`);
    for (const tm of titleMatches.slice(0, 5)) {
      console.log(' ->', tm[1]);
    }
  }
}

test();
