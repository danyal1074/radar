import fs from 'node:fs';
const envText = fs.readFileSync('.env.local', 'utf8');
for (const line of envText.split('\n')) {
  const trimmed = line.trim();
  if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
    const idx = trimmed.indexOf('=');
    process.env[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim();
  }
}

async function run() {
  const { getServiceStore, estimationConfig } = await import('../lib/db/index.ts');
  const store = await getServiceStore();
  const start = Date.now();
  console.log('Querying listingsNeedingEstimate...');
  const q = await store.listingsNeedingEstimate(new Date(), 200);
  console.log(`Queue length: ${q.length} (took ${Date.now() - start}ms)`);
  if (q.length > 0) {
    console.log('First 3:', q.slice(0, 3).map(x => ({ id: x.id, title: x.title, make: x.make, model: x.model, year: x.year })));
  }
}

run().catch(console.error);
