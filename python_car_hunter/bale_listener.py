"""
سرویس هوشمند پیام‌رسان بله (Bale Bot Engine & Interactive Wizard)
پشتیبانی از:
- ساخت کامل فیلتر و هشدار خودرو مستقیم از داخل بله
- مدیریت و حذف فیلترهای فعال
- مشاهده فوری آخرین فرصت‌های شکار زیر قیمت
- پشتیبانی کامل از دکمه‌های شیشه‌ای (Inline Keyboards) و رفع مشکل دکمه‌ها
- مدیریت اشتراک و تنظیم صدای هشدار
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
API_BASE = "http://127.0.0.1:3000/api/bot"

# منوی اصلی و ثابت پایین صفحه
MAIN_KEYBOARD = {
    "keyboard": [
        [{"text": "➕ تعریف فیلتر خودرو (شکار جدید)"}, {"text": "📋 فیلترهای فعال من"}],
        [{"text": "🎯 آخرین فرصت‌های شکار"}, {"text": "💳 وضعیت اشتراک من"}],
        [{"text": "❓ راهنما و تنظیم صدا"}, {"text": "🔗 اتصال به حساب سایت"}],
    ],
    "resize_keyboard": True,
}

# حافظه موقت برای مراحل ساخت فیلتر (Wizard State)
USER_SESSIONS: dict[str, dict] = {}

CARS_GRID = [
    [{"text": "🚗 پراید", "callback_data": "car:pride"}, {"text": "🚗 پژو ۲۰۶", "callback_data": "car:206"}],
    [{"text": "🚗 پژو پارس", "callback_data": "car:pars"}, {"text": "🚗 پژو ۲۰۷", "callback_data": "car:207"}],
    [{"text": "🚗 دنا", "callback_data": "car:dena"}, {"text": "🚗 تارا", "callback_data": "car:tara"}],
    [{"text": "🚗 کوییک", "callback_data": "car:quick"}, {"text": "🚗 ساینا", "callback_data": "car:saina"}],
    [{"text": "🚗 سمند / سورن", "callback_data": "car:samand"}, {"text": "🚗 شاهین", "callback_data": "car:shahin"}],
    [{"text": "🚗 تیبا", "callback_data": "car:tiba"}, {"text": "🚘 تمام خودروها", "callback_data": "car:all"}],
    [{"text": "❌ انصراف", "callback_data": "cancel_wizard"}],
]

BUDGET_GRID = [
    [{"text": "💰 تا ۲۵۰ میلیون", "callback_data": "budget:250"}, {"text": "💰 تا ۴۰۰ میلیون", "callback_data": "budget:400"}],
    [{"text": "💰 تا ۶۰۰ میلیون", "callback_data": "budget:600"}, {"text": "💰 تا ۹۰۰ میلیون", "callback_data": "budget:900"}],
    [{"text": "💰 تا ۱.۵ میلیارد", "callback_data": "budget:1500"}, {"text": "♾️ بدون سقف بودجه", "callback_data": "budget:0"}],
    [{"text": "❌ انصراف", "callback_data": "cancel_wizard"}],
]

MODE_GRID = [
    [{"text": "🔥 فقط زیر قیمت بازار (سود تضمینی)", "callback_data": "mode:discount"}],
    [{"text": "🔔 تمام آگهی‌های جدید (حتی قیمت عادی)", "callback_data": "mode:all"}],
    [{"text": "❌ انصراف", "callback_data": "cancel_wizard"}],
]

CAR_NAMES = {
    "pride": ("سایپا", "پراید", "پراید"),
    "206": ("ایران خودرو", "206", "پژو ۲۰۶"),
    "pars": ("ایران خودرو", "پارس", "پژو پارس"),
    "207": ("ایران خودرو", "207", "پژو ۲۰۷"),
    "dena": ("ایران خودرو", "دنا", "دنا"),
    "tara": ("ایران خودرو", "تارا", "تارا"),
    "quick": ("سایپا", "کوییک", "کوییک"),
    "saina": ("سایپا", "ساینا", "ساینا"),
    "samand": ("ایران خودرو", "سمند", "سمند و سورن"),
    "shahin": ("سایپا", "شاهین", "شاهین"),
    "tiba": ("سایپا", "تیبا", "تیبا"),
    "all": ("", "", "تمام خودروها"),
}


def normalize_digits(text: str) -> str:
    if not text:
        return ""
    trans = str.maketrans("۰۱۲۳۴۵۶۷۸۹٠١٢٣٤٥٦٧٨٩", "01234567890123456789")
    return text.translate(trans)


def format_toman_persian(amount: int) -> str:
    return f"{amount:,.0f}".replace(",", "٬") + " تومان"


async def send_bale_reply(
    client: httpx.AsyncClient,
    chat_id: int | str,
    text: str,
    reply_markup: dict | None = None,
) -> None:
    url = f"https://tapi.bale.ai/bot{BALE_TOKEN}/sendMessage"
    payload = {
        "chat_id": str(chat_id),
        "text": text,
        "parse_mode": "HTML",
        "reply_markup": reply_markup or MAIN_KEYBOARD,
        "disable_notification": False,
    }
    try:
        await client.post(url, json=payload, timeout=8.0)
    except Exception as e:
        logger.error(f"خطا در ارسال پیام به بله: {e}")


async def answer_bale_callback(
    client: httpx.AsyncClient,
    callback_query_id: str,
    text: str | None = None,
) -> None:
    """پاسخ فوری به کلیک دکمه‌های شیشه‌ای برای جلوگیری از لودینگ بی‌پایان"""
    url = f"https://tapi.bale.ai/bot{BALE_TOKEN}/answerCallbackQuery"
    payload = {"callback_query_id": callback_query_id}
    if text:
        payload["text"] = text
    try:
        await client.post(url, json=payload, timeout=5.0)
    except Exception as e:
        logger.debug(f"خطا در answerCallbackQuery: {e}")


async def handle_list_rules(client: httpx.AsyncClient, chat_id: int | str) -> None:
    try:
        res = await client.get(f"{API_BASE}/rules?chatId={chat_id}&messenger=bale", timeout=8.0)
        data = res.json()
        rules = data.get("rules", [])
        if not rules:
            empty_msg = (
                "📋 <b>شما هنوز هیچ فیلتری تعریف نکرده‌اید!</b>\n\n"
                "برای اینکه آگهی‌های خودرو به محض انتشار برای شما ارسال شوند، روی دکمه زیر بزنید 👇"
            )
            markup = {"inline_keyboard": [[{"text": "➕ تعریف اولین فیلتر خودرو", "callback_data": "start_wizard"}]]}
            await send_bale_reply(client, chat_id, empty_msg, markup)
            return

        lines = ["📋 <b>فیلترهای فعال شما در رادار:</b>\n"]
        inline_buttons = []
        for idx, r in enumerate(rules, 1):
            name = r.get("name", "فیلتر بدون نام")
            rule_id = r.get("id")
            max_p = r.get("price_max_toman")
            p_str = f"تا {max_p // 1_000_000} میلیون تومان" if max_p else "بدون سقف قیمت"
            disc = r.get("min_discount_percent")
            disc_str = f"{disc}٪ زیر قیمت" if disc and disc > 0 else "تمام آگهی‌ها"

            lines.append(f"{idx}. 🎯 <b>{name}</b>")
            lines.append(f"   💰 {p_str}  |  🔥 {disc_str}")

            if rule_id:
                inline_buttons.append([{"text": f"❌ حذف «{name}»", "callback_data": f"del_rule:{rule_id}"}])

        inline_buttons.append([{"text": "➕ افزودن فیلتر جدید", "callback_data": "start_wizard"}])
        lines.append("\nبرای حذف هر فیلتر، روی دکمه مربوط به آن کلیک کنید 👇")

        await send_bale_reply(client, chat_id, "\n".join(lines), {"inline_keyboard": inline_buttons})
    except Exception as e:
        logger.error(f"خطا در دریافت فیلترها: {e}")
        await send_bale_reply(client, chat_id, "⚠️ خطا در دریافت لیست فیلترها. لطفاً دوباره تلاش فرمایید.")


async def handle_opportunities(client: httpx.AsyncClient, chat_id: int | str) -> None:
    try:
        res = await client.get(f"{API_BASE}/opportunities", timeout=10.0)
        data = res.json()
        opps = data.get("opportunities", [])
        if not opps:
            await send_bale_reply(
                client,
                chat_id,
                "🔍 در حال حاضر آگهی با سود بالای ۵٪ ثبت نشده است. به محض ثبت آگهی جدید، ربات به شما اطلاع می‌دهد.",
            )
            return

        await send_bale_reply(client, chat_id, "🎯 <b>بهترین فرصت‌های شکار بازار (تربت‌حیدریه):</b>")

        for item in opps[:4]:
            t = item.get("title", "خودرو")
            p = item.get("priceToman", 0)
            est = item.get("estimatedToman", 0)
            profit = item.get("profitToman", 0)
            disc = item.get("discountPercent", 0)
            url = item.get("url")
            source = "دیوار" if item.get("source") == "divar" else "شیپور"

            card = (
                f"🚗 <b>{t}</b>\n"
                f"💰 قیمت فروشنده: <code>{format_toman_persian(p)}</code>\n"
                f"📊 کارشناسی بازار: <code>{format_toman_persian(est)}</code>\n"
                f"🎁 سود تخمینی: <code>🔥 {format_toman_persian(profit)} ({disc}٪ زیر قیمت)</code>\n"
                f"📍 منبع: {source} تربت‌حیدریه"
            )
            markup = None
            if url:
                markup = {"inline_keyboard": [[{"text": f"🚗 مشاهده آگهی در {source}", "url": url}]]}
            await send_bale_reply(client, chat_id, card, markup)
    except Exception as e:
        logger.error(f"خطا در دریافت فرصت‌ها: {e}")
        await send_bale_reply(client, chat_id, "⚠️ خطا در دریافت فرصت‌های خرید.")


async def handle_subscription_status(client: httpx.AsyncClient, chat_id: int | str) -> None:
    status_text = (
        "💳 <b>وضعیت اشتراک سامانه رادار خودرو:</b>\n\n"
        "✨ <b>نوع اشتراک:</b> دوره آزمایشی رایگان (۱۴ روزه)\n"
        "✅ <b>وضعیت:</b> فعال و در حال دریافت آنی آگهی‌ها\n"
        "🚀 <b>سرعت دریافت پیام:</b> کمتر از ۶۰ ثانیه پس از تایید در دیوار و شیپور\n"
        "🎯 <b>تعداد مجاز فیلترها:</b> نامحدود\n\n"
        "برای تمدید یا ارتقای اشتراک می‌توانید از سایت `radar.digiral.ir` اقدام فرمایید."
    )
    await send_bale_reply(client, chat_id, status_text)


async def handle_sound_and_help(client: httpx.AsyncClient, chat_id: int | str) -> None:
    help_text = (
        "❓ <b>راهنما و نحوه تنظیم صدای اختصاصی برای هشدارهای رادار:</b>\n\n"
        "🔔 <b>چگونه صدای زنگ پیام‌های این ربات را خاص و بلند کنیم؟</b>\n"
        "۱. در همین صفحه چت با ربات، روی <b>نام یا پروفایل ربات</b> در بالای صفحه ضربه بزنید.\n"
        "۲. وارد بخش <b>«اعلان‌ها» (Notifications)</b> شوید.\n"
        "۳. گزینه <b>«صدا» (Sound)</b> را انتخاب کنید و یک زنگ بلند یا صدای رادار/دزدگیر انتخاب کنید.\n"
        "حالا هر بار آگهی جدیدی شکار شود، گوشی شما با صدای زنگ اختصاصی به صدا درمی‌آید!\n\n"
        "🔹 <b>کلیدهای سریع:</b>\n"
        "• <b>تعریف فیلتر:</b> برای انتخاب خودرو و سقف قیمت دلخواه\n"
        "• <b>فیلترهای من:</b> برای مشاهده و حذف فیلترها\n"
        "• <b>آخرین فرصت‌ها:</b> مشاهده ماشین‌های زیر قیمت فعلی\n\n"
        "📞 پشتیبانی تلگرام و بله: ۰۹۹۹۹۲۱۲۲۰۹"
    )
    await send_bale_reply(client, chat_id, help_text)


async def handle_bale_callback(client: httpx.AsyncClient, cb: dict) -> None:
    cb_id = cb.get("id")
    data = cb.get("data") or ""
    msg = cb.get("message", {})
    chat_id = msg.get("chat", {}).get("id")
    user_info = cb.get("from", {})
    user_name = user_info.get("first_name", "") + " " + user_info.get("last_name", "")
    user_name = user_name.strip() or "کاربر رادار"

    if not chat_id or not cb_id:
        return

    # پاسخ فوری برای رفع حالت لودینگ
    await answer_bale_callback(client, cb_id)

    # لغو فرآیند
    if data == "cancel_wizard":
        USER_SESSIONS.pop(str(chat_id), None)
        await send_bale_reply(client, chat_id, "عملیات لغو شد. منوی اصلی در دسترس شماست.", MAIN_KEYBOARD)
        return

    # باز کردن منوی فیلترها
    if data in ("menu_rules", "view_rules"):
        await handle_list_rules(client, chat_id)
        return

    # حذف یک فیلتر خاص
    if data.startswith("del_rule:"):
        rule_id = data.split(":", 1)[1]
        try:
            res = await client.request(
                "DELETE",
                f"{API_BASE}/rules",
                json={"chatId": str(chat_id), "messenger": "bale", "ruleId": rule_id},
                timeout=8.0,
            )
            r_data = res.json()
            if r_data.get("ok"):
                await send_bale_reply(client, chat_id, "✅ فیلتر مورد نظر با موفقیت حذف شد.")
                await handle_list_rules(client, chat_id)
            else:
                await send_bale_reply(client, chat_id, f"❌ خطا: {r_data.get('message', 'خطا در حذف')}")
        except Exception as e:
            logger.error(f"خطا در حذف قانون: {e}")
            await send_bale_reply(client, chat_id, "⚠️ خطا در حذف فیلتر.")
        return

    # شروع فرآیند ساخت فیلتر
    if data == "start_wizard":
        USER_SESSIONS[str(chat_id)] = {"step": "car"}
        prompt = "🚗 <b>مرحله اول:</b> لطفاً خودروی مورد نظرتان را برای پایش انتخاب کنید:"
        await send_bale_reply(client, chat_id, prompt, {"inline_keyboard": CARS_GRID})
        return

    # مرحله ۱: انتخاب خودرو
    if data.startswith("car:"):
        car_code = data.split(":", 1)[1]
        make, model, fa_name = CAR_NAMES.get(car_code, ("", "", "خودرو دلخواه"))
        USER_SESSIONS[str(chat_id)] = {
            "step": "budget",
            "make": make,
            "model": model,
            "fa_name": fa_name,
        }
        prompt = (
            f"✅ خودروی انتخابی: <b>{fa_name}</b>\n\n"
            f"💰 <b>مرحله دوم:</b> حداکثر سقف بودجه خرید خود را مشخص کنید:"
        )
        await send_bale_reply(client, chat_id, prompt, {"inline_keyboard": BUDGET_GRID})
        return

    # مرحله ۲: انتخاب بودجه
    if data.startswith("budget:"):
        session = USER_SESSIONS.get(str(chat_id))
        if not session:
            await send_bale_reply(client, chat_id, "لطفاً مجدداً از منو روی «تعریف فیلتر خودرو» کلیک فرمایید.")
            return

        budget_m = int(data.split(":", 1)[1])
        session["budget_max_toman"] = budget_m * 1_000_000 if budget_m > 0 else None
        session["step"] = "mode"

        b_text = f"{budget_m} میلیون تومان" if budget_m > 0 else "بدون سقف قیمت"
        prompt = (
            f"🚗 خودرو: <b>{session.get('fa_name')}</b>\n"
            f"💰 سقف بودجه: <b>{b_text}</b>\n\n"
            f"🎯 <b>مرحله سوم:</b> مایلید چه آگهی‌هایی به شما پیام داده شوند؟"
        )
        await send_bale_reply(client, chat_id, prompt, {"inline_keyboard": MODE_GRID})
        return

    # مرحله ۳: انتخاب نوع فرصت و ثبت نهایی
    if data.startswith("mode:"):
        session = USER_SESSIONS.pop(str(chat_id), None)
        if not session:
            await send_bale_reply(client, chat_id, "جلسه منقضی شد. لطفاً دوباره دکمه تعریف فیلتر را بزنید.")
            return

        mode = data.split(":", 1)[1]
        is_discount_only = mode == "discount"
        min_discount_percent = 5 if is_discount_only else 0

        fa_name = session.get("fa_name", "خودرو")
        b_max = session.get("budget_max_toman")
        b_str = f"تا {b_max // 1_000_000} میلیون" if b_max else "بدون سقف"
        mode_str = "زیر قیمت" if is_discount_only else "همه آگهی‌ها"
        rule_name = f"{fa_name} {b_str} ({mode_str})"

        payload = {
            "chatId": str(chat_id),
            "messenger": "bale",
            "userName": user_name,
            "rule": {
                "name": rule_name,
                "make": session.get("make") or None,
                "model": session.get("model") or None,
                "price_max_toman": b_max,
                "min_discount_percent": min_discount_percent,
            },
        }

        try:
            res = await client.post(f"{API_BASE}/rules", json=payload, timeout=10.0)
            data = res.json()
            if data.get("ok"):
                success_text = (
                    f"🎉 <b>فیلتر جدید با موفقیت فعال شد!</b>\n\n"
                    f"🎯 <b>عنوان فیلتر:</b> «{rule_name}»\n"
                    f"🚗 <b>خودرو:</b> {fa_name}\n"
                    f"💰 <b>سقف قیمت:</b> {b_str}\n"
                    f"🔥 <b>نوع آگهی:</b> {mode_str}\n"
                    f"📍 <b>شهر:</b> تربت‌حیدریه (دیوار و شیپور)\n\n"
                    f"⚡ از همین حالا، به محض اینکه آگهی با این مشخصات ثبت شود، با زنگ هشدار برای شما ارسال خواهد شد."
                )
                markup = {"inline_keyboard": [[{"text": "📋 مشاهده همه فیلترهای من", "callback_data": "menu_rules"}]]}
                await send_bale_reply(client, chat_id, success_text, markup)
            else:
                await send_bale_reply(client, chat_id, f"❌ خطا در ایجاد فیلتر: {data.get('message')}")
        except Exception as e:
            logger.error(f"خطا در ثبت نهایی فیلتر: {e}")
            await send_bale_reply(client, chat_id, "⚠️ خطا در ارتباط با سرور. لطفاً دقایقی بعد تلاش کنید.")


async def handle_bale_message(client: httpx.AsyncClient, message: dict) -> None:
    chat_id = message.get("chat", {}).get("id")
    text = (message.get("text") or "").strip()
    user_info = message.get("from", {})
    user_name = user_info.get("first_name", "") + " " + user_info.get("last_name", "")
    user_name = user_name.strip() or "کاربر رادار"

    if not chat_id or not text:
        return

    # ۱. اتصال با کد عددی اختصاصی سایت
    norm_text = normalize_digits(text)
    link_match = re.search(r"\b(\d{4,6})\b", norm_text)
    if not link_match:
        link_match = re.search(r"\b(RADAR-\d+)\b", norm_text, re.IGNORECASE)

    if link_match and not text.startswith("➕") and not text.startswith("📋") and not text.startswith("💰"):
        code = link_match.group(1).upper()
        try:
            resp = await client.post(
                f"{API_BASE}/link",
                json={
                    "code": code,
                    "chatId": str(chat_id),
                    "messenger": "bale",
                    "userName": user_name,
                },
                timeout=6.0,
            )
            data = resp.json()
            if data.get("success"):
                reply = (
                    f"🎉 <b>تبریک! حساب کاربری شما با موفقیت متصل شد.</b>\n\n"
                    f"👤 نام کاربر: <b>{user_name}</b>\n"
                    f"📍 شهر تحت پایش: <b>تربت‌حیدریه</b>\n\n"
                    f"🔔 تمام هشدارهای اختصاصی و فیلترهای تعریف‌شده در سایت فوراً به این چت ارسال می‌شوند."
                )
            else:
                reply = f"❌ {data.get('message', 'کد اتصال نامعتبر است.')}"
        except Exception as e:
            logger.error(f"خطا در اتصال بله: {e}")
            reply = "⚠️ خطا در ارتباط با سرور سایت. لطفاً بعداً تلاش فرمایید."

        await send_bale_reply(client, chat_id, reply)
        return

    # ۲. دکمه «➕ تعریف فیلتر خودرو (شکار جدید)»
    if text in ("➕ تعریف فیلتر خودرو (شکار جدید)", "/new", "تعریف فیلتر"):
        USER_SESSIONS[str(chat_id)] = {"step": "car"}
        prompt = (
            "🎯 <b>تعریف فیلتر هوشمند رادار خودرو:</b>\n\n"
            "خودروی مورد نظرتان را برای دریافت هشدار انتخاب کنید 👇"
        )
        await send_bale_reply(client, chat_id, prompt, {"inline_keyboard": CARS_GRID})
        return

    # ۳. دکمه «📋 فیلترهای فعال من»
    if text in ("📋 فیلترهای فعال من", "/rules", "فیلترها"):
        await handle_list_rules(client, chat_id)
        return

    # ۴. دکمه «🎯 آخرین فرصت‌های شکار»
    if text in ("🎯 آخرین فرصت‌های شکار", "/hunt", "فرصت ها"):
        await handle_opportunities(client, chat_id)
        return

    # ۵. دکمه «💳 وضعیت اشتراک من»
    if text in ("💳 وضعیت اشتراک من", "/plan", "اشتراک"):
        await handle_subscription_status(client, chat_id)
        return

    # ۶. دکمه «❓ راهنما و تنظیم صدا»
    if text in ("❓ راهنما و تنظیم صدا", "/help", "راهنما"):
        await handle_sound_and_help(client, chat_id)
        return

    # ۷. دکمه «🔗 اتصال به حساب سایت»
    if text in ("🔗 اتصال به حساب سایت", "/link", "اتصال"):
        help_link = (
            "🔗 <b>اتصال ربات به حساب سایت:</b>\n\n"
            "۱. وارد سایت `radar.digiral.ir` شوید.\n"
            "۲. در بخش هشدارهای من، <b>کد عددی اختصاصی</b> خود را کپی کنید.\n"
            "۳. فقط همان عدد را اینجا بفرستید تا حساب کاربری شما متصل شود.\n\n"
            "💡 اگر بدون ثبت‌نام در سایت هم از دکمه «تعریف فیلتر» استفاده کنید، به صورت خودکار یک اشتراک ۱۴ روزه رایگان برای شما فعال خواهد شد!"
        )
        await send_bale_reply(client, chat_id, help_link)
        return

    # پیام پیش‌فرض شروع یا متفرقه
    welcome = (
        f"👋 <b>سلام {user_name} عزیز! به سامانه رادار هوشمند خودرو خوش آمدید.</b>\n\n"
        "این سامانه آگهی‌های خودرو دیوار و شیپور تربت‌حیدریه را لحظه‌به‌لحظه رصد کرده و آگهی‌های زیر قیمت و شکار را فوراً به شما می‌رساند.\n\n"
        "👇 <b>برای شروع از دکمه‌های زیر استفاده کنید:</b>"
    )
    await send_bale_reply(client, chat_id, welcome)


async def run_bale_polling() -> None:
    if not BALE_TOKEN:
        logger.warning("توکن بله تنظیم نشده است.")
        return

    logger.info("سرویس شنود پیشرفته بله با پشتیبانی از دکمه‌های شیشه‌ای و ساخت فیلتر فعال شد...")
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

                        # ۱. پردازش کلیک دکمه‌های شیشه‌ای (Callback Queries)
                        cb = up.get("callback_query")
                        if cb:
                            await handle_bale_callback(client, cb)
                            continue

                        # ۲. پردازش پیام‌های متنی و دکمه‌های منو
                        msg = up.get("message")
                        if msg:
                            await handle_bale_message(client, msg)
            except Exception as e:
                logger.debug(f"خطا در دریافت پیام بله: {e}")
                await asyncio.sleep(2)

            await asyncio.sleep(0.5)


if __name__ == "__main__":
    asyncio.run(run_bale_polling())
