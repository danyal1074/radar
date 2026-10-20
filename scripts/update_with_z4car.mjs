import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "..");
const pricesFile = path.join(root, ".data", "daily_car_prices.json");

async function run() {
  console.log("Fetching live Z4Car data...");
  const { fetchZ4CarPrices } = await import("../lib/daily-prices/z4car.ts");
  const z4carPrices = await fetchZ4CarPrices();
  console.log(`Fetched ${z4carPrices.length} cars from Z4Car.`);

  let existing = [];
  if (fs.existsSync(pricesFile)) {
    existing = JSON.parse(fs.readFileSync(pricesFile, "utf-8"));
  }

  const existingMap = new Map(existing.map((p) => [p.id, p]));
  const seenIds = new Set();
  const merged = [];

  // Add Z4Car items first
  for (const item of z4carPrices) {
    seenIds.add(item.id);
    const prev = existingMap.get(item.id);
    if (prev && prev.isEditedByAdmin) {
      merged.push(prev);
    } else {
      merged.push(item);
    }
  }

  // Add any existing car.ir items
  for (const item of existing) {
    if (!seenIds.has(item.id)) {
      seenIds.add(item.id);
      // Clean up legacy source if present
      if (item.source === "market_appraisal") {
        item.source = "z4car.com";
      }
      merged.push(item);
    }
  }

  fs.writeFileSync(pricesFile, JSON.stringify(merged, null, 2), "utf-8");
  console.log(`Successfully merged and saved ${merged.length} cars into ${pricesFile}!`);

  const pride132se90 = merged.find((p) => p.name.includes("۱۳۲") && p.year.includes("1390"));
  console.log("Pride 132 SE model 1390 entry:", pride132se90);
}

run();
