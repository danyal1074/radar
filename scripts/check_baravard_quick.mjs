async function check() {
  const res = await fetch('https://baravard.com/pricing/saipa/quick-r', {
    headers: { 'User-Agent': 'Mozilla/5.0' }
  });
  const html = await res.text();
  console.log('Page loaded, size:', html.length);
  
  // Find title
  const titleMatch = html.match(/<title>([^<]*)<\/title>/);
  console.log('Title:', titleMatch ? titleMatch[1] : 'No title');

  // Find all JSON-LD scripts
  const scripts = [...html.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)];
  for (const s of scripts) {
    try {
      const parsed = JSON.parse(s[1]);
      console.log('JSON-LD Type:', parsed['@type']);
      if (JSON.stringify(parsed).includes('1399') || JSON.stringify(parsed).includes('۱۳۹۹')) {
        console.log('JSON-LD with 1399:', JSON.stringify(parsed).slice(0, 500));
      }
    } catch(e) {}
  }

  // Look for text containing ۱۳۹۹ or 1399 and price
  const regex = /(?:مدل\s*)?(?:۱۳۹۹|1399)[\s\S]{1,150}?(?:میلیون|تومان)/g;
  const textMatches = [...html.matchAll(regex)];
  console.log('\nText matches found:', textMatches.length);
  for (const tm of textMatches.slice(0, 10)) {
    console.log('->', tm[0].replace(/\s+/g, ' '));
  }
}

check();
