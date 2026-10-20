"""
ربات تلگرام و پایشگر خودکار آگهی‌های خودرو دیوار (python-telegram-bot v20+)
پشتیبانی از پایش دوره‌ای (Scheduler)، استعلام آنی و ارسال همزمان به بله
"""

from __future__ import annotations

import asyncio
import json
import logging
from pathlib import Path
from typing import Set

from telegram import Update
from telegram.ext import (
    Application,
    ApplicationBuilder,
    CommandHandler,
    ContextTypes,
    MessageHandler,
    filters,
)

from analyzer import CarDealAnalyzer, HuntedCarDeal
from baravard_evaluator import BaravardEvaluator
from config import config
from divar_scraper import DivarScraper
from notifier import MultiChannelNotifier, format_deal_message

# تنظیمات لاگین
logging.basicConfig(
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    level=logging.INFO,
)
logger = logging.getLogger(__name__)

# بارگذاری و ذخیره آگهی‌های دیده شده برای جلوگیری از ارسال پیام‌های تکراری
SEEN_FILE = config.SEEN_POSTS_FILE


def load_seen_posts() -> Set[str]:
    if SEEN_FILE.exists():
        try:
            with open(SEEN_FILE, "r", encoding="utf-8") as f:
                return set(json.load(f))
        except Exception as e:
            logger.error(f"خطا در خواندن فایل seen_posts: {e}")
    return set()


def save_seen_posts(seen: Set[str]) -> None:
    try:
        # نگهداری حداکثر ۱۰۰۰ شناسه اخیر جهت بهینه‌سازی حجم
        items = list(seen)[-1000:]
        with open(SEEN_FILE, "w", encoding="utf-8") as f:
            json.dump(items, f)
    except Exception as e:
        logger.error(f"خطا در ذخیره فایل seen_posts: {e}")


class CarRadarService:
    def __init__(self) -> None:
        self.scraper = DivarScraper(city_slug=config.DIVAR_CITY_SLUG)
        self.evaluator = BaravardEvaluator()
        self.analyzer = CarDealAnalyzer(evaluator=self.evaluator)
        self.notifier = MultiChannelNotifier()
        self.seen_tokens: Set[str] = load_seen_posts()

    def run_hunt_cycle(self, search_query: str | None = None) -> list[HuntedCarDeal]:
        """اجرای یک مرحله شکار: اسکرپ دیوار، محاسبه اختلاف قیمت با برآورد و فیلتر موارد جدید"""
        listings = self.scraper.fetch_listings(search_query=search_query)
        deals = self.analyzer.hunt_opportunities(listings)

        new_deals: list[HuntedCarDeal] = []
        for deal in deals:
            token = deal.listing.token
            if token not in self.seen_tokens:
                self.seen_tokens.add(token)
                new_deals.append(deal)

        if new_deals:
            save_seen_posts(self.seen_tokens)

        return new_deals


service = CarRadarService()


# ---------------- هندلرهای ربات تلگرام ----------------


async def start_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """دستور /start با پشتیبانی از اتصال خودکار کد دیپ‌لینک"""
    if context.args:
        # اتصال خودکار از طریق دیپ‌لینک https://t.me/radarcar_bot?start=RADAR-1234
        await link_command(update, context)
        return

    text = (
        "👋 <b>به ربات هوشمند رادار شکار خودرو خوش آمدید!</b>\n\n"
        "🎯 این ربات به طور مداوم آگهی‌های جدید دیوار و شیپور تربت‌حیدریه را رصد می‌کند.\n\n"
        "⚙️ <b>دستورات در دسترس:</b>\n"
        "🔹 <code>/link کد_اتصال</code> : اتصال این ربات به اکانت شما در سایت\n"
        "🔹 <code>/hunt</code> : بررسی فوری و شکار تمام آگهی‌های زیر قیمت\n"
        "🔹 <code>/hunt پژو پارس</code> : شکار آگهی‌های زیر قیمت یک خودروی خاص\n"
        "🔹 <code>/status</code> : مشاهده وضعیت سیستم و شهر تحت پایش\n"
        "🔹 <code>/help</code> : راهنمای استفاده از سامانه\n\n"
        f"📍 <b>شهر پیش‌فرض:</b> {config.DIVAR_CITY_SLUG}\n"
        f"🔥 <b>کف درصد تخفیف:</b> {config.MIN_DISCOUNT_PERCENT * 100:.0f} درصد زیر قیمت بازار"
    )
    if update.message:
        await update.message.reply_html(text)


async def try_link_user(chat_id: int | str, user_name: str, raw_text: str, update: Update) -> bool:
    """تلاش برای اتصال اکانت با کد عددی ارسال‌شده (بدون نیاز به نوشتن دستور)"""
    import re
    import httpx
    from divar_scraper import normalize_digits

    norm = normalize_digits(raw_text)
    m = re.search(r"\b(\d{4,6})\b", norm)
    if not m:
        m = re.search(r"\b(RADAR-\d+)\b", norm, re.IGNORECASE)
    if not m:
        return False

    code = m.group(1).upper()
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                "http://127.0.0.1:3000/api/bot/link",
                json={
                    "code": code,
                    "chatId": str(chat_id),
                    "messenger": "telegram",
                    "userName": user_name,
                },
                timeout=5.0,
            )
            data = resp.json()
            if data.get("success"):
                if update.message:
                    await update.message.reply_html(
                        f"🎉 <b>تبریک! حساب کاربری شما با موفقیت متصل شد.</b>\n\n"
                        f"👤 کاربر: <b>{user_name}</b>\n"
                        f"📍 شهر تحت پایش: <b>تربت‌حیدریه</b>\n\n"
                        f"🔔 از این پس، تمام هشدارهای اختصاصی و فرصت‌های خرید دیوار و شیپور با دکمه شیشه‌ای مستقیماً به این تلگرام ارسال می‌شود."
                    )
                return True
            else:
                if update.message:
                    await update.message.reply_html(f"❌ {data.get('message', 'کد اتصال نامعتبر است.')}")
                return True
    except Exception as e:
        if update.message:
            await update.message.reply_html(f"⚠️ خطا در ارتباط با سرور سایت: {e}")
        return True


async def handle_text_message(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """دریافت پیام‌های متنی ساده (مانند ارسال کد عددی بدون هیچ دستور)"""
    if not update.message or not update.message.text:
        return
    chat_id = update.effective_chat.id
    user_name = update.effective_user.full_name or update.effective_user.username
    text = update.message.text.strip()

    linked = await try_link_user(chat_id, user_name, text, update)
    if not linked:
        # اگر پیام عدد نبود، راهنمای کوتاه ارسال شود
        await update.message.reply_html(
            "💡 <b>برای اتصال اکانت سایت به این ربات:</b>\n"
            "کافیست <b>کد عددی اختصاصی</b> خود را از سایت (بخش هشدارهای من) بردارید و همین‌جا بدون هیچ دستور یا کلمه اضافه‌ای ارسال کنید."
        )


async def link_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """اتصال شناسه تلگرام به حساب کاربری سایت"""
    chat_id = update.effective_chat.id
    user_name = update.effective_user.full_name or update.effective_user.username
    args = context.args
    code = args[0].strip() if args else ""

    if code:
        await try_link_user(chat_id, user_name, code, update)
    else:
        if update.message:
            await update.message.reply_html(
                "💡 <b>راهنمای اتصال آسان:</b>\n"
                "نیازی به تایپ دستور نیست! فقط کافیست <b>کد عددی</b> خود را از بخش «هشدارهای من» بردارید و در چت ارسال کنید."
            )


async def help_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """دستور /help"""
    text = (
        "💡 <b>راهنمای سریع:</b>\n\n"
        "۱. سامانه به طور خودکار هر ۱۵ الی ۳۰ دقیقه در پس‌زمینه اجرا می‌شود.\n"
        "۲. چنانچه آگهی جدیدی پیدا شود که حداقل ۱۵٪ زیر قیمت برآورد باشد، به طور خودکار به این چت و پیام‌رسان بله ارسال خواهد شد.\n"
        "۳. شما می‌توانید در هر لحظه با ارسال دستور <code>/hunt نام_خودرو</code> جستجوی دستی و آنی انجام دهید.\n\n"
        "📞 <b>پشتیبانی:</b> <code>۰۹۹۹۹۲۱۲۲۰۹</code> (حقدادی)"
    )
    if update.message:
        await update.message.reply_html(text)


async def status_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """دستور /status"""
    text = (
        "📊 <b>وضعیت کنونی سامانه:</b>\n\n"
        f"🏙 <b>شهر پایش:</b> <code>{config.DIVAR_CITY_SLUG}</code>\n"
        f"⏱ <b>دوره پایش خودکار:</b> هر {config.CHECK_INTERVAL_MINUTES} دقیقه\n"
        f"🎯 <b>شرط تخفیف:</b> حداقل {config.MIN_DISCOUNT_PERCENT * 100:.0f}٪ زیر قیمت کارشناسی\n"
        f"💾 <b>تعداد آگهی‌های پایش‌شده پیشین:</b> {len(service.seen_tokens):,} عدد\n"
        f"📱 <b>ارسال به بله:</b> {'فعال ✅' if config.BALE_BOT_TOKEN else 'غیرفعال ❌'}\n"
        f"🤖 <b>وضعیت موتور ارزیابی:</b> فعال و آماده به کار"
    )
    if update.message:
        await update.message.reply_html(text)


async def hunt_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """دستور /hunt یا /hunt {query} جهت شکار آنی"""
    if not update.message:
        return

    query = " ".join(context.args) if context.args else None
    search_label = f"خودروی «{query}»" if query else "تمام آگهی‌های خودرو"

    status_msg = await update.message.reply_html(
        f"🔍 در حال کاوش در دیوار ({config.DIVAR_CITY_SLUG}) برای {search_label} و ارزیابی با برآورد...\nلطفاً چند لحظه شکیبا باشید."
    )

    # اجرای عملیات اسکرپ و تحلیل به صورت غیرمسدودکننده در ترد پس‌زمینه
    loop = asyncio.get_running_loop()
    deals = await loop.run_in_executor(None, service.scraper.fetch_listings, query)
    opportunities = await loop.run_in_executor(None, service.analyzer.hunt_opportunities, deals)

    if not opportunities:
        await status_msg.edit_text(
            f"❌ در حال حاضر آگهی با تخفیف بیش از {config.MIN_DISCOUNT_PERCENT * 100:.0f}٪ برای {search_label} یافت نشد."
        )
        return

    await status_msg.edit_text(f"🎯 تعداد <b>{len(opportunities)} مورد شکار زیر قیمت</b> کشف شد! در حال ارسال جزئیات...")

    # ارسال آگهی‌های شکار شده (حداکثر ۵ مورد برتر در جستجوی دستی)
    for deal in opportunities[:5]:
        msg_html = format_deal_message(deal)
        await update.message.reply_html(msg_html)
        # ارسال همزمان به بله در صورت تنظیم بودن
        service.notifier.send_to_bale(msg_html)
        await asyncio.sleep(0.5)


async def scheduled_hunt_job(context: ContextTypes.DEFAULT_TYPE) -> None:
    """تسک دوره‌ای پس‌زمینه برای ارسال خودکار فرصت‌های جدید"""
    logger.info("اجرای تسک زمان‌بندی‌شده پایش دیوار...")
    loop = asyncio.get_running_loop()
    new_deals = await loop.run_in_executor(None, service.run_hunt_cycle)

    if not new_deals:
        logger.info("مورد شکار جدیدی یافت نشد.")
        return

    logger.info(f"{len(new_deals)} آگهی جدید زیر قیمت کشف شد! در حال ارسال اعلان‌ها...")

    admin_chat_id = config.TELEGRAM_ADMIN_CHAT_ID

    for deal in new_deals:
        msg_html = format_deal_message(deal)
        # ارسال به تلگرام
        if admin_chat_id:
            try:
                await context.bot.send_message(
                    chat_id=admin_chat_id,
                    text=msg_html,
                    parse_mode="HTML",
                )
            except Exception as e:
                logger.error(f"خطا در ارسال اعلان به تلگرام ادمین: {e}")

        # ارسال به پیام‌رسان بله
        service.notifier.send_to_bale(msg_html)
        await asyncio.sleep(1.0)


def main() -> None:
    """تابع اصلی راه‌اندازی ربات تلگرام و زمان‌بند پایش"""
    token = config.TELEGRAM_BOT_TOKEN
    if not token:
        logger.warning(
            "توکن تلگرام (TELEGRAM_BOT_TOKEN) در فایل .env یا متغیرهای محیطی یافت نشد! "
            "برای اجرای دمو بدون تلگرام از اسکریپت demo_runner.py استفاده کنید."
        )

    app = ApplicationBuilder().token(token).build()

    # ثبت دستورات
    app.add_handler(CommandHandler("start", start_command))
    app.add_handler(CommandHandler("help", help_command))
    app.add_handler(CommandHandler("status", status_command))
    app.add_handler(CommandHandler("hunt", hunt_command))
    app.add_handler(CommandHandler("link", link_command))

    # دریافت پیام‌های متنی بدون دستور (مانند ارسال مستقیم کد عددی)
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_text_message))

    # پایش خودکار توسط سرویس اصلی رادار (scripts/auto_radar_scheduler.mjs) بر اساس هشدارهای کاربر انجام می‌شود
    # app.job_queue.run_repeating(scheduled_hunt_job...) غیرفعال شد تا آگهی‌های خارج از هشدار کاربر ارسال نشوند.

    logger.info("ربات رادار خودرو آماده به کار است. در حال اجرای Polling...")
    app.run_polling()


if __name__ == "__main__":
    main()
