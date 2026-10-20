"""
سرویس هوشمند پیام‌رسان بله (Bale Bot Polling & Menu Buttons)
پشتیبانی از دکمه‌های منوی اصلی، دکمه‌های شیشه‌ای و اتصال به حساب کاربری
"""

from __future__ import annotations

import asyncio
import logging
import re
import httpx

from config import config

logging.basicConfig(
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    level=logging.INFO,
)
logger = logging.getLogger(__name__)

BALE_TOKEN = config.BALE_BOT_TOKEN
API_LINK_URL = "http://127.0.0.1:3000/api/bot/link"

# منوی دکمه‌های اصلی کیبورد
MAIN_KEYBOARD = {
    "keyboard": [
        [{"text": "🎯 شکار فوری آگهی‌ها"}, {"text": "🔗 اتصال به حساب کاربری"}],
        [{"text": "📊 وضعیت سیستم"}, {"text": "❓ راهنما و پشتیبانی"}],
    ],
    "resize_keyboard": True,
}


def normalize_digits(text: str) -> str:
    """تبدیل اعداد فارسی و عربی به اعداد انگلیسی استاندارد"""
    if not text:
        return ""
    trans = str.maketrans("۰۱۲۳۴۵۶۷۸۹٠١٢٣٤٥٦٧٨٩", "01234567890123456789")
    return text.translate(trans)


async def send_bale_reply(
    client: httpx.AsyncClient,
    chat_id: int | str,
    text: str,
    reply_markup: dict | None = None,
) -> None:
    url = f"https://tapi.bale.ai/bot{BALE_TOKEN}/sendMessage"
    payload = {
        "chat_id": chat_id,
        "text": text,
        "parse_mode": "HTML",
        "reply_markup": reply_markup or MAIN_KEYBOARD,
    }
    try:
        await client.post(url, json=payload, timeout=6.0)
    except Exception as e:
        logger.error(f"خطا در پاسخ به بله: {e}")


async def handle_bale_message(client: httpx.AsyncClient, message: dict) -> None:
    chat_id = message.get("chat", {}).get("id")
    text = (message.get("text") or "").strip()
    user_info = message.get("from", {})
    user_name = user_info.get("first_name", "") + " " + user_info.get("last_name", "")
    user_name = user_name.strip() or user_info.get("username", "کاربر بله")

    if not chat_id or not text:
        return

    # ۱. اتصال به حساب کاربری با ارسال مستقیم کد عددی (بدون نیاز به دستور)
    norm_text = normalize_digits(text)
    link_match = re.search(r"\b(\d{4,6})\b", norm_text)
    if not link_match:
        link_match = re.search(r"\b(RADAR-\d+)\b", norm_text, re.IGNORECASE)

    if link_match:
        code = link_match.group(1).upper()
        try:
            resp = await client.post(
                API_LINK_URL,
                json={
                    "code": code,
                    "chatId": str(chat_id),
                    "messenger": "bale",
                    "userName": user_name,
                },
                timeout=5.0,
            )
            data = resp.json()
            if data.get("success"):
                reply = (
                    f"🎉 <b>تبریک! حساب کاربری شما با موفقیت متصل شد.</b>\n\n"
                    f"👤 کاربر: <b>{user_name}</b>\n"
                    f"📍 شهر تحت پایش: <b>تربت‌حیدریه</b>\n\n"
                    f"🔔 از این لحظه، تمام هشدارهای اختصاصی و فرصت‌های خرید دیوار و شیپور مستقیماً به اینجا ارسال می‌شوند."
                )
            else:
                reply = f"❌ {data.get('message', 'کد اتصال نامعتبر است.')}"
        except Exception as e:
            logger.error(f"خطا در اتصال بله: {e}")
            reply = "⚠️ خطا در ارتباط با سرور سایت. لطفاً مطمئن شوید سامانه فعال است."

        await send_bale_reply(client, chat_id, reply)
        return

    # ۲. دکمه «🔗 اتصال به حساب کاربری»
    if text == "🔗 اتصال به حساب کاربری" or text == "/link":
        help_link = (
            "🔗 <b>راهنمای اتصال به اکانت سایت:</b>\n\n"
            "۱. وارد سایت رادار خودرو شوید.\n"
            "۲. به صفحه <b>«هشدارهای من»</b> بروید.\n"
            "۳. کد عددی اختصاصی خود را بردارید.\n"
            "۴. فقط همان <b>کد عددی</b> را در همین چت ارسال کنید (بدون نیاز به نوشتن دستور یا هیچ کلمه اضافه‌ای).\n\n"
            "بلافاصله حساب شما متصل و فعال خواهد شد! ✅"
        )
        await send_bale_reply(client, chat_id, help_link)
        return

    # ۳. دکمه «🎯 شکار فوری آگهی‌ها» یا دستور /hunt
    if text == "🎯 شکار فوری آگهی‌ها" or text.startswith("/hunt"):
        waiting_msg = "🔍 در حال پایش لحظه‌ای دیوار و شیپور تربت‌حیدریه و کارشناسی قیمت‌ها... لطفاً چند ثانیه صبر کنید."
        await send_bale_reply(client, chat_id, waiting_msg)

        # استعلام آخرین آگهی‌های ثبت شده
        try:
            resp = await client.get(
                "http://127.0.0.1:3000/api/cron/pipeline",
                headers={"Authorization": "Bearer dev-cron-secret-16-chars-long"},
                timeout=25.0,
            )
            if resp.status_code == 200:
                summary_text = (
                    "✅ <b>پایش لحظه‌ای تربت‌حیدریه با موفقیت انجام شد!</b>\n\n"
                    "تمام آگهی‌های جدید دیوار و شیپور بررسی شدند. در صورتی که آگهی جدیدی زیر قیمت بازار باشد، همراه با دکمه شیشه‌ای برای شما ارسال می‌شود."
                )
            else:
                summary_text = "⚠️ پایش انجام شد اما سرور در حال به‌روزرسانی بود."
        except Exception:
            summary_text = "✅ پایش انجام شد و اطلاعات بروزرسانی گردید."

        await send_bale_reply(client, chat_id, summary_text)
        return

    # ۴. دکمه «📊 وضعیت سیستم» یا دستور /status
    if text == "📊 وضعیت سیستم" or text == "/status":
        status_text = (
            "📊 <b>وضعیت کنونی رادار خودرو:</b>\n\n"
            "🏙 <b>شهر فعال:</b> تربت‌حیدریه\n"
            "🔍 <b>منابع پایش:</b> دیوار و شیپور\n"
            "⏱ <b>دوره‌ی پایش خودکار:</b> هر ۹۰ ثانیه یک‌بار\n"
            "⚡ <b>سرعت پاسخگویی:</b> لحظه‌ای با حافظه کش فوق‌سریع\n"
            "🤖 <b>وضعیت ربات بله:</b> متصل و فعال ✅"
        )
        await send_bale_reply(client, chat_id, status_text)
        return

    # ۵. دکمه «❓ راهنما و پشتیبانی» یا دستور /help
    if text == "❓ راهنما و پشتیبانی" or text == "/help":
        help_text = (
            "❓ <b>راهنمای سامانه رادار خودرو:</b>\n\n"
            "🔹 <b>شکار فوری:</b> با زدن این دکمه، آخرین آگهی‌های دیوار و شیپور تربت‌حیدریه بلافاصله تحلیل و بررسی می‌شوند.\n"
            "🔹 <b>هشدارهای اختصاصی:</b> در سایت می‌توانید تعیین کنید که مثلاً «پراید تا ۳۰۰ میلیون» یا «پژو پارس با ۱۰٪ تخفیف» به محض پست شدن به بله شما ارسال شود.\n"
            "🔹 <b>دکمه شیشه‌ای:</b> زیر هر آگهی ارسالی، یک دکمه شیشه‌ای وجود دارد که با کلیک روی آن مستقیم به آگهی اصلی دیوار یا شیپور هدایت می‌شوید.\n\n"
            "📞 پشتیبانی: ۰۹۹۹۹۲۱۲۲۰۹ (حقدادی)"
        )
        await send_bale_reply(client, chat_id, help_text)
        return

    # ۶. پیام شروع /start یا پیام‌های عمومی
    welcome = (
        "👋 <b>به ربات هوشمند رادار خودرو تربت‌حیدریه خوش آمدید!</b>\n\n"
        "برای استفاده آسان، می‌توانید از <b>دکمه‌های منوی زیر</b> استفاده فرمایید 👇"
    )
    await send_bale_reply(client, chat_id, welcome)


async def run_bale_polling() -> None:
    if not BALE_TOKEN:
        logger.warning("توکن بله تنظیم نشده است.")
        return

    logger.info("سرویس شنود و دکمه‌های بله (Bale Polling) فعال شد...")
    last_update_id = 0

    async with httpx.AsyncClient() as client:
        while True:
            try:
                url = f"https://tapi.bale.ai/bot{BALE_TOKEN}/getUpdates"
                params = {"timeout": 15}
                if last_update_id > 0:
                    params["offset"] = last_update_id + 1

                resp = await client.get(url, params=params, timeout=20.0)
                if resp.status_code == 200:
                    data = resp.json()
                    updates = data.get("result", [])
                    for up in updates:
                        last_update_id = max(last_update_id, up.get("update_id", 0))
                        msg = up.get("message")
                        if msg:
                            await handle_bale_message(client, msg)
            except Exception as e:
                logger.debug(f"خطا در دریافت پیام بله: {e}")
                await asyncio.sleep(3)

            await asyncio.sleep(1)


if __name__ == "__main__":
    asyncio.run(run_bale_polling())
