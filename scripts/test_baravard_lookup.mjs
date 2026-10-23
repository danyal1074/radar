import fs from 'node:fs';
import { lookupDailyPrice } from '../lib/daily-prices/lookup.ts';

const prices = JSON.parse(fs.readFileSync('.data/daily_car_prices.json', 'utf8'));
console.log('Total prices loaded:', prices.length);

const testCars = [
  { make: 'کوییک', model: 'کوییک R', year: 1399, title: 'کوییک R مدل ۱۳۹۹' },
  { make: 'ساینا', model: 'ساینا S اتوماتیک', year: 1402, title: 'ساینا S اتومات مدل 1402' },
  { make: 'تارا', model: 'تارا دنده‌ای V1', year: 1404, title: 'تارا۴۰۴دنده وی ۱ پلاس' },
  { make: 'پژو', model: 'پژو 207 پانوراما', year: 1403, title: '207 پانوراما ارتقا مدل 1403' },
  { make: 'جک', model: 'جک S5', year: 1395, title: 'جک s 5 مدل ۹۵' },
  { make: 'پراید', model: 'پراید 111 SE', year: 1389, title: 'پراید ۱۱۱ تک برگ سند' },
  { make: 'چری', model: 'چری تیگو 7', year: 1402, title: 'تیگو ۷ ie مدل ۱۴۰۲' },
  { make: 'ایران خودرو', model: 'دانگ فنگ H30 کراس اتوماتیک', year: 1397, title: 'اچ سی کراس ۹۷ بدون رنگ فروش فوری' },
];

for (const c of testCars) {
  const p = lookupDailyPrice(prices, c.make, c.model, c.year, c.title);
  console.log(
    (c.make + ' ' + c.model).padEnd(25) +
    `| Year: ${c.year} ` +
    `| Est: ${p ? (p / 1e6).toFixed(0) + ' M Toman' : '❌ NULL'}`
  );
}
