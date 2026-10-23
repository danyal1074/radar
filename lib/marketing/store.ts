import fs from "node:fs/promises";
import path from "node:path";
import type { MarketingConfig, MarketingLogItem, MarketingStorage } from "./types";

const DATA_DIR = path.join(process.cwd(), ".data");
const FILE_PATH = path.join(DATA_DIR, "marketing.json");

const DEFAULT_TEMPLATE = `{سلام|درود|وقت بخیر} {بزرگوار|دوست عزیز|جناب}،
در مورد آگهی {car_title} شما در {city} پیام دادم.

اگر بعد از فروش خودروتون، قصد خرید یا تعویض با ماشین دیگه‌ای رو دارید، پیشنهاد می‌کنم حتماً از سامانه «رادار خودرو» استفاده کنید؛
این سامانه هوشمند، کل آگهی‌های دیوار و شیپور رو لحظه‌ای رصد می‌کنه و آگهی‌های سالم و زیر قیمت بازار رو قبل از اینکه بقیه باخبر بشن براتون شکار می‌کنه تا بدون واسطه و با بهترین قیمت خرید کنید.

🎁 استفاده از تمام امکانات و ربات شکارچی سامانه تا مدت محدودی کاملاً رایگان است.

برای دیدن توضیحات، سابقه و نحوه کار، آگهی ما رو در دیوار ببینید:
{ad_link}

امیدوارم خودروتون رو هم به بهترین قیمت بفروشید. موفق باشید.`;

const DEFAULT_CONFIG: MarketingConfig = {
  divarPhone: "",
  divarToken: "",
  sheypoorPhone: "",
  sheypoorToken: "",
  adLink: "https://divar.ir/v/gab_i-HB",
  sheypoorAdLink: "",
  template: DEFAULT_TEMPLATE,
  dailyLimit: 25,
  delaySeconds: 60,
  autoSendEnabled: false,
  targetCity: "مشهد",
};

export async function readMarketingStorage(): Promise<MarketingStorage> {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    const content = await fs.readFile(FILE_PATH, "utf-8");
    const data = JSON.parse(content) as MarketingStorage;
    return {
      config: { ...DEFAULT_CONFIG, ...(data.config || {}) },
      logs: Array.isArray(data.logs) ? data.logs : [],
    };
  } catch {
    return {
      config: DEFAULT_CONFIG,
      logs: [],
    };
  }
}

export async function writeMarketingStorage(data: MarketingStorage): Promise<void> {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(FILE_PATH, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.error("[marketing/store] failed to write storage:", err);
  }
}

export async function getMarketingConfig(): Promise<MarketingConfig> {
  const data = await readMarketingStorage();
  return data.config;
}

export async function updateMarketingConfig(patch: Partial<MarketingConfig>): Promise<MarketingConfig> {
  const data = await readMarketingStorage();
  data.config = { ...data.config, ...patch };
  await writeMarketingStorage(data);
  return data.config;
}

export async function getMarketingLogs(limit = 100): Promise<MarketingLogItem[]> {
  const data = await readMarketingStorage();
  return data.logs.slice(-limit).reverse();
}

export async function recordMarketingLog(item: MarketingLogItem): Promise<void> {
  const data = await readMarketingStorage();
  // Keep up to 2000 recent logs
  data.logs.push(item);
  if (data.logs.length > 2000) {
    data.logs = data.logs.slice(-2000);
  }
  await writeMarketingStorage(data);
}

export async function getTodaySentCount(source?: "divar" | "sheypoor"): Promise<number> {
  const data = await readMarketingStorage();
  const todayStr = new Date().toISOString().split("T")[0];
  return data.logs.filter((l) => {
    if (l.status !== "sent") return false;
    if (source && l.source !== source) return false;
    return l.sentAt.startsWith(todayStr);
  }).length;
}

export async function isAlreadyMessaged(postToken: string): Promise<boolean> {
  const data = await readMarketingStorage();
  return data.logs.some((l) => l.postToken === postToken && l.status === "sent");
}
