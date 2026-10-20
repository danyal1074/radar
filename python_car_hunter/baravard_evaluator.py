"""
ماژول ارزیابی و استعلام قیمت کارشناسی خودرو از مرجع برآورد (baravard.com)
همراه با سیستم کش‌گذاری ۲۴ ساعته (JSON Caching) و پایگاه مرجع پشتیبان (Benchmark Matrix)
"""

from __future__ import annotations

import json
import logging
import re
import time
from typing import Any, Dict, Optional

import httpx

from config import config

logger = logging.getLogger(__name__)


# ---------------- پایگاه قیمت مبنای بازار برای خودروهای پرتیراژ داخلی ----------------
# قیمت پایه (تومان) برای سال‌های مبنا جهت تخمین هوشمند حتی در زمان قطعی یا ریت‌لیمیت برآورد
BENCHMARK_BASE_PRICES: Dict[str, Dict[int, int]] = {
    # پژو پارس (معمولی، سال، TU5)
    "peugeot_pars": {
        1395: 470_000_000,
        1396: 510_000_000,
        1397: 570_000_000,
        1398: 620_000_000,
        1399: 680_000_000,
        1400: 740_000_000,
        1401: 810_000_000,
        1402: 890_000_000,
    },
    # پژو ۲۰۶ (تیپ ۲ و ۵)
    "peugeot_206": {
        1390: 290_000_000,
        1394: 360_000_000,
        1396: 410_000_000,
        1397: 450_000_000,
        1398: 500_000_000,
        1399: 550_000_000,
        1400: 600_000_000,
        1401: 660_000_000,
    },
    # پراید (۱۳۱، ۱۳۲، ۱۱۱، صبا)
    "pride": {
        1383: 160_000_000,
        1385: 180_000_000,
        1388: 200_000_000,
        1390: 220_000_000,
        1393: 250_000_000,
        1395: 280_000_000,
        1397: 320_000_000,
        1398: 345_000_000,
        1399: 375_000_000,
    },
    # تیبا (تیبا ۱ صندوقدار و تیبا ۲ هاچبک)
    "tiba": {
        1395: 310_000_000,
        1397: 355_000_000,
        1398: 385_000_000,
        1399: 415_000_000,
        1400: 445_000_000,
        1401: 485_000_000,
    },
    # ساینا (دنده‌ای معمولی، S، اتوماتیک)
    "saina": {
        1397: 370_000_000,
        1398: 395_000_000,
        1399: 425_000_000,
        1400: 460_000_000,
        1401: 495_000_000,
        1402: 540_000_000,
        1403: 585_000_000,
    },
    # کوییک (دنده‌ای، R، S)
    "quick": {
        1398: 390_000_000,
        1399: 420_000_000,
        1400: 450_000_000,
        1401: 485_000_000,
        1402: 530_000_000,
        1403: 575_000_000,
    },
    # دنا و دنا پلاس
    "dena": {
        1397: 630_000_000,
        1398: 690_000_000,
        1399: 760_000_000,
        1400: 840_000_000,
        1401: 930_000_000,
        1402: 1_050_000_000,
        1403: 1_180_000_000,
    },
    # تارا (دنده‌ای و اتوماتیک)
    "tara": {
        1400: 750_000_000,
        1401: 830_000_000,
        1402: 920_000_000,
        1403: 1_030_000_000,
    },
    # سمند و سورن
    "samand": {
        1393: 310_000_000,
        1396: 390_000_000,
        1398: 480_000_000,
        1400: 570_000_000,
        1401: 640_000_000,
        1402: 720_000_000,
    },
    # پیکان وانت
    "paykan_pickup": {
        1388: 180_000_000,
        1390: 210_000_000,
        1391: 230_000_000,
        1392: 250_000_000,
        1393: 275_000_000,
    },
    # دوو ماتیز
    "daewoo_matiz": {
        1380: 170_000_000,
        1381: 185_000_000,
        1382: 200_000_000,
    },
}


class BaravardEvaluator:
    def __init__(self) -> None:
        self.cache_file = config.BARAVARD_CACHE_FILE
        self.cache_ttl = config.BARAVARD_CACHE_TTL_SECONDS
        self._cache: Dict[str, Dict[str, Any]] = self._load_cache()
        self.headers = {
            "User-Agent": (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/124.0.0.0 Safari/537.36"
            ),
            "Accept": "application/json, text/html",
        }

    def _load_cache(self) -> Dict[str, Dict[str, Any]]:
        """بارگذاری کش از فایل json محلی"""
        if self.cache_file.exists():
            try:
                with open(self.cache_file, "r", encoding="utf-8") as f:
                    return json.load(f)
            except Exception as e:
                logger.warning(f"عدم امکان خواندن فایل کش برآورد: {e}")
        return {}

    def _save_cache(self) -> None:
        """ذخیره کش در فایل json محلی"""
        try:
            with open(self.cache_file, "w", encoding="utf-8") as f:
                json.dump(self._cache, f, ensure_ascii=False, indent=2)
        except Exception as e:
            logger.error(f"خطا در ذخیره فایل کش: {e}")

    def normalize_model_key(self, brand: str, model: str, title: str) -> str:
        """تشخیص و نرمال‌سازی کلید خودرو از روی عنوان، برند یا مدل"""
        full_text = f"{brand} {model} {title}".lower()

        if any(w in full_text for w in ["پارس", "pars"]):
            return "peugeot_pars"
        if any(w in full_text for w in ["۲۰۶", "206"]):
            return "peugeot_206"
        if any(w in full_text for w in ["پراید", "pride", "131", "132", "111", "صبا"]):
            return "pride"
        if any(w in full_text for w in ["تیبا", "tiba"]):
            return "tiba"
        if any(w in full_text for w in ["ساینا", "saina"]):
            return "saina"
        if any(w in full_text for w in ["کوییک", "کوئیک", "quick", "quik"]):
            return "quick"
        if any(w in full_text for w in ["دنا", "dena"]):
            return "dena"
        if any(w in full_text for w in ["تارا", "tara"]):
            return "tara"
        if any(w in full_text for w in ["سمند", "سورن", "samand", "soren"]):
            return "samand"
        if any(w in full_text for w in ["پیکان وانت", "وانت پیکان", "paykan pickup"]):
            return "paykan_pickup"
        if any(w in full_text for w in ["ماتیز", "matiz"]):
            return "daewoo_matiz"

        return "unknown"

    def _scrape_baravard_online(self, brand: str, model: str, year: int) -> Optional[int]:
        """تلاش برای خواندن جداول قیمت کارشناسی از وب‌سایت baravard.com/pricing"""
        clean_brand = re.sub(r"[^\w]", "-", brand.strip().lower())
        clean_model = re.sub(r"[^\w]", "-", model.strip().lower())
        url = f"https://baravard.com/pricing/{clean_brand}/{clean_model}"

        try:
            with httpx.Client(timeout=6.0, headers=self.headers) as client:
                resp = client.get(url)
                if resp.status_code == 200:
                    # جستجوی قیمت مرتبط با سال ساخت در متن HTML برآورد
                    m = re.search(rf"{year}.*?([\d,]{{7,15}})\s*تومان", resp.text)
                    if m:
                        digits = int(m.group(1).replace(",", ""))
                        return digits
        except Exception:
            # در صورت قطعی، حفاظت کلودفلر یا عدم پاسخ، بلافاصله به پایگاه بنچ‌مارک سوئیچ می‌شود
            pass
        return None

    def get_estimated_price(
        self,
        brand: str,
        model: str,
        year: int,
        mileage_km: int,
        title: str = "",
    ) -> Optional[int]:
        """
        محاسبه قیمت کارشناسی روز بازار:
        ۱. بررسی در پایگاه داده ۳۹۰۰ خودروی برآورد (daily_car_prices.json)
        ۲. بررسی در کش ۲۴ ساعته
        ۳. تلاش برای استعلام آنلاین از برآورد
        ۴. استفاده از ماتریس تحلیلی مرجع قیمت با اصلاح ضریب کارکرد
        """
        if year <= 1300 or year > 1410:
            return None

        # ۱. استعلام فوری از دیتابیس جامع بارگذاری‌شده برآورد
        base_from_file = self._lookup_daily_file(brand, model, year, title)
        if base_from_file and base_from_file > 0:
            return self._apply_mileage_adjustment(base_from_file, year, mileage_km)

        model_key = self.normalize_model_key(brand, model, title)
        cache_key = f"{model_key}_{year}"
        now = time.time()

        # ۲. بررسی کش
        if cache_key in self._cache:
            entry = self._cache[cache_key]
            if now - entry["timestamp"] < self.cache_ttl:
                base_price = entry["price_toman"]
                return self._apply_mileage_adjustment(base_price, year, mileage_km)

        # ۳. تلاش آنلاین از برآورد
        base_price = self._scrape_baravard_online(brand, model, year)

        # ۴. در صورت نبود، استفاده از ماتریس پایه
        if not base_price:
            base_price = self._lookup_benchmark(model_key, year)

        if base_price:
            self._cache[cache_key] = {
                "price_toman": base_price,
                "timestamp": now,
                "model_key": model_key,
            }
            self._save_cache()
            return self._apply_mileage_adjustment(base_price, year, mileage_km)

        return None

    def _lookup_daily_file(self, brand: str, model: str, year: int, title: str) -> Optional[int]:
        """استعلام آنی از دیتابیس ۳۹۰۰ خودروی برآورد ذخیره‌شده در سیستم"""
        if not hasattr(self, "_daily_prices_cache") or not self._daily_prices_cache:
            self._daily_prices_cache = []
            if config.DAILY_PRICES_FILE.exists():
                try:
                    with open(config.DAILY_PRICES_FILE, "r", encoding="utf-8") as f:
                        self._daily_prices_cache = json.load(f)
                except Exception as e:
                    logger.warning(f"خطا در خواندن فایل قیمت‌های روز: {e}")

        if not self._daily_prices_cache:
            return None

        q = f"{brand} {model} {title}".lower()
        year_str = str(year)

        candidates = []
        for item in self._daily_prices_cache:
            item_name = item.get("name", "").lower()
            if any(k in q for k in ["پراید", "pride"]):
                if any(x in q for x in ["۱۳۲", "132"]) and "132" in item_name:
                    candidates.append(item)
                elif any(x in q for x in ["۱۱۱", "111"]) and "111" in item_name:
                    candidates.append(item)
                elif any(x in q for x in ["۱۵۱", "151"]) and "151" in item_name:
                    candidates.append(item)
                elif "131" in item_name or "صبا" in item_name:
                    candidates.append(item)
            elif any(k in q for k in ["پارس", "pars"]) and "پارس" in item_name:
                candidates.append(item)
            elif any(k in q for k in ["۲۰۶", "206"]) and "206" in item_name:
                candidates.append(item)
            elif any(k in q for k in ["۲۰۷", "207"]) and "207" in item_name:
                candidates.append(item)
            elif any(k in q for k in ["تیبا", "tiba"]) and "تیبا" in item_name:
                candidates.append(item)
            elif any(k in q for k in ["ساینا", "saina"]) and "ساینا" in item_name:
                candidates.append(item)
            elif any(k in q for k in ["کوییک", "کوئیک", "quick"]) and ("کوییک" in item_name or "کوئیک" in item_name):
                candidates.append(item)
            elif any(k in q for k in ["دنا", "dena"]) and "دنا" in item_name:
                candidates.append(item)
            elif any(k in q for k in ["تارا", "tara"]) and "تارا" in item_name:
                candidates.append(item)
            elif any(k in q for k in ["شاهین", "shahin"]) and "شاهین" in item_name:
                candidates.append(item)
            elif any(k in q for k in ["سمند", "سورن"]) and ("سمند" in item_name or "سورن" in item_name):
                candidates.append(item)
            elif any(k in q for k in ["۴۰۵", "405"]) and "405" in item_name:
                candidates.append(item)

        for c in candidates:
            if year_str in c.get("year", ""):
                return c.get("priceToman")

        if candidates:
            return candidates[0].get("priceToman")

        return None

    def _lookup_benchmark(self, model_key: str, year: int) -> Optional[int]:
        """محاسبه هوشمند قیمت مبنا با درون‌یابی بر اساس سال‌های موجود در جدول"""
        year_prices = BENCHMARK_BASE_PRICES.get(model_key)
        if not year_prices:
            return None

        if year in year_prices:
            return year_prices[year]

        # درون‌یابی نزدیک‌ترین سال‌ها
        known_years = sorted(year_prices.keys())
        if year < known_years[0]:
            diff_years = known_years[0] - year
            return max(int(year_prices[known_years[0]] * (1 - 0.06 * diff_years)), 100_000_000)
        elif year > known_years[-1]:
            diff_years = year - known_years[-1]
            return int(year_prices[known_years[-1]] * (1 + 0.08 * diff_years))
        else:
            prev_y = max(y for y in known_years if y < year)
            next_y = min(y for y in known_years if y > year)
            ratio = (year - prev_y) / (next_y - prev_y)
            return int(year_prices[prev_y] + ratio * (year_prices[next_y] - year_prices[prev_y]))

    def _apply_mileage_adjustment(self, base_price: int, year: int, mileage_km: int) -> int:
        """
        اعمال ضریب افت یا افزایش ارزش بر اساس کارکرد واقعی در مقایسه با کارکرد استاندارد:
        استاندارد کارکرد خودرو در ایران: حدود ۲۰,۰۰۰ کیلومتر در سال
        """
        car_age = max(1, 1403 - year)
        expected_km = car_age * 20_000

        if mileage_km <= 0:
            return base_price

        diff_km = mileage_km - expected_km

        # هر ۱۰,۰۰۰ کیلومتر کارکرد مازاد = حدود ۰.۸٪ افت قیمت (حداکثر تا ۸٪)
        # هر ۱۰,۰۰۰ کیلومتر کارکرد کمتر = حدود ۰.۸٪ افزایش قیمت (حداکثر تا ۵٪)
        adjust_ratio = (diff_km / 10_000) * 0.008
        adjust_ratio = max(-0.05, min(0.08, adjust_ratio))

        final_price = int(base_price * (1 - adjust_ratio))
        return final_price
