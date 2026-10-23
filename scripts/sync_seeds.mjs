import fs from 'node:fs';

const content = fs.readFileSync('lib/daily-prices/service.ts', 'utf8');
const match = content.match(/const SEED_DISCONTINUED: [^=]+ = (\[[\s\S]*?\]);/);
if (!match) {
  console.error('Could not extract SEED_DISCONTINUED');
  process.exit(1);
}

// Evaluate seed array
const seeds = eval(match[1]);
console.log('Loaded seeds:', seeds.length);

function generateId(name, year) {
  return `${name}-${year}`
    .replace(/\s+/g, '-')
    .replace(/[^\w\u0600-\u06FF-]/g, '')
    .toLowerCase();
}

let existing = [];
try {
  existing = JSON.parse(fs.readFileSync('.data/daily_car_prices.json', 'utf8'));
} catch (e) {
  existing = [];
}

console.log('Existing count before sync:', existing.length);
const existingMap = new Map();
for (const p of existing) {
  existingMap.set(p.id, p);
}

const nowStr = new Date().toISOString();
for (const seed of seeds) {
  const id = `seed-${generateId(seed.name, seed.year)}`;
  if (!existingMap.has(id)) {
    existingMap.set(id, {
      ...seed,
      id,
      updatedAt: nowStr
    });
  }
}

const merged = Array.from(existingMap.values());
fs.writeFileSync('.data/daily_car_prices.json', JSON.stringify(merged, null, 2), 'utf8');
console.log('Merged count after sync:', merged.length);
