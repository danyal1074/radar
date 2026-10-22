"""
سرویس هوشمند پیام‌رسان روبیکا (Rubika Bot Engine)
پشتیبانی از:
- دریافت پیام‌ها و دستورات کاربران در روبیکا
- اتصال حساب کاربری سایت به روبیکا با کد اختصاصی
- ارسال آخرین فرصت‌های شکار خودرو به چت روبیکا
- نمایش فیلترهای فعال کاربر
- نمایش وضعیت اشتراک
"""

from __future__ import annotations

import asyncio
import logging
import re
import httpx

logging.basicConfig(
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    level=logging.INFO,
)
logger = logging.getLogger(__name__)

RUBIKA_TOKEN = "CHEGEH0TZCBGQPEUYBYTMXRUTGTADRUVGKPXXNUBFHXIUOYELMOJCOHLHOZOMZJJ"
API_BASE = "http://127.0.0.1:3000/api/bot"

MAIN_KEYPAD = {
    "rows": [
        [{"text": "🎯 آخرین فرصت‌های شکار"}, {"text": "📋 فیلترهای من"}],
        [{"text": "💳 وضعیت اشتراک من"}, {"text": "🔗 اتصال به سایت"}],
        [{"text": "❓ راهنما و پشتیبانی"}],
    ],
    "resize_keyboard": True,
}


def normalize_digits(text: str) -> str:
    if not text:
        return ""
    trans = str.maketrans("۰۱۲۳۴۵۶۷۸۹٠١٢٣٤٥٦٧٨٩", "01234567890123456789")
    return text.translate(trans)


def format_toman_persian(amount: int) -> str:
    return f"{amount:,.0f}".replace(",", "٬") + " تومان"


async def send_rubika_message(
    client: httpx.AsyncClient,
    chat_id: str,
    text: str,
) -> None:
    url = f"https://botapi.rubika.ir/v3/{RUBIKA_TOKEN}/sendMessage"
    payload = {
        "chat_id": chat_id,
        "text": text,
    }
    try:
        await client.post(url, json=payload, timeout=8.0)
    except Exception as e:
        logger.error(f"خطا در ارسال پیام به روبیکا: {e}")


async def handle_opportunities(client: httpx.AsyncClient, chat_id: str) -> None:
    try:
        res = await client.get(f"{API_BASE}/opportunities", timeout=10.0)
        data = res.json()
        opps = data.get("opportunities", [])
        if not opps:
            await send_rubika_message(
                client,
                chat_id,
                "🔍 در حال حاضر آگهی شکار با سود بالا ثبت نشده است. به محض ثبت آگهی جدید، ربات به شما اطلاع می‌دهد.",
            )
            return

        header = "🎯 آخرین فرصت‌های شکار بازار خودرو (دیوار و شیپور):\n━━━━━━━━━━━━━━━━━━━━━"
        await send_rubika_message(client, chat_id, header)

        for item in opps[:4]:
            t = item.get("title", "خودرو")
            p = item.get("priceToman", 0)
            est = item.get("estimatedToman", 0)
            profit = item.get("profitToman", 0)
            disc = item.get("discountPercent", 0)
            url = item.get("url") or "https://radar.digiral.ir"
            item_city = item.get("city") or "تربت‌حیدریه"
            city_name = "مشهد" if "مشهد" in item_city else "تربت‌حیدریه"
            source = "دیوار" if item.get("source") == "divar" else "شیپور"

            card = (
                f"🚗 {t}\n"
                f"💰 قیمت فروشنده: {format_toman_persian(p)}\n"
                f"📊 ارزش بازار: {format_toman_persian(est)}\n"
                f"🔥 سود تخمینی: {format_toman_persian(profit)} ({disc}٪ زیر قیمت)\n"
                f"📍 منبع: {source} {city_name}\n"
                f"🔗 مشاهده آگهی: {url}"
            )
            await send_rubika_message(client, chat_id, card)
            await asyncio.sleep(0.3)
    except Exception as e:
        logger.error(f"خطا در دریافت فرصت‌های روبیکا: {e}")
        await send_rubika_message(client, chat_id, "⚠️ خطا در دریافت فرصت‌های خرید.")


async def handle_list_rules(client: httpx.AsyncClient, chat_id: str) -> None:
    try:
        res = await client.get(f"{API_BASE}/rules?chatId={chat_id}&messenger=rubika", timeout=8.0)
        data = res.json()
        rules = data.get("rules", [])
        if not rules:
            empty_msg = (
                "📋 شما هنوز فیلتری تعریف نکرده‌اید!\n\n"
                "برای تعریف فیلتر خودرو، وارد سایت radar.digiral.ir شوید یا از طریق ربات بله اقدام فرمایید."
            )
            await send_rubika_message(client, chat_id, empty_msg)
            return

        lines = ["📋 فیلترهای فعال شما در رادار خودرو:\n"]
        for idx, r in enumerate(rules, 1):
            name = r.get("name", "فیلتر بدون نام")
            max_p = r.get("price_max_toman")
            p_str = f"تا {max_p // 1_000_000} میلیون تومان" if max_p else "بدون سقف قیمت"
            c_name = r.get("city") or "هر دو شهر (مشهد + تربت)"
            lines.append(f"{idx}. 🎯 {name} | 💰 {p_str} | 📍 {c_name}")

        await send_rubika_message(client, chat_id, "\n".join(lines))
    except Exception as e:
        logger.error(f"خطا در دریافت فیلترهای روبیکا: {e}")
        await send_rubika_message(client, chat_id, "⚠️ خطا در دریافت لیست فیلترها.")


async def handle_subscription_status(client: httpx.AsyncClient, chat_id: str) -> None:
    try:
        res = await client.get(f"{API_BASE}/rules?chatId={chat_id}&messenger=rubika", timeout=8.0)
        data = res.json() if res.status_code == 200 else {}
    except Exception:
        data = {}

    plan_name = data.get("planName") or "دوره آزمایشی رایگان (۱۴ روزه)"
    user_city = data.get("userCity") or "تربت‌حیدریه"

    status_text = (
        "💳 وضعیت اشتراک سامانه رادار خودرو:\n\n"
        f"✨ نوع اشتراک: {plan_name}\n"
        f"📍 شهر فعال: {user_city}\n"
        "✅ وضعیت: فعال و در حال دریافت لحظه‌ای آگهی‌ها\n"
        "🚀 سرعت دریافت: کمتر از ۶۰ ثانیه پس از انتشار در دیوار و شیپور\n\n"
        "برای تمدید یا ارتقای اشتراک به سایت radar.digiral.ir مراجعه فرمایید."
    )
    await send_rubika_message(client, chat_id, status_text)


async def handle_rubika_message(client: httpx.AsyncClient, update: dict) -> None:
    new_msg = update.get("new_message", {})
    chat_id = update.get("chat_id")
    text = (new_msg.get("text") or "").strip()

    if not chat_id or not text:
        return

    logger.info(f"پیام جدید در روبیکا از {chat_id}: {text}")

    # ۱. اتصال با کد عددی سایت
    norm_text = normalize_digits(text)
    link_match = re.search(r"\b(\d{4,6})\b", norm_text)
    if not link_match:
        link_match = re.search(r"\b(RADAR-\d+)\b", norm_text, re.IGNORECASE)

    if link_match and not text.startswith("🎯") and not text.startswith("📋") and not text.startswith("💳"):
        code = link_match.group(1).upper()
        try:
            resp = await client.post(
                f"{API_BASE}/link",
                json={
                    "code": code,
                    "chatId": str(chat_id),
                    "messenger": "rubika",
                    "userName": "کاربر روبیکا",
                },
                timeout=6.0,
            )
            data = resp.json()
            if data.get("success"):
                reply = (
                    "🎉 تبریک! حساب کاربری شما با موفقیت به ربات روبیکا متصل شد.\n\n"
                    "🔔 از این پس تمام آگهی‌های شکار خودرو، هشدارهای زیر قیمت و فرصت‌های خرید دیوار و شیپور به این چت ارسال می‌شوند."
                )
            else:
                reply = f"❌ {data.get('message', 'کد اتصال نامعتبر است.')}"
        except Exception as e:
            logger.error(f"خطا در اتصال روبیکا: {e}")
            reply = "⚠️ خطا در ارتباط با سرور سایت. لطفاً بعداً تلاش فرمایید."

        await send_rubika_message(client, chat_id, reply)
        return

    # ۲. دستورات منو
    if "فرصت" in text or text == "/hunt":
        await handle_opportunities(client, chat_id)
        return

    if "فیلتر" in text or text == "/rules":
        await handle_list_rules(client, chat_id)
        return

    if "اشتراک" in text or text == "/plan":
        await handle_subscription_status(client, chat_id)
        return

    if "اتصال" in text or text == "/link":
        help_link = (
            "🔗 نحوه اتصال ربات روبیکا به حساب کاربری سایت:\n\n"
            "۱. وارد سایت radar.digiral.ir شوید.\n"
            "۲. از منوی بالا یا بخش «هشدارهای من»، کد عددی اختصاصی خود را بردارید.\n"
            "۳. فقط همان عدد را اینجا بفرستید تا حسابتان متصل شود."
        )
        await send_rubika_message(client, chat_id, help_link)
        return

    if "راهنما" in text or text == "/help":
        help_msg = (
            "❓ راهنمای سامانه هوشمند رادار خودرو:\n\n"
            "این ربات آگهی‌های خودرو دیوار و شیپور شهرهای تربت‌حیدریه و مشهد را رصد کرده و آگهی‌های زیر قیمت و سودآور را به شما می‌رساند.\n\n"
            "🔹 دستورات سریع:\n"
            "• ارسال کلمه «فرصت» : مشاهده ماشین‌های ارزان امروز\n"
            "• ارسال کلمه «اشتراک» : وضعیت پلن شما\n"
            "• ارسال کلمه «اتصال» : راهنمای اتصال به سایت\n\n"
            "📞 پشتیبانی: ۰۹۹۹۹۲۱۲۲۰۹"
        )
        await send_rubika_message(client, chat_id, help_msg)
        return

    # ۳. پیام خوش‌آمدگویی پیش‌فرض
    welcome = (
        "👋 سلام کاربر گرامی! به ربات رادار هوشمند شکار خودرو خوش آمدید.\n\n"
        "این سامانه آگهی‌های دیوار و شیپور تربت‌حیدریه و مشهد را ثانیه‌ای پایش کرده و فرصت‌های خرید زیر قیمت را فوراً به دست شما می‌رساند.\n\n"
        "📌 برای مشاهده ماشین‌های ارزان قیمت الان، کلمه «فرصت» را بفرستید.\n"
        "📌 برای اتصال به حساب کاربری سایت، کد عددی خود را بفرستید."
    )
    await send_rubika_message(client, chat_id, welcome)


async def run_rubika_polling() -> None:
    logger.info("سرویس شنود هوشمند ربات روبیکا فعال شد...")
    next_offset_id = None

    async with httpx.AsyncClient() as client:
        while True:
            try:
                url = f"https://botapi.rubika.ir/v3/{RUBIKA_TOKEN}/getUpdates"
                payload = {}
                if next_offset_id:
                    payload["offset_id"] = next_offset_id

                resp = await client.post(url, json=payload, timeout=20.0)
                if resp.status_code == 200:
                    data = resp.json()
                    if data.get("status") == "OK":
                        result_data = data.get("data", {})
                        updates = result_data.get("updates", [])
                        next_offset_id = result_data.get("next_offset_id") or next_offset_id

                        for up in updates:
                            if up.get("type") in ("NewMessage", "StartedBot"):
                                await handle_rubika_message(client, up)
            except Exception as e:
                logger.debug(f"خطا در دریافت پیام روبیکا: {e}")
                await asyncio.sleep(2)

            await asyncio.sleep(1.0)


if __name__ == "__main__":
    asyncio.run(run_rubika_polling())
