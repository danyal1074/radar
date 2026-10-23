import fs from 'node:fs';
import { lookupDailyPrice } from '../lib/daily-prices/lookup.ts';

// Add the new benchmarks to test
const rawPrices = JSON.parse(fs.readFileSync('.data/daily_car_prices.json', 'utf-8'));

const extraCars = [
  // ساینا
  { brand: "سایپا", name: "ساینا S دنده‌ای", year: "مدل 1403", priceToman: 450_000_000, isDiscontinued: false },
  { brand: "سایپا", name: "ساینا S دنده‌ای", year: "مدل 1402", priceToman: 420_000_000, isDiscontinued: false },
  { brand: "سایپا", name: "ساینا S دنده‌ای", year: "مدل 1401", priceToman: 395_000_000, isDiscontinued: false },
  { brand: "سایپا", name: "ساینا دنده‌ای EX", year: "مدل 1399", priceToman: 345_000_000, isDiscontinued: true },
  { brand: "سایپا", name: "ساینا دنده‌ای EX", year: "مدل 1398", priceToman: 320_000_000, isDiscontinued: true },

  // کوییک
  { brand: "سایپا", name: "کوییک دنده‌ای ساده", year: "مدل 1403", priceToman: 425_000_000, isDiscontinued: false },
  { brand: "سایپا", name: "کوییک دنده‌ای ساده", year: "مدل 1402", priceToman: 395_000_000, isDiscontinued: false },
  { brand: "سایپا", name: "کوییک دنده‌ای ساده", year: "مدل 1400", priceToman: 350_000_000, isDiscontinued: true },
  { brand: "سایپا", name: "کوییک R دنده‌ای", year: "مدل 1402", priceToman: 410_000_000, isDiscontinued: false },
  { brand: "سایپا", name: "کوییک S دنده‌ای", year: "مدل 1403", priceToman: 440_000_000, isDiscontinued: false },
  { brand: "سایپا", name: "کوییک GX دنده‌ای", year: "مدل 1403", priceToman: 455_000_000, isDiscontinued: false },

  // اطلس و سهند
  { brand: "سایپا", name: "سایپا اطلس G", year: "مدل 1403", priceToman: 585_000_000, isDiscontinued: false },
  { brand: "سایپا", name: "سایپا اطلس G", year: "مدل 1402", priceToman: 545_000_000, isDiscontinued: false },
  { brand: "پارس خودرو", name: "پارس خودرو سهند S", year: "مدل 1403", priceToman: 530_000_000, isDiscontinued: false },

  // شاهین
  { brand: "سایپا", name: "شاهین G دنده‌ای", year: "مدل 1403", priceToman: 750_000_000, isDiscontinued: false },
  { brand: "سایپا", name: "شاهین G دنده‌ای", year: "مدل 1402", priceToman: 695_000_000, isDiscontinued: false },
  { brand: "سایپا", name: "شاهین G دنده‌ای", year: "مدل 1401", priceToman: 640_000_000, isDiscontinued: false },
  { brand: "سایپا", name: "شاهین اتوماتیک CVT", year: "مدل 1403", priceToman: 880_000_000, isDiscontinued: false },

  // دنا
  { brand: "ایران خودرو", name: "دنا پلاس دنده‌ای", year: "مدل 1403", priceToman: 810_000_000, isDiscontinued: false },
  { brand: "ایران خودرو", name: "دنا پلاس دنده‌ای", year: "مدل 1402", priceToman: 745_000_000, isDiscontinued: false },
  { brand: "ایران خودرو", name: "دنا پلاس توربو اتوماتیک", year: "مدل 1403", priceToman: 1_040_000_000, isDiscontinued: false },
  { brand: "ایران خودرو", name: "دنا پلاس توربو اتوماتیک", year: "مدل 1401", priceToman: 890_000_000, isDiscontinued: false },

  // تارا
  { brand: "ایران خودرو", name: "تارا دنده‌ای V1", year: "مدل 1403", priceToman: 820_000_000, isDiscontinued: false },
  { brand: "ایران خودرو", name: "تارا اتوماتیک V2/V4", year: "مدل 1403", priceToman: 1_020_000_000, isDiscontinued: false },

  // سورن
  { brand: "ایران خودرو", name: "سورن پلاس EF7", year: "مدل 1403", priceToman: 770_000_000, isDiscontinued: false },
  { brand: "ایران خودرو", name: "سورن پلاس EF7", year: "مدل 1401", priceToman: 660_000_000, isDiscontinued: false },
  { brand: "ایران خودرو", name: "سمند سورن ELX", year: "مدل 1391", priceToman: 310_000_000, isDiscontinued: true },

  // وانت نیسان
  { brand: "سایپا", name: "وانت نیسان زامیاد Z24 بنزینی", year: "مدل 1403", priceToman: 650_000_000, isDiscontinued: false },
  { brand: "سایپا", name: "وانت نیسان زامیاد Z24 بنزینی", year: "مدل 1402", priceToman: 600_000_000, isDiscontinued: false },
  { brand: "سایپا", name: "وانت نیسان زامیاد Z24 بنزینی", year: "مدل 1386", priceToman: 200_000_000, isDiscontinued: true },
  { brand: "سایپا", name: "وانت نیسان زامیاد Z24 بنزینی", year: "مدل 1382", priceToman: 160_000_000, isDiscontinued: true },

  // چری آریزو و تیگو
  { brand: "مدیران خودرو", name: "چری آریزو 5 دنده‌ای و اتومات", year: "مدل 1402", priceToman: 1_180_000_000, isDiscontinued: false },
  { brand: "مدیران خودرو", name: "چری آریزو 5 دنده‌ای و اتومات", year: "مدل 1400", priceToman: 980_000_000, isDiscontinued: true },
  { brand: "مدیران خودرو", name: "چری آریزو 5 دنده‌ای و اتومات", year: "مدل 1396", priceToman: 720_000_000, isDiscontinued: true },
  { brand: "مدیران خودرو", name: "چری تیگو 7 IE", year: "مدل 1401", priceToman: 1_480_000_000, isDiscontinued: false },

  // دیگنیتی و فیدلیتی
  { brand: "گروه بهمن", name: "دیگنیتی پرایم", year: "مدل 1403", priceToman: 2_050_000_000, isDiscontinued: false },
  { brand: "گروه بهمن", name: "دیگنیتی پرایم", year: "مدل 1401", priceToman: 1_720_000_000, isDiscontinued: false },
  { brand: "گروه بهمن", name: "فیدلیتی پرایم 7 نفره", year: "مدل 1403", priceToman: 2_150_000_000, isDiscontinued: false },

  // هایما
  { brand: "ایران خودرو", name: "هایما S7 توربو پلاس", year: "مدل 1403", priceToman: 1_750_000_000, isDiscontinued: false },
  { brand: "ایران خودرو", name: "هایما S5 توربو", year: "مدل 1403", priceToman: 1_450_000_000, isDiscontinued: false },
  { brand: "ایران خودرو", name: "هایما S5 توربو", year: "مدل 1401", priceToman: 1_250_000_000, isDiscontinued: false },

  // جک
  { brand: "کرمان موتور", name: "جک S5 اتوماتیک", year: "مدل 1402", priceToman: 1_550_000_000, isDiscontinued: false },
  { brand: "کرمان موتور", name: "جک J4", year: "مدل 1403", priceToman: 880_000_000, isDiscontinued: false },

  // وانت پیکاپ و کاپرا و ریچ
  { brand: "پارس خودرو", name: "پیکاپ ریچ", year: "مدل 1395", priceToman: 840_000_000, isDiscontinued: true },
  { brand: "گروه بهمن", name: "کاپرا دوکابین", year: "مدل 1390", priceToman: 550_000_000, isDiscontinued: true },
  { brand: "ایران خودرو", name: "پژو روآ و روآ سال", year: "مدل 1387", priceToman: 175_000_000, isDiscontinued: true },

  // لیفان
  { brand: "کرمان موتور", name: "لیفان 620", year: "مدل 1390", priceToman: 300_000_000, isDiscontinued: true },

  // سیتروئن C3
  { brand: "سایپا", name: "سیتروئن C3", year: "مدل 1397", priceToman: 1_920_000_000, isDiscontinued: true },

  // هیوندای اکسنت و سراتو
  { brand: "هیوندای", name: "هیوندای اکسنت", year: "مدل 2017", priceToman: 1_950_000_000, isDiscontinued: true },
  { brand: "کیا", name: "کیا سراتو مونتاژ سایپا 2.0", year: "مدل 1394", priceToman: 1_380_000_000, isDiscontinued: true },
];

const allPrices = [...rawPrices, ...extraCars];

// Test the 11 cars that failed previously
const failedCars = [
  { make: "ساینا", model: "ساینا S دنده‌ای", year: 1403, title: "ساینا s" },
  { make: "سایپا", model: "سایپا اطلس G", year: 1402, title: "اطلس مدل۱۴۰۲ مفت" },
  { make: "سایپا", model: "سایپا اطلس G", year: 1403, title: "اطلس نوک مدادی G" },
  { make: "زامیاد", model: "وانت نیسان زامیاد Z24 بنزینی", year: 1382, title: "نیسان" },
  { make: "زامیاد", model: "وانت نیسان زامیاد Z24 بنزینی", year: 1402, title: "نیسان اپشنال 402مرتب" },
  { make: "ام‌وی‌ام", model: "ام وی ام X22 دنده‌ای", year: 1403, title: "ایگس 22پرو مدل403دنده" },
  { make: "کیا", model: "کیا سراتو مونتاژ سایپا 2.0", year: 1393, title: "سراتو yd2014 فول" },
  { make: "ایران خودرو", model: "پژو روآ و روآ سال", year: 1387, title: "روا مدل ۸۷ استثنایی" },
  { make: "کرمان موتور", model: "لیفان 620", year: 1390, title: "لیفان مدل ۹۰ شیک 158کارکرد" },
  { make: "سایپا", model: "سیتروئن C3", year: 1397, title: "سیتروئن c3 در حد صفر مدل ۱۳۹۷" },
  { make: "مدیران خودرو", model: "چری آریزو 5 دنده‌ای و اتومات", year: 1402, title: "اریزو ۵ بدون رنگ" },
];

console.log("--- TESTING PREVIOUSLY FAILED CARS ---");
let passCount = 0;
for (const c of failedCars) {
  const est = lookupDailyPrice(allPrices, c.make, c.model, c.year, c.title, null, null);
  const estStr = est ? `${Math.round(est / 1000000)} M` : '❌ NULL';
  if (est) passCount++;
  console.log(`${estStr.padEnd(8)} | ${c.title.padEnd(30)} -> Clean: ${c.make} ${c.model} (${c.year})`);
}

console.log(`\nResult: ${passCount}/${failedCars.length} (${Math.round((passCount / failedCars.length) * 100)}%)`);
