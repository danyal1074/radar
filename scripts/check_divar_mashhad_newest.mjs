async function check() {
  const r = await fetch('https://divar.ir/s/mashhad/car', {
    headers: { 'User-Agent': 'Mozilla/5.0' }
  });
  const html = await r.text();
  const matches = [...html.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)];
  console.log('Matches count:', matches.length);
  for (const m of matches) {
    try {
      const p = JSON.parse(m[1]);
      const list = Array.isArray(p) ? p : [p];
      for (const item of list) {
        if (item['@type'] === 'Car') {
          console.log('Car:', item.name, '| URL:', item.url);
        }
      }
    } catch(e) {}
  }
}

check();
