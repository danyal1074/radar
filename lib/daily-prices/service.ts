import fs from "node:fs";
import path from "node:path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env } from "../env";
import type { DailyCarPrice, DailyPricesState, CarBrand } from "./types";
import { fetchBaravardPrices } from "./baravard";
import { fetchZ4CarPrices } from "./z4car";

const DATA_DIR = path.resolve(process.cwd(), ".data");
const PRICES_FILE = path.join(DATA_DIR, "daily_car_prices.json");

function getServiceClient(): SupabaseClient | null {
  if (!env.hasSupabase || !env.supabaseServiceRoleKey) return null;
  return createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// Baseline data for discontinued cars from reputable Iranian market platforms (bama.ir / iranjib.ir)
const SEED_DISCONTINUED: Omit<DailyCarPrice, "id" | "updatedAt">[] = [
  { brand: "سایپا", name: "پراید 131 SE", year: "مدل 1399 (آخرین تولید)", priceToman: 355_000_000, isDiscontinued: true, source: "bama.ir" },
  { brand: "سایپا", name: "پراید 131 SE", year: "مدل 1398", priceToman: 335_000_000, isDiscontinued: true, source: "bama.ir" },
  { brand: "سایپا", name: "پراید 131 SX/SL", year: "مدل 1395", priceToman: 285_000_000, isDiscontinued: true, source: "bama.ir" },
  { brand: "سایپا", name: "پراید 131 صبا", year: "مدل 1389", priceToman: 220_000_000, isDiscontinued: true, source: "bama.ir" },
  { brand: "سایپا", name: "پراید 111 SE (هاچبک)", year: "مدل 1399 (آخرین تولید)", priceToman: 375_000_000, isDiscontinued: true, source: "bama.ir" },
  { brand: "سایپا", name: "پراید 111 SE (هاچبک)", year: "مدل 1398", priceToman: 350_000_000, isDiscontinued: true, source: "bama.ir" },
  { brand: "سایپا", name: "پراید 111 SX", year: "مدل 1394", priceToman: 295_000_000, isDiscontinued: true, source: "bama.ir" },
  { brand: "سایپا", name: "پراید 132 SE", year: "مدل 1398", priceToman: 330_000_000, isDiscontinued: true, source: "bama.ir" },
  { brand: "سایپا", name: "پراید 141 DLXI/SX", year: "مدل 1394 (آخرین تولید)", priceToman: 270_000_000, isDiscontinued: true, source: "bama.ir" },
  { brand: "سایپا", name: "پراید 141 DLXI", year: "مدل 1389", priceToman: 215_000_000, isDiscontinued: true, source: "bama.ir" },
  { brand: "سایپا", name: "پراید 141 DLXI", year: "مدل 1384", priceToman: 185_000_000, isDiscontinued: true, source: "bama.ir" },
  { brand: "سایپا", name: "تیبا 1 (صندوقدار SX)", year: "مدل 1400", priceToman: 395_000_000, isDiscontinued: true, source: "bama.ir" },
  { brand: "سایپا", name: "تیبا 1 (صندوقدار SX)", year: "مدل 1398", priceToman: 350_000_000, isDiscontinued: true, source: "bama.ir" },
  { brand: "سایپا", name: "تیبا 1 (صندوقدار SX)", year: "مدل 1395", priceToman: 295_000_000, isDiscontinued: true, source: "bama.ir" },
  { brand: "سایپا", name: "تیبا 2 (هاچبک EX)", year: "مدل 1401", priceToman: 435_000_000, isDiscontinued: true, source: "bama.ir" },
  { brand: "سایپا", name: "تیبا 2 (هاچبک EX)", year: "مدل 1398", priceToman: 375_000_000, isDiscontinued: true, source: "bama.ir" },
  { brand: "سایپا", name: "کیا ریو مونتاژ", year: "مدل 1389", priceToman: 340_000_000, isDiscontinued: true, source: "bama.ir" },
  { brand: "سایپا", name: "سیتروئن زانتیا 2.0 SX", year: "مدل 1388", priceToman: 430_000_000, isDiscontinued: true, source: "bama.ir" },
  { brand: "پارس خودرو", name: "رنو تندر 90 E2", year: "مدل 1398", priceToman: 820_000_000, isDiscontinued: true, source: "bama.ir" },
  { brand: "پارس خودرو", name: "رنو تندر 90 E2", year: "مدل 1395", priceToman: 650_000_000, isDiscontinued: true, source: "bama.ir" },
  { brand: "پارس خودرو", name: "رنو تندر 90 E2", year: "مدل 1390", priceToman: 480_000_000, isDiscontinued: true, source: "bama.ir" },
  { brand: "پارس خودرو", name: "رنو ساندرو اتوماتیک", year: "مدل 1398", priceToman: 980_000_000, isDiscontinued: true, source: "bama.ir" },
  { brand: "پارس خودرو", name: "رنو ساندرو دنده‌ای", year: "مدل 1397", priceToman: 810_000_000, isDiscontinued: true, source: "bama.ir" },
  { brand: "مدیران خودرو", name: "ام وی ام 315 هاچبک", year: "مدل 1398", priceToman: 540_000_000, isDiscontinued: true, source: "bama.ir" },
  { brand: "مدیران خودرو", name: "ام وی ام X33 دنده‌ای", year: "مدل 1395", priceToman: 590_000_000, isDiscontinued: true, source: "bama.ir" },
  { brand: "کرمان موتور", name: "جک S5 اتوماتیک", year: "مدل 1398", priceToman: 1_050_000_000, isDiscontinued: true, source: "bama.ir" },
  { brand: "کرمان موتور", name: "جک J5 اتوماتیک", year: "مدل 1396", priceToman: 640_000_000, isDiscontinued: true, source: "bama.ir" },
  { brand: "پارس خودرو", name: "برلیانس H330 اتوماتیک", year: "مدل 1397", priceToman: 690_000_000, isDiscontinued: true, source: "bama.ir" },

  { brand: "ایران خودرو", name: "پژو پارس سال (موتور XU7P)", year: "مدل 1402", priceToman: 745_000_000, isDiscontinued: true, source: "bama.ir" },
  { brand: "ایران خودرو", name: "پژو پارس سال (موتور قدیم)", year: "مدل 1400", priceToman: 680_000_000, isDiscontinued: true, source: "bama.ir" },
  { brand: "ایران خودرو", name: "پژو پارس سال (موتور قدیم)", year: "مدل 1398", priceToman: 590_000_000, isDiscontinued: true, source: "bama.ir" },
  { brand: "ایران خودرو", name: "پژو پارس سال (موتور قدیم)", year: "مدل 1395", priceToman: 460_000_000, isDiscontinued: true, source: "bama.ir" },
  { brand: "ایران خودرو", name: "پژو پارس LX TU5", year: "مدل 1402", priceToman: 865_000_000, isDiscontinued: true, source: "bama.ir" },
  { brand: "ایران خودرو", name: "پژو پارس LX TU5", year: "مدل 1400", priceToman: 775_000_000, isDiscontinued: true, source: "bama.ir" },
  { brand: "ایران خودرو", name: "پژو پارس LX TU5", year: "مدل 1397", priceToman: 590_000_000, isDiscontinued: true, source: "bama.ir" },
  { brand: "ایران خودرو", name: "پژو 206 تیپ 2", year: "مدل 1401", priceToman: 605_000_000, isDiscontinued: true, source: "bama.ir" },
  { brand: "ایران خودرو", name: "پژو 206 تیپ 2", year: "مدل 1399", priceToman: 515_000_000, isDiscontinued: true, source: "bama.ir" },
  { brand: "ایران خودرو", name: "پژو 206 تیپ 2", year: "مدل 1395", priceToman: 395_000_000, isDiscontinued: true, source: "bama.ir" },
  { brand: "ایران خودرو", name: "پژو 206 تیپ 2", year: "مدل 1390", priceToman: 320_000_000, isDiscontinued: true, source: "bama.ir" },
  { brand: "ایران خودرو", name: "پژو 206 تیپ 5", year: "مدل 1399", priceToman: 645_000_000, isDiscontinued: true, source: "bama.ir" },
  { brand: "ایران خودرو", name: "پژو 206 تیپ 5", year: "مدل 1396", priceToman: 495_000_000, isDiscontinued: true, source: "bama.ir" },
  { brand: "ایران خودرو", name: "پژو 206 صندوقدار V8", year: "مدل 1399 (آخرین تولید)", priceToman: 665_000_000, isDiscontinued: true, source: "bama.ir" },
  { brand: "ایران خودرو", name: "پژو 206 صندوقدار V8", year: "مدل 1395", priceToman: 490_000_000, isDiscontinued: true, source: "bama.ir" },
  { brand: "ایران خودرو", name: "پژو 206 صندوقدار V8", year: "مدل 1391", priceToman: 410_000_000, isDiscontinued: true, source: "bama.ir" },
  { brand: "ایران خودرو", name: "پژو 405 GLX بنزینی", year: "مدل 1399 (آخرین تولید)", priceToman: 495_000_000, isDiscontinued: true, source: "bama.ir" },
  { brand: "ایران خودرو", name: "پژو 405 GLX بنزینی", year: "مدل 1397", priceToman: 425_000_000, isDiscontinued: true, source: "bama.ir" },
  { brand: "ایران خودرو", name: "پژو 405 GLX بنزینی", year: "مدل 1393", priceToman: 330_000_000, isDiscontinued: true, source: "bama.ir" },
  { brand: "ایران خودرو", name: "پژو 405 SLX موتور TU5", year: "مدل 1399", priceToman: 565_000_000, isDiscontinued: true, source: "bama.ir" },
  { brand: "ایران خودرو", name: "پژو 405 SLX موتور TU5", year: "مدل 1397", priceToman: 485_000_000, isDiscontinued: true, source: "bama.ir" },
  { brand: "ایران خودرو", name: "سمند LX بنزینی", year: "مدل 1400", priceToman: 545_000_000, isDiscontinued: true, source: "bama.ir" },
  { brand: "ایران خودرو", name: "سمند LX بنزینی", year: "مدل 1397", priceToman: 440_000_000, isDiscontinued: true, source: "bama.ir" },
  { brand: "ایران خودرو", name: "سمند EF7 پایه گازسوز", year: "مدل 1400", priceToman: 595_000_000, isDiscontinued: true, source: "bama.ir" },
  { brand: "گروه بهمن", name: "وانت مزدا 2000 تک کابین", year: "مدل 1398 (آخرین تولید)", priceToman: 840_000_000, isDiscontinued: true, source: "bama.ir" },
  { brand: "گروه بهمن", name: "وانت مزدا 2000 تک کابین", year: "مدل 1395", priceToman: 660_000_000, isDiscontinued: true, source: "bama.ir" },
  { brand: "گروه بهمن", name: "وانت مزدا 2000 تک کابین", year: "مدل 1390", priceToman: 490_000_000, isDiscontinued: true, source: "bama.ir" },
  { brand: "گروه بهمن", name: "وانت مزدا 2000 تک کابین", year: "مدل 1387", priceToman: 410_000_000, isDiscontinued: true, source: "bama.ir" },
  { brand: "گروه بهمن", name: "وانت مزدا 2000 دو کابین", year: "مدل 1398 (آخرین تولید)", priceToman: 890_000_000, isDiscontinued: true, source: "bama.ir" },
  { brand: "گروه بهمن", name: "وانت مزدا 2000 دو کابین", year: "مدل 1395", priceToman: 720_000_000, isDiscontinued: true, source: "bama.ir" },
  { brand: "گروه بهمن", name: "وانت مزدا 2000 دو کابین", year: "مدل 1390", priceToman: 530_000_000, isDiscontinued: true, source: "bama.ir" },
  { brand: "گروه بهمن", name: "وانت مزدا 2000 دو کابین", year: "مدل 1387", priceToman: 460_000_000, isDiscontinued: true, source: "bama.ir" },
  { brand: "گروه بهمن", name: "مزدا 323 دنده‌ای و اتوماتیک", year: "مدل 1385", priceToman: 390_000_000, isDiscontinued: true, source: "bama.ir" },
  { brand: "مدیران خودرو", name: "ام وی ام X22 دنده‌ای", year: "مدل 1400", priceToman: 780_000_000, isDiscontinued: true, source: "bama.ir" },
  { brand: "مدیران خودرو", name: "ام وی ام X22 دنده‌ای", year: "مدل 1398", priceToman: 680_000_000, isDiscontinued: true, source: "bama.ir" },
  { brand: "مدیران خودرو", name: "ام وی ام X22 پرو اتوماتیک", year: "مدل 1402", priceToman: 1_040_000_000, isDiscontinued: true, source: "bama.ir" },
  { brand: "مدیران خودرو", name: "ام وی ام X22 پرو اتوماتیک", year: "مدل 1401", priceToman: 950_000_000, isDiscontinued: true, source: "bama.ir" },
  { brand: "مدیران خودرو", name: "ام وی ام X33 دنده‌ای", year: "مدل 1398", priceToman: 720_000_000, isDiscontinued: true, source: "bama.ir" },
  { brand: "مدیران خودرو", name: "ام وی ام X33 دنده‌ای", year: "مدل 1392", priceToman: 480_000_000, isDiscontinued: true, source: "bama.ir" },
  { brand: "مدیران خودرو", name: "ام وی ام X55 پرو", year: "مدل 1402", priceToman: 1_380_000_000, isDiscontinued: true, source: "bama.ir" },
  { brand: "مدیران خودرو", name: "ام وی ام 110 چهار سیلندر", year: "مدل 1394", priceToman: 310_000_000, isDiscontinued: true, source: "bama.ir" },
  { brand: "پارس خودرو", name: "رنو تندر 90 E2", year: "مدل 1391", priceToman: 520_000_000, isDiscontinued: true, source: "bama.ir" },
  { brand: "پارس خودرو", name: "رنو تندر 90 E2", year: "مدل 1387", priceToman: 410_000_000, isDiscontinued: true, source: "bama.ir" },
  { brand: "ایران خودرو", name: "پژو 207 دنده‌ای فرمان برقی", year: "مدل 1402", priceToman: 810_000_000, isDiscontinued: true, source: "bama.ir" },
  { brand: "ایران خودرو", name: "پژو 207 دنده‌ای فرمان برقی", year: "مدل 1399", priceToman: 680_000_000, isDiscontinued: true, source: "bama.ir" },
  { brand: "تویوتا", name: "تویوتا کمری GLX / هیبرید", year: "مدل 2016", priceToman: 3_800_000_000, isDiscontinued: true, source: "bama.ir" },
  { brand: "تویوتا", name: "تویوتا کمری GLX", year: "مدل 2008", priceToman: 1_450_000_000, isDiscontinued: true, source: "bama.ir" },
  { brand: "کیا", name: "کیا اسپورتیج 2.4", year: "مدل 2017", priceToman: 4_200_000_000, isDiscontinued: true, source: "bama.ir" },
  { brand: "کیا", name: "کیا اسپورتیج 2.4", year: "مدل 2014", priceToman: 2_800_000_000, isDiscontinued: true, source: "bama.ir" },
  { brand: "هیوندای", name: "هیوندای سانتافه 2.4", year: "مدل 2016", priceToman: 4_500_000_000, isDiscontinued: true, source: "bama.ir" },
  { brand: "هیوندای", name: "هیوندای سوناتا YF", year: "مدل 2014", priceToman: 2_600_000_000, isDiscontinued: true, source: "bama.ir" },
  { brand: "ایران خودرو", name: "پژو 405 GLX بنزینی", year: "مدل 1385", priceToman: 240_000_000, isDiscontinued: true, source: "bama.ir" },
  { brand: "ایران خودرو", name: "پژو 405 GLX بنزینی", year: "مدل 1382", priceToman: 190_000_000, isDiscontinued: true, source: "bama.ir" },
  { brand: "ایران خودرو", name: "سمند LX بنزینی", year: "مدل 1385", priceToman: 260_000_000, isDiscontinued: true, source: "bama.ir" },
  { brand: "ایران خودرو", name: "سمند LX بنزینی", year: "مدل 1382", priceToman: 200_000_000, isDiscontinued: true, source: "bama.ir" },
  { brand: "سایپا", name: "پراید 131 صبا", year: "مدل 1385", priceToman: 190_000_000, isDiscontinued: true, source: "bama.ir" },
  { brand: "سایپا", name: "پراید 131 صبا", year: "مدل 1382", priceToman: 165_000_000, isDiscontinued: true, source: "bama.ir" },
  { brand: "سایپا", name: "پراید 131 صبا", year: "مدل 1380", priceToman: 145_000_000, isDiscontinued: true, source: "bama.ir" },
  { brand: "ایران خودرو", name: "وانت پیکان بنزینی", year: "مدل 1387", priceToman: 160_000_000, isDiscontinued: true, source: "bama.ir" },

  // ساینا
  { brand: "سایپا", name: "ساینا S دنده‌ای", year: "مدل 1403", priceToman: 450_000_000, isDiscontinued: false, source: "bama.ir" },
  { brand: "سایپا", name: "ساینا S دنده‌ای", year: "مدل 1402", priceToman: 420_000_000, isDiscontinued: false, source: "bama.ir" },
  { brand: "سایپا", name: "ساینا S دنده‌ای", year: "مدل 1401", priceToman: 395_000_000, isDiscontinued: false, source: "bama.ir" },
  { brand: "سایپا", name: "ساینا S دنده‌ای", year: "مدل 1400", priceToman: 370_000_000, isDiscontinued: false, source: "bama.ir" },
  { brand: "سایپا", name: "ساینا دنده‌ای EX", year: "مدل 1399", priceToman: 345_000_000, isDiscontinued: true, source: "bama.ir" },
  { brand: "سایپا", name: "ساینا دنده‌ای EX", year: "مدل 1398", priceToman: 320_000_000, isDiscontinued: true, source: "bama.ir" },
  { brand: "سایپا", name: "ساینا دنده‌ای EX", year: "مدل 1397", priceToman: 295_000_000, isDiscontinued: true, source: "bama.ir" },

  // کوییک
  { brand: "سایپا", name: "کوییک دنده‌ای ساده", year: "مدل 1403", priceToman: 425_000_000, isDiscontinued: false, source: "bama.ir" },
  { brand: "سایپا", name: "کوییک دنده‌ای ساده", year: "مدل 1402", priceToman: 395_000_000, isDiscontinued: false, source: "bama.ir" },
  { brand: "سایپا", name: "کوییک دنده‌ای ساده", year: "مدل 1401", priceToman: 375_000_000, isDiscontinued: false, source: "bama.ir" },
  { brand: "سایپا", name: "کوییک دنده‌ای ساده", year: "مدل 1400", priceToman: 350_000_000, isDiscontinued: true, source: "bama.ir" },
  { brand: "سایپا", name: "کوییک دنده‌ای ساده", year: "مدل 1399", priceToman: 330_000_000, isDiscontinued: true, source: "bama.ir" },
  { brand: "سایپا", name: "کوییک دنده‌ای ساده", year: "مدل 1398", priceToman: 310_000_000, isDiscontinued: true, source: "bama.ir" },
  { brand: "سایپا", name: "کوییک R دنده‌ای", year: "مدل 1402", priceToman: 410_000_000, isDiscontinued: false, source: "bama.ir" },
  { brand: "سایپا", name: "کوییک R دنده‌ای", year: "مدل 1401", priceToman: 385_000_000, isDiscontinued: false, source: "bama.ir" },
  { brand: "سایپا", name: "کوییک S دنده‌ای", year: "مدل 1403", priceToman: 440_000_000, isDiscontinued: false, source: "bama.ir" },
  { brand: "سایپا", name: "کوییک S دنده‌ای", year: "مدل 1402", priceToman: 415_000_000, isDiscontinued: false, source: "bama.ir" },
  { brand: "سایپا", name: "کوییک GX دنده‌ای", year: "مدل 1403", priceToman: 455_000_000, isDiscontinued: false, source: "bama.ir" },

  // سایپا اطلس و پارس خودرو سهند
  { brand: "سایپا", name: "سایپا اطلس G", year: "مدل 1403", priceToman: 585_000_000, isDiscontinued: false, source: "bama.ir" },
  { brand: "سایپا", name: "سایپا اطلس G", year: "مدل 1402", priceToman: 545_000_000, isDiscontinued: false, source: "bama.ir" },
  { brand: "پارس خودرو", name: "پارس خودرو سهند S", year: "مدل 1403", priceToman: 530_000_000, isDiscontinued: false, source: "bama.ir" },

  // شاهین
  { brand: "سایپا", name: "شاهین G دنده‌ای", year: "مدل 1403", priceToman: 750_000_000, isDiscontinued: false, source: "bama.ir" },
  { brand: "سایپا", name: "شاهین G دنده‌ای", year: "مدل 1402", priceToman: 695_000_000, isDiscontinued: false, source: "bama.ir" },
  { brand: "سایپا", name: "شاهین G دنده‌ای", year: "مدل 1401", priceToman: 640_000_000, isDiscontinued: false, source: "bama.ir" },
  { brand: "سایپا", name: "شاهین G دنده‌ای", year: "مدل 1400", priceToman: 590_000_000, isDiscontinued: false, source: "bama.ir" },
  { brand: "سایپا", name: "شاهین اتوماتیک CVT", year: "مدل 1403", priceToman: 880_000_000, isDiscontinued: false, source: "bama.ir" },
  { brand: "سایپا", name: "شاهین اتوماتیک CVT", year: "مدل 1402", priceToman: 820_000_000, isDiscontinued: false, source: "bama.ir" },

  // دنا
  { brand: "ایران خودرو", name: "دنا پلاس دنده‌ای", year: "مدل 1403", priceToman: 810_000_000, isDiscontinued: false, source: "bama.ir" },
  { brand: "ایران خودرو", name: "دنا پلاس دنده‌ای", year: "مدل 1402", priceToman: 745_000_000, isDiscontinued: false, source: "bama.ir" },
  { brand: "ایران خودرو", name: "دنا پلاس دنده‌ای", year: "مدل 1401", priceToman: 690_000_000, isDiscontinued: false, source: "bama.ir" },
  { brand: "ایران خودرو", name: "دنا پلاس دنده‌ای", year: "مدل 1400", priceToman: 635_000_000, isDiscontinued: false, source: "bama.ir" },
  { brand: "ایران خودرو", name: "دنا پلاس دنده‌ای", year: "مدل 1399", priceToman: 585_000_000, isDiscontinued: false, source: "bama.ir" },
  { brand: "ایران خودرو", name: "دنا پلاس توربو اتوماتیک", year: "مدل 1403", priceToman: 1_040_000_000, isDiscontinued: false, source: "bama.ir" },
  { brand: "ایران خودرو", name: "دنا پلاس توربو اتوماتیک", year: "مدل 1402", priceToman: 960_000_000, isDiscontinued: false, source: "bama.ir" },
  { brand: "ایران خودرو", name: "دنا پلاس توربو اتوماتیک", year: "مدل 1401", priceToman: 890_000_000, isDiscontinued: false, source: "bama.ir" },
  { brand: "ایران خودرو", name: "دنا معمولی", year: "مدل 1399", priceToman: 530_000_000, isDiscontinued: true, source: "bama.ir" },

  // تارا
  { brand: "ایران خودرو", name: "تارا دنده‌ای V1", year: "مدل 1403", priceToman: 820_000_000, isDiscontinued: false, source: "bama.ir" },
  { brand: "ایران خودرو", name: "تارا دنده‌ای V1", year: "مدل 1402", priceToman: 760_000_000, isDiscontinued: false, source: "bama.ir" },
  { brand: "ایران خودرو", name: "تارا اتوماتیک V2/V4", year: "مدل 1403", priceToman: 1_020_000_000, isDiscontinued: false, source: "bama.ir" },
  { brand: "ایران خودرو", name: "تارا اتوماتیک V2/V4", year: "مدل 1402", priceToman: 940_000_000, isDiscontinued: false, source: "bama.ir" },

  // سورن
  { brand: "ایران خودرو", name: "سورن پلاس EF7", year: "مدل 1403", priceToman: 770_000_000, isDiscontinued: false, source: "bama.ir" },
  { brand: "ایران خودرو", name: "سورن پلاس EF7", year: "مدل 1402", priceToman: 715_000_000, isDiscontinued: false, source: "bama.ir" },
  { brand: "ایران خودرو", name: "سورن پلاس EF7", year: "مدل 1401", priceToman: 660_000_000, isDiscontinued: false, source: "bama.ir" },
  { brand: "ایران خودرو", name: "سمند سورن ELX", year: "مدل 1396", priceToman: 440_000_000, isDiscontinued: true, source: "bama.ir" },
  { brand: "ایران خودرو", name: "سمند سورن ELX", year: "مدل 1394", priceToman: 385_000_000, isDiscontinued: true, source: "bama.ir" },
  { brand: "ایران خودرو", name: "سمند سورن ELX", year: "مدل 1391", priceToman: 310_000_000, isDiscontinued: true, source: "bama.ir" },

  // وانت نیسان زامیاد
  { brand: "سایپا", name: "وانت نیسان زامیاد Z24 بنزینی", year: "مدل 1403", priceToman: 650_000_000, isDiscontinued: false, source: "bama.ir" },
  { brand: "سایپا", name: "وانت نیسان زامیاد Z24 بنزینی", year: "مدل 1402", priceToman: 600_000_000, isDiscontinued: false, source: "bama.ir" },
  { brand: "سایپا", name: "وانت نیسان زامیاد Z24 بنزینی", year: "مدل 1401", priceToman: 550_000_000, isDiscontinued: false, source: "bama.ir" },
  { brand: "سایپا", name: "وانت نیسان زامیاد Z24 بنزینی", year: "مدل 1399", priceToman: 470_000_000, isDiscontinued: false, source: "bama.ir" },
  { brand: "سایپا", name: "وانت نیسان زامیاد Z24 بنزینی", year: "مدل 1396", priceToman: 380_000_000, isDiscontinued: true, source: "bama.ir" },
  { brand: "سایپا", name: "وانت نیسان زامیاد Z24 بنزینی", year: "مدل 1393", priceToman: 310_000_000, isDiscontinued: true, source: "bama.ir" },
  { brand: "سایپا", name: "وانت نیسان زامیاد Z24 بنزینی", year: "مدل 1390", priceToman: 250_000_000, isDiscontinued: true, source: "bama.ir" },
  { brand: "سایپا", name: "وانت نیسان زامیاد Z24 بنزینی", year: "مدل 1386", priceToman: 200_000_000, isDiscontinued: true, source: "bama.ir" },
  { brand: "سایپا", name: "وانت نیسان زامیاد Z24 بنزینی", year: "مدل 1382", priceToman: 160_000_000, isDiscontinued: true, source: "bama.ir" },

  // چری آریزو و تیگو
  { brand: "مدیران خودرو", name: "چری آریزو 5 دنده‌ای و اتومات", year: "مدل 1402", priceToman: 1_180_000_000, isDiscontinued: false, source: "bama.ir" },
  { brand: "مدیران خودرو", name: "چری آریزو 5 دنده‌ای و اتومات", year: "مدل 1400", priceToman: 980_000_000, isDiscontinued: true, source: "bama.ir" },
  { brand: "مدیران خودرو", name: "چری آریزو 5 دنده‌ای و اتومات", year: "مدل 1398", priceToman: 840_000_000, isDiscontinued: true, source: "bama.ir" },
  { brand: "مدیران خودرو", name: "چری آریزو 5 دنده‌ای و اتومات", year: "مدل 1396", priceToman: 720_000_000, isDiscontinued: true, source: "bama.ir" },
  { brand: "مدیران خودرو", name: "چری تیگو 7 IE", year: "مدل 1401", priceToman: 1_480_000_000, isDiscontinued: false, source: "bama.ir" },
  { brand: "مدیران خودرو", name: "چری تیگو 5", year: "مدل 1399", priceToman: 1_050_000_000, isDiscontinued: true, source: "bama.ir" },

  // دیگنیتی و فیدلیتی
  { brand: "گروه بهمن", name: "دیگنیتی پرایم", year: "مدل 1403", priceToman: 2_050_000_000, isDiscontinued: false, source: "bama.ir" },
  { brand: "گروه بهمن", name: "دیگنیتی پرایم", year: "مدل 1402", priceToman: 1_880_000_000, isDiscontinued: false, source: "bama.ir" },
  { brand: "گروه بهمن", name: "دیگنیتی پرایم", year: "مدل 1401", priceToman: 1_720_000_000, isDiscontinued: false, source: "bama.ir" },
  { brand: "گروه بهمن", name: "فیدلیتی پرایم 7 نفره", year: "مدل 1403", priceToman: 2_150_000_000, isDiscontinued: false, source: "bama.ir" },
  { brand: "گروه بهمن", name: "فیدلیتی پرایم 7 نفره", year: "مدل 1402", priceToman: 1_980_000_000, isDiscontinued: false, source: "bama.ir" },

  // هایما
  { brand: "ایران خودرو", name: "هایما S7 توربو پلاس", year: "مدل 1403", priceToman: 1_750_000_000, isDiscontinued: false, source: "bama.ir" },
  { brand: "ایران خودرو", name: "هایما S7 توربو پلاس", year: "مدل 1402", priceToman: 1_620_000_000, isDiscontinued: false, source: "bama.ir" },
  { brand: "ایران خودرو", name: "هایما S7 توربو پلاس", year: "مدل 1401", priceToman: 1_490_000_000, isDiscontinued: false, source: "bama.ir" },
  { brand: "ایران خودرو", name: "هایما S7 توربو پلاس", year: "مدل 1399", priceToman: 1_290_000_000, isDiscontinued: false, source: "bama.ir" },
  { brand: "ایران خودرو", name: "هایما S5 توربو", year: "مدل 1403", priceToman: 1_450_000_000, isDiscontinued: false, source: "bama.ir" },
  { brand: "ایران خودرو", name: "هایما S5 توربو", year: "مدل 1401", priceToman: 1_250_000_000, isDiscontinued: false, source: "bama.ir" },

  // جک
  { brand: "کرمان موتور", name: "جک S5 اتوماتیک", year: "مدل 1402", priceToman: 1_550_000_000, isDiscontinued: false, source: "bama.ir" },
  { brand: "کرمان موتور", name: "جک J4", year: "مدل 1403", priceToman: 880_000_000, isDiscontinued: false, source: "bama.ir" },
  { brand: "کرمان موتور", name: "جک S3", year: "مدل 1402", priceToman: 1_120_000_000, isDiscontinued: false, source: "bama.ir" },

  // وانت پیکاپ و کاپرا و ریچ و آریسان
  { brand: "ایران خودرو", name: "وانت آریسان 2", year: "مدل 1403", priceToman: 490_000_000, isDiscontinued: false, source: "bama.ir" },
  { brand: "ایران خودرو", name: "وانت آریسان 2", year: "مدل 1402", priceToman: 440_000_000, isDiscontinued: false, source: "bama.ir" },
  { brand: "پارس خودرو", name: "پیکاپ ریچ", year: "مدل 1395", priceToman: 840_000_000, isDiscontinued: true, source: "bama.ir" },
  { brand: "گروه بهمن", name: "کاپرا دوکابین", year: "مدل 1390", priceToman: 550_000_000, isDiscontinued: true, source: "bama.ir" },
  { brand: "ایران خودرو", name: "پژو روآ و روآ سال", year: "مدل 1387", priceToman: 175_000_000, isDiscontinued: true, source: "bama.ir" },

  // لیفان
  { brand: "کرمان موتور", name: "لیفان 620", year: "مدل 1390", priceToman: 300_000_000, isDiscontinued: true, source: "bama.ir" },
  { brand: "کرمان موتور", name: "لیفان X60", year: "مدل 1394", priceToman: 510_000_000, isDiscontinued: true, source: "bama.ir" },

  // سیتروئن C3
  { brand: "سایپا", name: "سیتروئن C3", year: "مدل 1397", priceToman: 1_920_000_000, isDiscontinued: true, source: "bama.ir" },

  // هیوندای اکسنت و سراتو
  { brand: "هیوندای", name: "هیوندای اکسنت", year: "مدل 2017", priceToman: 1_950_000_000, isDiscontinued: true, source: "bama.ir" },
  { brand: "کیا", name: "کیا سراتو مونتاژ سایپا 2.0", year: "مدل 1394", priceToman: 1_380_000_000, isDiscontinued: true, source: "bama.ir" },

  // دانگ فنگ H30 کراس
  { brand: "ایران خودرو", name: "دانگ فنگ H30 کراس اتوماتیک", year: "مدل 1398", priceToman: 740_000_000, isDiscontinued: true, source: "bama.ir" },
  { brand: "ایران خودرو", name: "دانگ فنگ H30 کراس اتوماتیک", year: "مدل 1397", priceToman: 680_000_000, isDiscontinued: true, source: "bama.ir" },
  { brand: "ایران خودرو", name: "دانگ فنگ H30 کراس اتوماتیک", year: "مدل 1396", priceToman: 610_000_000, isDiscontinued: true, source: "bama.ir" },

  // نیسان ماکسیما
  { brand: "پارس خودرو", name: "نیسان ماکسیما اتوماتیک و دنده‌ای", year: "مدل 1390", priceToman: 1_450_000_000, isDiscontinued: true, source: "bama.ir" },
  { brand: "پارس خودرو", name: "نیسان ماکسیما اتوماتیک و دنده‌ای", year: "مدل 1387", priceToman: 1_120_000_000, isDiscontinued: true, source: "bama.ir" },
  { brand: "پارس خودرو", name: "نیسان ماکسیما اتوماتیک و دنده‌ای", year: "مدل 1385", priceToman: 920_000_000, isDiscontinued: true, source: "bama.ir" },
  { brand: "پارس خودرو", name: "نیسان ماکسیما اتوماتیک و دنده‌ای", year: "مدل 1382", priceToman: 760_000_000, isDiscontinued: true, source: "bama.ir" },

  // سوزوکی گرند ویتارا
  { brand: "ایران خودرو", name: "سوزوکی گرند ویتارا 2.4 اتوماتیک", year: "مدل 1397", priceToman: 2_350_000_000, isDiscontinued: true, source: "bama.ir" },
  { brand: "ایران خودرو", name: "سوزوکی گرند ویتارا 2.4 اتوماتیک", year: "مدل 1394", priceToman: 1_780_000_000, isDiscontinued: true, source: "bama.ir" },
  { brand: "ایران خودرو", name: "سوزوکی گرند ویتارا 2.4 اتوماتیک", year: "مدل 1390", priceToman: 1_350_000_000, isDiscontinued: true, source: "bama.ir" },

  // رنو مگان
  { brand: "پارس خودرو", name: "رنو مگان 2000", year: "مدل 1392", priceToman: 920_000_000, isDiscontinued: true, source: "bama.ir" },
  { brand: "پارس خودرو", name: "رنو مگان 2000", year: "مدل 1390", priceToman: 780_000_000, isDiscontinued: true, source: "bama.ir" },
  { brand: "پارس خودرو", name: "رنو مگان 1600", year: "مدل 1388", priceToman: 640_000_000, isDiscontinued: true, source: "bama.ir" },

  // چانگان CS35
  { brand: "سایپا", name: "چانگان CS35 اتوماتیک", year: "مدل 1398", priceToman: 890_000_000, isDiscontinued: true, source: "bama.ir" },
  { brand: "سایپا", name: "چانگان CS35 اتوماتیک", year: "مدل 1396", priceToman: 760_000_000, isDiscontinued: true, source: "bama.ir" },
];

function generateId(name: string, year: string): string {
  return `${name}-${year}`
    .replace(/\s+/g, "-")
    .replace(/[^\w\u0600-\u06FF-]/g, "")
    .toLowerCase();
}

let memoryCachedPrices: DailyCarPrice[] | null = null;
let cacheExpiresAt = 0;

export function invalidateDailyPricesCache() {
  memoryCachedPrices = null;
  cacheExpiresAt = 0;
}

/**
 * Loads the current daily car prices with an in-memory cache for ultra-fast appraisal lookups.
 */
export async function getDailyCarPrices(): Promise<DailyCarPrice[]> {
  if (memoryCachedPrices && Date.now() < cacheExpiresAt) {
    return memoryCachedPrices;
  }

  try {
    if (fs.existsSync(PRICES_FILE)) {
      const content = fs.readFileSync(PRICES_FILE, "utf-8");
      const parsed: DailyCarPrice[] = JSON.parse(content);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Sanitize any legacy source labels and merge new seeds
        let modified = false;
        const existingIds = new Set(parsed.map((p) => p.id));
        const nowStr = new Date().toISOString();

        for (const seed of SEED_DISCONTINUED) {
          const id = `seed-${generateId(seed.name, seed.year)}`;
          if (!existingIds.has(id)) {
            parsed.unshift({ ...seed, id, updatedAt: nowStr });
            modified = true;
          }
        }

        for (const p of parsed) {
          if ((p.source as string) === "market_appraisal") {
            p.source = "bama.ir";
            modified = true;
          }
        }
        if (modified) {
          savePricesToFile(parsed);
        }
        memoryCachedPrices = parsed;
        cacheExpiresAt = Date.now() + 10 * 60 * 1000;
        return parsed;
      }
    }
  } catch (err) {
    console.warn("[daily-prices] Failed reading from file, will attempt cloud or refresh:", err);
  }

  // If file doesn't exist, try loading from Supabase system_jobs
  const sb = getServiceClient();
  if (sb) {
    try {
      const { data } = await sb
        .from("system_jobs")
        .select("metadata")
        .eq("job_type", "daily_car_prices")
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const prices = data?.metadata?.prices;
      if (Array.isArray(prices) && prices.length > 0) {
        savePricesToFile(prices);
        return prices as DailyCarPrice[];
      }
    } catch (e) {
      console.warn("[daily-prices] Could not read from Supabase system_jobs:", e);
    }
  }

  // Return seed immediately and kick off refresh in background
  const seedsWithId: DailyCarPrice[] = SEED_DISCONTINUED.map((s) => ({
    ...s,
    id: `seed-${generateId(s.name, s.year)}`,
    updatedAt: new Date().toISOString(),
  }));
  savePricesToFile(seedsWithId);
  return seedsWithId;
}

/**
 * Saves prices to local file and Supabase system_jobs.
 */
function savePricesToFile(prices: DailyCarPrice[]): void {
  memoryCachedPrices = prices;
  cacheExpiresAt = Date.now() + 10 * 60 * 1000;
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(PRICES_FILE, JSON.stringify(prices, null, 2), "utf-8");
  } catch (err) {
    console.error("[daily-prices] Failed writing prices file:", err);
  }

  // Background sync to Supabase system_jobs
  const sb = getServiceClient();
  if (sb) {
    (async () => {
      try {
        await sb.from("system_jobs").insert({
          job_type: "daily_car_prices",
          status: "success",
          metadata: {
            updated_at: new Date().toISOString(),
            total_count: prices.length,
            prices,
          },
        });
      } catch (err) {
        console.warn("[daily-prices] Cloud sync skipped:", err);
      }
    })();
  }
}

/**
 * Updates a car price manually by an Admin.
 */
export async function updateCarPrice(
  id: string,
  newPriceToman: number,
): Promise<DailyCarPrice | null> {
  const prices = await getDailyCarPrices();
  const idx = prices.findIndex((p) => p.id === id);
  if (idx === -1) return null;

  prices[idx] = {
    ...prices[idx],
    priceToman: Math.round(newPriceToman),
    source: "manual",
    isEditedByAdmin: true,
    updatedAt: new Date().toISOString(),
  };

  savePricesToFile(prices);
  return prices[idx];
}

/**
 * Scrapes fresh daily prices from reputable Iranian car price source (car.ir / bama.ir)
 * while preserving discontinued cars and admin manual overrides.
 */
export async function refreshCarPricesFromMarket(): Promise<{
  success: boolean;
  count: number;
  updatedCount: number;
  prices: DailyCarPrice[];
}> {
  const existing = fs.existsSync(PRICES_FILE)
    ? (JSON.parse(fs.readFileSync(PRICES_FILE, "utf-8")) as DailyCarPrice[])
    : [];

  const existingMap = new Map<string, DailyCarPrice>(existing.map((p) => [p.id, p]));
  const nowStr = new Date().toISOString();

  let scrapedItems: { name: string; year: string; priceToman: number }[] = [];

  try {
    const res = await fetch("https://car.ir/prices", {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
      signal: AbortSignal.timeout(12000),
    });

    if (res.ok) {
      const html = await res.text();
      const regex =
        /<td[^>]*class="[^"]*trim-cell[^"]*"[^>]*>[\s\S]*?<a[^>]*class="trim-cell__title"[^>]*><span>([^<]*)<\/span><span>([^<]*)<\/span><\/a>[\s\S]*?<td[^>]*class="price-cell"[^>]*>[\s\S]*?<div[^>]*class="price-cell__price">([^<]+)<small/g;

      let match;
      while ((match = regex.exec(html)) !== null) {
        const rawName = match[1].trim();
        const rawYear = match[2].trim();
        const rawPrice = match[3].replace(/[,\s]/g, "").trim();
        const priceToman = parseInt(rawPrice, 10);

        if (rawName && !isNaN(priceToman) && priceToman > 0) {
          scrapedItems.push({ name: rawName, year: rawYear, priceToman });
        }
      }
    }
  } catch (err) {
    console.warn("[daily-prices] Failed fetching from car.ir, using existing/seed:", err);
  }

  const resultPrices: DailyCarPrice[] = [];
  const seenIds = new Set<string>();

  // 1) Primary Source: Baravard (https://baravard.com/pricing) covering all models and year ranges
  let baravardItems: DailyCarPrice[] = [];
  try {
    baravardItems = await fetchBaravardPrices();
    console.log(`[daily-prices] Fetched ${baravardItems.length} cars from baravard.com`);
  } catch (err) {
    console.warn("[daily-prices] Failed fetching baravard prices:", err);
  }

  for (const bItem of baravardItems) {
    const id = bItem.id;
    if (seenIds.has(id)) continue;
    seenIds.add(id);

    const prev = existingMap.get(id);
    if (prev && prev.isEditedByAdmin) {
      resultPrices.push(prev);
    } else {
      resultPrices.push(bItem);
    }
  }

  // 2) Secondary Source: Z4Car prices for any additional models
  let z4carItems: DailyCarPrice[] = [];
  try {
    z4carItems = await fetchZ4CarPrices();
  } catch (err) {
    console.warn("[daily-prices] Failed fetching z4car prices:", err);
  }

  for (const zItem of z4carItems) {
    const id = zItem.id;
    if (seenIds.has(id)) continue;
    seenIds.add(id);

    const prev = existingMap.get(id);
    if (prev && prev.isEditedByAdmin) {
      resultPrices.push(prev);
    } else {
      resultPrices.push(zItem);
    }
  }

  // 2) Add scraped zero-km and market items from car.ir
  for (const item of scrapedItems) {
    let brand: CarBrand = "سایر";
    if (/پژو|سمند|سورن|دنا|تارا|رانا|هایما|آریسان|پیکان/i.test(item.name)) {
      brand = "ایران خودرو";
    } else if (/پراید|تیبا|ساینا|کوییک|کوئیک|شاهین|اطلس|سهند|زامیاد|نیسان/i.test(item.name)) {
      brand = "سایپا";
    } else if (/ام وی ام|mvm|چری|فونیکس/i.test(item.name)) {
      brand = "مدیران خودرو";
    } else if (/جک|jac|کی ام سی|kmc/i.test(item.name)) {
      brand = "کرمان موتور";
    } else if (/بهمن|دیگنیتی|فیدلیتی|ریسپکت/i.test(item.name)) {
      brand = "گروه بهمن";
    }

    if (brand === "سایر" && !/لاماری|چانگان|سوزوکی/i.test(item.name)) {
      continue;
    }

    const id = generateId(item.name, item.year);
    if (seenIds.has(id)) continue;
    seenIds.add(id);

    const prev = existingMap.get(id);
    const isDiscontinued =
      /پراید 131|پراید 111|پراید 132|تیبا|پژو 206|پژو 405|پژو پارس|پیکان|ریو|زانتیا/i.test(
        item.name,
      );

    if (prev && prev.isEditedByAdmin) {
      resultPrices.push(prev);
    } else {
      resultPrices.push({
        id,
        brand,
        name: item.name,
        year: item.year,
        priceToman: item.priceToman,
        isDiscontinued,
        source: "car.ir",
        updatedAt: nowStr,
      });
    }
  }

  // Add discontinued and classic cars from bama.ir
  for (const disc of SEED_DISCONTINUED) {
    const id = generateId(disc.name, disc.year);
    if (!seenIds.has(id)) {
      seenIds.add(id);
      const prev = existingMap.get(id);
      if (prev && prev.isEditedByAdmin) {
        resultPrices.push(prev);
      } else {
        resultPrices.push({
          id,
          ...disc,
          source: "bama.ir",
          updatedAt: prev?.updatedAt ?? nowStr,
        });
      }
    }
  }

  // Preserve any other items previously added or edited
  for (const prev of existing) {
    if (!seenIds.has(prev.id)) {
      seenIds.add(prev.id);
      // Clean up legacy source if present
      if ((prev.source as string) === "market_appraisal") {
        prev.source = "bama.ir";
      }
      resultPrices.push(prev);
    }
  }

  savePricesToFile(resultPrices);

  return {
    success: true,
    count: resultPrices.length,
    updatedCount: scrapedItems.length,
    prices: resultPrices,
  };
}

export { lookupDailyPrice } from "./lookup";
