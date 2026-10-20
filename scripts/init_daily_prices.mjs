import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "..");
const dataDir = path.join(root, ".data");
const targetFile = path.join(dataDir, "daily_car_prices.json");

const SEED_FILE = "C:/Users/danyal/.gemini/antigravity/brain/2fc9524c-ce5b-4c94-96c0-72c8fb1a4d7a/scratch/master_prices.json";

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

if (fs.existsSync(SEED_FILE)) {
  const data = fs.readFileSync(SEED_FILE, "utf-8");
  fs.writeFileSync(targetFile, data, "utf-8");
  console.log(`Successfully initialized ${targetFile} with master prices!`);
} else {
  console.log("Seed file not found, creating empty array.");
  fs.writeFileSync(targetFile, JSON.stringify([], null, 2), "utf-8");
}
