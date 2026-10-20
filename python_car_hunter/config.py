"""
تنظیمات و پیکربندی سامانه شکار آگهی خودرو (دیوار + برآورد + تلگرام + بله)
"""

import os
from pathlib import Path
from dotenv import load_dotenv

# بارگذاری متغیرهای محیطی از فایل .env در صورت وجود
BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env")


class Config:
    # ---------------- تنظیمات دیوار ----------------
    # نام شهر در آدرس دیوار (مثال: torbat-heydariyeh, mashhad, tehran)
    DIVAR_CITY_SLUG: str = os.getenv("DIVAR_CITY_SLUG", "torbat-heydariyeh")
    DIVAR_CATEGORY: str = os.getenv("DIVAR_CATEGORY", "auto")
    
    # کف قیمت مجاز (برای حذف قیمت‌های صوری، اقساط، پیش‌پرداخت یا صفر)
    # پیش‌فرض: ۱۵۰ میلیون تومان
    MIN_VALID_PRICE_TOMAN: int = int(os.getenv("MIN_VALID_PRICE_TOMAN", "150000000"))
    
    # ---------------- تنظیمات ارزیابی و سود ----------------
    # حداقل درصد زیر قیمت بودن برای شکار (مثلاً ۰.۱۵ معادل ۱۵ درصد)
    MIN_DISCOUNT_PERCENT: float = float(os.getenv("MIN_DISCOUNT_PERCENT", "0.15"))
    
    # فایل کش قیمت‌های برآورد بر حسب ثانیه (پیش‌فرض: ۲۴ ساعت = ۸۶۴۰۰ ثانیه)
    BARAVARD_CACHE_TTL_SECONDS: int = int(os.getenv("BARAVARD_CACHE_TTL_SECONDS", "86400"))
    BARAVARD_CACHE_FILE: Path = BASE_DIR / "baravard_cache.json"
    DAILY_PRICES_FILE: Path = BASE_DIR.parent / ".data" / "daily_car_prices.json"

    # ---------------- تنظیمات ربات تلگرام ----------------
    TELEGRAM_BOT_TOKEN: str = os.getenv("TELEGRAM_BOT_TOKEN", "")
    TELEGRAM_ADMIN_CHAT_ID: str = os.getenv("TELEGRAM_ADMIN_CHAT_ID", "")

    # ---------------- تنظیمات ربات بله (Bale Messenger) ----------------
    BALE_BOT_TOKEN: str = os.getenv("BALE_BOT_TOKEN", "")
    BALE_ADMIN_CHAT_ID: str = os.getenv("BALE_ADMIN_CHAT_ID", "")

    # ---------------- تنظیمات زمان‌بندی (Scheduler) ----------------
    # فاصله زمانی پایش دوره‌ای به دقیقه (مثلاً هر ۱۵ دقیقه)
    CHECK_INTERVAL_MINUTES: int = int(os.getenv("CHECK_INTERVAL_MINUTES", "15"))
    
    # فایل ذخیره شناسه‌های آگهی‌های ارسال‌شده برای جلوگیری از ارسال مجدد
    SEEN_POSTS_FILE: Path = BASE_DIR / "seen_posts.json"


config = Config()
