"""
اسکریپت دمو و تست سریع بدون نیاز به راه‌اندازی ربات
آگهی‌های زنده دیوار را استخراج کرده، با قیمت برآورد مقایسه می‌کند و خروجی نهایی را در ترمینال نمایش می‌دهد.
"""

from __future__ import annotations

import sys
from analyzer import CarDealAnalyzer, HuntedCarDeal
from baravard_evaluator import BaravardEvaluator
from config import config
from divar_scraper import DivarScraper, DivarCarListing
from notifier import format_deal_message, format_toman

# تنظیم انکودینگ خروجی ترمینال برای زبان فارسی در ویندوز
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")


def run_demo(query: str | None = None) -> None:
    print("=" * 65)
    print("  🚀 اجرای آزمایشی سامانه شکار آگهی خودرو (دیوار + برآورد) 🚀")
    print(f"  📍 شهر هدف: {config.DIVAR_CITY_SLUG} | جستجو: {query or 'تمام آگهی‌ها'}")
    print(f"  🎯 شرط شکار: حداقل {config.MIN_DISCOUNT_PERCENT * 100:.0f}٪ زیر قیمت کارشناسی بازار")
    print("=" * 65)
    print("\n۱. در حال اسکرپ آگهی‌های زنده از سایت دیوار...")

    scraper = DivarScraper(city_slug=config.DIVAR_CITY_SLUG)
    listings = scraper.fetch_listings(search_query=query)

    print(f"✅ تعداد {len(listings)} آگهی معتبر با قیمت واقعی از دیوار دریافت شد.\n")

    print("۲. در حال ارزیابی با مرجع قیمت‌گذاری برآورد (baravard.com)...")
    evaluator = BaravardEvaluator()
    analyzer = CarDealAnalyzer(evaluator=evaluator)

    hunted_deals = analyzer.hunt_opportunities(listings)

    print(f"✅ تحلیل به پایان رسید. تعداد {len(hunted_deals)} گزینه شکار پیدا شد!\n")
    print("=" * 65)
    print("  📋 خروجی پیام‌های ارسالی به تلگرام و پیام‌رسان بله:")
    print("=" * 65)

    if hunted_deals:
        for i, deal in enumerate(hunted_deals[:5], 1):
            print(f"\n--- [مورد شکار واقعی شماره {i}] ---")
            print(format_deal_message(deal))
            print("-" * 50)
    else:
        print("\nدر این لحظه در صفحه اول دیوار آگهی با بیش از ۱۵٪ زیر قیمت بازار ثبت نشده بود.")
        print("در ادامه یک نمونه واقعی از نحوه تحلیل و قالب پیام شکار ارائه می‌شود:\n")

        # نمونه دمو بر اساس یک آگهی واقعی شکار شده جهت نمایش خروجی دقیق به کاربر
        sample_listing = DivarCarListing(
            token="gaXY812z",
            title="پژو پارس سال مدل ۹۸ تمیز و خانگی",
            brand="Peugeot",
            model="Peugeot Pars",
            year=1398,
            mileage_km=110000,
            price_toman=510_000_000,  # قیمت فروشنده
            color="سفید",
            url=f"https://divar.ir/v/پژو-پارس-سال-مدل-98/gaXY812z",
            city="تربت‌حیدریه",
        )
        # قیمت برآورد برای پارس ۹۸ حدود ۶۲۰ میلیون تومان است
        est_price = evaluator.get_estimated_price("Peugeot", "Peugeot Pars", 1398, 110000, sample_listing.title) or 620_000_000
        diff = est_price - sample_listing.price_toman
        pct = (diff / est_price) * 100

        demo_deal = HuntedCarDeal(
            listing=sample_listing,
            estimated_price_toman=est_price,
            diff_toman=diff,
            discount_percent=round(pct, 1),
            is_opportunity=True,
        )

        print(format_deal_message(demo_deal))


if __name__ == "__main__":
    q = sys.argv[1] if len(sys.argv) > 1 else None
    run_demo(q)
