"""
سرویس هوشمند پیام‌رسان بله (Bale Bot Engine & Interactive Wizard)
پشتیبانی از:
- ساخت کامل فیلتر و هشدار خودرو مستقیم از داخل بله
- انتخاب هوشمند شهر (تربت‌حیدریه / مشهد / هر دو شهر در پلن Pro)
- قفل شهر بر روی شهر انتخابی در پلن آزمایشی و پایه
- فیلتر فرصت‌های شکار بر اساس شهر
- مدیریت و حذف فیلترهای فعال
- مشاهده فوری آخرین فرصت‌های شکار زیر قیمت
- پشتیبانی کامل از دکمه‌های شیشه‌ای (Inline Keyboards)
- مدیریت اشتراک و تنظیم صدای هشدار
"""

from __future__ import annotations

import asyncio
import logging
import re
import httpx

import config as config_module

logging.basicConfig(
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    level=logging.INFO,
)
# httpx INFO logs the full request URL, which embeds the bot token.
logging.getLogger("httpx").setLevel(logging.WARNING)
logging.getLogger("httpcore").setLevel(logging.WARNING)
logger = logging.getLogger(__name__)

API_BASE = "http://127.0.0.1:3000/api/bot"


def current_bale_token() -> str:
    """توکن جاری بله. هر بار از تنظیمات خوانده می‌شود تا خالی بودن یا تعویض env قابل تشخیص باشد."""
    return config_module.config.BALE_BOT_TOKEN or ""


def bale_method_url(method: str) -> str | None:
    token = current_bale_token()
    if not token:
        return None
    return f"https://tapi.bale.ai/bot{token}/{method}"

# منوی کاربران متصل‌نشده به سایت
GUEST_KEYBOARD = {
    "keyboard": [
        [{"text": "🔗 راهنمای اتصال با کد سایت"}],
        [{"text": "❓ راهنما و پشتیبانی"}],
    ],
    "resize_keyboard": True,
}

# منوی کاربران با اشتراک منقضی‌شده
EXPIRED_KEYBOARD = {
    "keyboard": [
        [{"text": "💳 تمدید اشتراک در سایت"}, {"text": "🔗 اتصال مجدد"}],
        [{"text": "❓ راهنما و پشتیبانی"}],
    ],
    "resize_keyboard": True,
}

# منوی اصلی و ثابت پایین صفحه برای کاربران فعال
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

CITY_GRID = [
    [{"text": "🏙️ تربت‌حیدریه", "callback_data": "city:تربت‌حیدریه"}, {"text": "🏙️ مشهد", "callback_data": "city:مشهد"}],
    [{"text": "🌐 هر دو شهر (مشهد + تربت)", "callback_data": "city:all"}],
    [{"text": "❌ انصراف", "callback_data": "cancel_wizard"}],
]

CARS_GRID = [
    [{"text": "🚗 پراید", "callback_data": "car:pride"}, {"text": "🚗 پژو ۲۰۶", "callback_data": "car:206"}],
    [{"text": "🚗 پژو پارس", "callback_data": "car:pars"}, {"text": "🚗 پژو ۲۰۷", "callback_data": "car:207"}],
    [{"text": "🚗 پژو ۴۰۵", "callback_data": "car:405"}, {"text": "🚗 سمند / سورن", "callback_data": "car:samand"}],
    [{"text": "🚗 دنا", "callback_data": "car:dena"}, {"text": "🚗 تارا", "callback_data": "car:tara"}],
    [{"text": "🚗 کوییک", "callback_data": "car:quick"}, {"text": "🚗 ساینا", "callback_data": "car:saina"}],
    [{"text": "🚗 تیبا", "callback_data": "car:tiba"}, {"text": "🚗 رانا", "callback_data": "car:ranah"}],
    [{"text": "🚗 شاهین", "callback_data": "car:shahin"}, {"text": "🚗 هایما", "callback_data": "car:haima"}],
    [{"text": "🚗 جک (JAC)", "callback_data": "car:jac"}, {"text": "🚗 ام‌وی‌ام / فونیکس", "callback_data": "car:mvm"}],
    [{"text": "🚘 تمام خودروها (همه مدل‌ها)", "callback_data": "car:all"}],
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

# make is the value listings store (model family), not the manufacturer label.
CAR_NAMES = {
    "pride": ("پراید", "پراید", "پراید"),
    "206": ("پژو", "206", "پژو ۲۰۶"),
    "pars": ("پژو", "پارس", "پژو پارس"),
    "207": ("پژو", "207", "پژو ۲۰۷"),
    "405": ("پژو", "405", "پژو ۴۰۵"),
    "dena": ("دنا", "دنا", "دنا"),
    "tara": ("تارا", "تارا", "تارا"),
    "quick": ("کوییک", "کوییک", "کوییک"),
    "saina": ("ساینا", "ساینا", "ساینا"),
    "samand": ("سمند", "سمند", "سمند و سورن"),
    "shahin": ("شاهین", "شاهین", "شاهین"),
    "tiba": ("تیبا", "تیبا", "تیبا"),
    "ranah": ("رانا", "رانا", "رانا"),
    "haima": ("هایما", "هایما", "هایما"),
    "jac": ("جک", "جک", "جک (JAC)"),
    "mvm": ("ام‌وی‌ام", "ام وی ام", "ام‌وی‌ام / فونیکس"),
    "all": ("", "", "تمام خودروها"),
}


def normalize_digits(text: str) -> str:
    if not text:
        return ""
    trans = str.maketrans("۰۱۲۳۴۵۶۷۸۹٠١٢٣٤٥٦٧٨٩", "01234567890123456789")
    return text.translate(trans)


def _fa_int(n: int) -> str:
    return str(n).translate(str.maketrans("0123456789", "۰۱۲۳۴۵۶۷۸۹"))


def format_toman_persian(amount: int | float | None) -> str:
    """قیمت به حروف فارسی، هم‌تراز با formatTomanReadable در وب‌سایت."""
    if amount is None:
        return "—"
    try:
        toman = int(round(float(amount)))
    except (TypeError, ValueError):
        return "—"
    if toman == 0:
        return "۰ تومان"

    sign = "منفی " if toman < 0 else ""
    abs_v = abs(toman)
    billions, rem = divmod(abs_v, 1_000_000_000)
    millions, rem = divmod(rem, 1_000_000)
    thousands, _rest = divmod(rem, 1_000)

    parts: list[str] = []
    if billions:
        parts.append(f"{_fa_int(billions)} میلیارد")
    if millions:
        parts.append(f"{_fa_int(millions)} میلیون")
    if thousands and (billions == 0 or millions == 0):
        parts.append(f"{_fa_int(thousands)} هزار")
    if not parts:
        return f"{sign}{_fa_int(abs_v)} تومان"
    return sign + " و ".join(parts) + " تومان"


def extract_link_token(text: str) -> str | None:
    """فقط وقتی کل پیام یک کد، شماره، ایمیل یا RADAR-… است آن را کد اتصال حساب می‌کند.

    جملهٔ معمولی که سال ساخت یا عدد دیگری داخلش است (مثل «مدل ۱۴۰۲») نباید به‌عنوان کد اتصال بلعیده شود.
    """
    norm = normalize_digits(text).strip()
    if not norm:
        return None
    if re.fullmatch(r"09\d{9}|9\d{9}", norm):
        return norm
    if re.fullmatch(r"\d{4,6}", norm):
        return norm
    radar = re.fullmatch(r"(RADAR-\d+)", norm, re.IGNORECASE)
    if radar:
        return radar.group(1)
    if re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", norm):
        return norm
    labeled = re.fullmatch(r"(?:کد|code)\s*[:：]?\s*(\d{4,6})", norm, re.IGNORECASE)
    if labeled:
        return labeled.group(1)
    return None


async def send_bale_reply(
    client: httpx.AsyncClient,
    chat_id: int | str,
    text: str,
    reply_markup: dict | None = None,
) -> bool:
    url = bale_method_url("sendMessage")
    if not url:
        logger.error("توکن بله تنظیم نشده است؛ پیام ارسال نشد.")
        return False
    payload = {
        "chat_id": str(chat_id),
        "text": text,
        "parse_mode": "HTML",
        "reply_markup": reply_markup or MAIN_KEYBOARD,
        "disable_notification": False,
    }
    try:
        resp = await client.post(url, json=payload, timeout=8.0)
        if resp.status_code != 200:
            logger.error("ارسال پیام بله ناموفق بود (وضعیت %s).", resp.status_code)
            return False
        try:
            body = resp.json()
        except Exception:
            return True
        if isinstance(body, dict) and body.get("ok") is False:
            logger.error("ارسال پیام بله ناموفق بود (پاسخ ok=false).")
            return False
        return True
    except Exception as e:
        logger.error("خطا در ارسال پیام به بله (%s).", type(e).__name__)
        return False


# 2079437548 was a one-digit typo of a real chat and is not listed. Do not guess the missing digit.
ADMIN_BALE_CHATS = ("772511114", "1271663233")
ADMIN_USER_ID = "97375339-be50-403e-be7b-0aee1b7c2d99"


def is_admin_chat(chat_id: int | str) -> bool:
    return str(chat_id) in ADMIN_BALE_CHATS


def admin_access() -> dict:
    return {
        "ok": True,
        "registered": True,
        "hasAccess": True,
        "planExpired": False,
        "error": False,
        "userId": ADMIN_USER_ID,
        "userCity": "تربت‌حیدریه",
        "allowedCitiesCount": 2,
        "planName": "مدیر کل سامانه (VIP)",
    }


async def check_user_access(client: httpx.AsyncClient, chat_id: int | str) -> dict:
    """بررسی وضعیت عضویت و اشتراک کاربر در سامانه"""
    cid_str = str(chat_id)
    if is_admin_chat(cid_str):
        return admin_access()
    try:
        res = await client.get(f"{API_BASE}/rules?chatId={cid_str}&messenger=bale", timeout=6.0)
        if res.status_code == 200:
            data = res.json()
            if isinstance(data, dict):
                data.setdefault("error", False)
                return data
        logger.error("بررسی دسترسی بله ناموفق بود (وضعیت %s).", res.status_code)
        return {"registered": False, "hasAccess": False, "error": True}
    except Exception as e:
        logger.error("خطا در بررسی دسترسی کاربر (%s).", type(e).__name__)
        return {"registered": False, "hasAccess": False, "error": True}


SERVER_DOWN_TEXT = "⚠️ خطا در ارتباط با سرور سایت. لطفاً چند لحظه بعد دوباره تلاش کنید."


async def ensure_bot_access(
    client: httpx.AsyncClient,
    chat_id: int | str,
    user_name: str,
) -> dict | None:
    """اگر کاربر اجازهٔ ادامه دارد مشخصاتش را برمی‌گرداند؛ وگرنه پاسخ مناسب می‌فرستد."""
    access = await check_user_access(client, chat_id)
    if access.get("error"):
        await send_bale_reply(client, chat_id, SERVER_DOWN_TEXT, GUEST_KEYBOARD)
        return None
    if not access.get("registered"):
        await send_registration_prompt(client, chat_id, user_name)
        return None
    if access.get("planExpired"):
        await send_expired_prompt(client, chat_id, access.get("planName", "آزمایشی"))
        return None
    return access


def to_latin_digits(text: str) -> str:
    """تبدیل تمام ارقام فارسی به انگلیسی"""
    p2e = {"۰": "0", "۱": "1", "۲": "2", "۳": "3", "۴": "4", "۵": "5", "۶": "6", "۷": "7", "۸": "8", "۹": "9"}
    return "".join(p2e.get(c, c) for c in text)


async def send_registration_prompt(
    client: httpx.AsyncClient, chat_id: int | str, user_name: str
) -> None:
    """ارسال راهنمای اتصال با کد ۶ رقمی سایت برای کاربران متصل‌نشده"""
    text = (
        f"👋 <b>سلام {user_name} عزیز! به ربات رادار خودرو خوش آمدید 🚗✨</b>\n\n"
        f"این ربات آگهی‌های خودرو در دیوار و شیپور (تربت‌حیدریه و مشهد) را به صورت لحظه‌ای رصد کرده و آگهی‌های <b>زیر قیمت بازار</b> را بلافاصله برای شما شکار می‌کند.\n\n"
        f"🔐 <b>نحوه فعال‌سازی و اتصال ربات به حساب سایت:</b>\n"
        f"۱. ابتدا وارد سایت <b>https://radar.digiral.ir</b> شوید.\n"
        f"۲. از منوی کاربری وارد بخش <b>«تنظیمات هشدار»</b> شوید.\n"
        f"۳. <b>کد ۶ رقمی</b> اختصاصی خود را بردارید و در همین چت ارسال نمایید.\n\n"
        f"<i>(به محض ارسال کد، تمام دکمه‌ها و هشدارهای ربات فوراً برای شما فعال می‌گردند)</i>"
    )
    markup = {
        "inline_keyboard": [
            [{"text": "🌐 دریافت کد از بخش تنظیمات هشدار در سایت", "url": "https://radar.digiral.ir/settings/alerts"}],
        ]
    }
    await send_bale_reply(client, chat_id, text, GUEST_KEYBOARD)
    await send_bale_reply(client, chat_id, "👇 برای دریافت کد روی لینک زیر بزنید و سپس کد را اینجا بفرستید:", markup)


async def send_expired_prompt(
    client: httpx.AsyncClient, chat_id: int | str, plan_name: str = "آزمایشی"
) -> None:
    """ارسال اخطار اتمام اشتراک و درخواست تمدید"""
    text = (
        f"⚠️ <b>اشتراک سامانه رادار شما به پایان رسیده است!</b>\n\n"
        f"نوع پلن قبلی: <b>{plan_name}</b>\n\n"
        f"برای ادامه دریافت هشدارهای لحظه‌ای خودروهای زیر قیمت و استفاده از ربات، لطفاً اشتراک خود را تمدید فرمایید:\n\n"
        f"💳 <b>تمدید آنلاین در سایت:</b>\n"
        f"https://radar.digiral.ir/settings/billing"
    )
    markup = {
        "inline_keyboard": [
            [{"text": "💳 تمدید یا ارتقای اشتراک در سایت", "url": "https://radar.digiral.ir/settings/billing"}],
        ]
    }
    await send_bale_reply(client, chat_id, text, EXPIRED_KEYBOARD)
    await send_bale_reply(client, chat_id, "برای تمدید اشتراک روی دکمه زیر بزنید 👇", markup)


async def answer_bale_callback(
    client: httpx.AsyncClient,
    callback_query_id: str,
    text: str | None = None,
) -> None:
    """پاسخ فوری به کلیک دکمه‌های شیشه‌ای برای جلوگیری از لودینگ بی‌پایان"""
    url = bale_method_url("answerCallbackQuery")
    if not url:
        logger.error("توکن بله تنظیم نشده است؛ پاسخ دکمه ارسال نشد.")
        return
    payload = {"callback_query_id": callback_query_id}
    if text:
        payload["text"] = text
    try:
        resp = await client.post(url, json=payload, timeout=1.5)
        if resp.status_code != 200:
            logger.error("answerCallbackQuery ناموفق بود (وضعیت %s).", resp.status_code)
    except Exception as e:
        logger.debug("خطا در answerCallbackQuery (%s).", type(e).__name__)


async def start_wizard_flow(client: httpx.AsyncClient, chat_id: int | str, user_name: str) -> None:
    """شروع فرآیند هوشمند ساخت فیلتر با رعایت سهمیه شهر کاربر"""
    try:
        res = await client.get(f"{API_BASE}/rules?chatId={chat_id}&messenger=bale", timeout=8.0)
        user_data = res.json() if res.status_code == 200 else {}
        if not isinstance(user_data, dict):
            user_data = {}
    except Exception:
        user_data = {}

    if is_admin_chat(chat_id) and not user_data.get("allowedCitiesCount"):
        user_data = admin_access()

    allowed_cities = user_data.get("allowedCitiesCount", 1)
    user_city = user_data.get("userCity") or "تربت‌حیدریه"
    plan_name = user_data.get("planName") or "آزمایشی"

    if allowed_cities >= 2:
        USER_SESSIONS[str(chat_id)] = {
            "step": "city",
            "allowedCitiesCount": allowed_cities,
            "userCity": user_city,
            "userName": user_name,
        }
        prompt = (
            f"🎯 <b>تعریف فیلتر هوشمند رادار خودرو:</b>\n"
            f"⭐️ پلن شما: <b>{plan_name}</b> (دسترسی همزمان به ۲ شهر)\n\n"
            f"🏙️ <b>مرحله اول:</b> لطفاً شهر یا محدوده پایش این فیلتر را مشخص کنید:"
        )
        await send_bale_reply(client, chat_id, prompt, {"inline_keyboard": CITY_GRID})
    else:
        USER_SESSIONS[str(chat_id)] = {
            "step": "car",
            "city": user_city,
            "city_name": user_city,
            "allowedCitiesCount": 1,
            "userCity": user_city,
            "userName": user_name,
        }
        prompt = (
            f"🎯 <b>تعریف فیلتر هوشمند رادار خودرو:</b>\n"
            f"🏙️ <b>شهر تحت پایش:</b> <b>{user_city}</b> <i>(قفل در پلن {plan_name})</i>\n\n"
            f"🚗 <b>مرحله اول:</b> لطفاً خودروی مورد نظرتان را برای پایش انتخاب کنید:"
        )
        await send_bale_reply(client, chat_id, prompt, {"inline_keyboard": CARS_GRID})


async def handle_list_rules(client: httpx.AsyncClient, chat_id: int | str) -> None:
    try:
        res = await client.get(f"{API_BASE}/rules?chatId={chat_id}&messenger=bale", timeout=8.0)
        if res.status_code != 200:
            await send_bale_reply(client, chat_id, "⚠️ خطا در دریافت لیست فیلترها. لطفاً دوباره تلاش فرمایید.")
            return
        data = res.json()
        if not isinstance(data, dict) or not data.get("ok"):
            await send_bale_reply(client, chat_id, "⚠️ خطا در دریافت لیست فیلترها. لطفاً دوباره تلاش فرمایید.")
            return
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
            c_name = r.get("city") or "هر دو شهر (مشهد + تربت)"

            lines.append(f"{idx}. 🎯 <b>{name}</b>")
            lines.append(f"   💰 {p_str}  |  🔥 {disc_str}  |  📍 {c_name}")

            if rule_id:
                inline_buttons.append([{"text": f"❌ حذف «{name}»", "callback_data": f"del_rule:{rule_id}"}])

        inline_buttons.append([{"text": "➕ افزودن فیلتر جدید", "callback_data": "start_wizard"}])
        lines.append("\nبرای حذف هر فیلتر، روی دکمه مربوط به آن کلیک کنید 👇")

        await send_bale_reply(client, chat_id, "\n".join(lines), {"inline_keyboard": inline_buttons})
    except Exception as e:
        logger.error(f"خطا در دریافت فیلترها: {e}")
        await send_bale_reply(client, chat_id, "⚠️ خطا در دریافت لیست فیلترها. لطفاً دوباره تلاش فرمایید.")


async def handle_opportunities(
    client: httpx.AsyncClient, chat_id: int | str, city_filter: str | None = None
) -> None:
    try:
        # دریافت اطلاعات شهر کاربر و پلن
        u_res = await client.get(f"{API_BASE}/rules?chatId={chat_id}&messenger=bale", timeout=8.0)
        user_data = u_res.json() if u_res.status_code == 200 else {}
        if not isinstance(user_data, dict):
            user_data = {}
        if is_admin_chat(chat_id) and "allowedCitiesCount" not in user_data:
            user_data = admin_access()
        allowed_cities = user_data.get("allowedCitiesCount", 1)
        user_city = user_data.get("userCity") or "تربت‌حیدریه"

        effective_city = city_filter
        if allowed_cities == 1:
            effective_city = user_city

        url = f"{API_BASE}/opportunities"
        if effective_city and effective_city != "all":
            url += f"?city={effective_city}"

        res = await client.get(url, timeout=10.0)
        data = res.json()
        opps = data.get("opportunities", [])

        title_city = f"({effective_city})" if effective_city and effective_city != "all" else "(همه شهرها)"
        if not opps:
            await send_bale_reply(
                client,
                chat_id,
                f"🔍 در حال حاضر آگهی با سود بالا در {title_city} ثبت نشده است. به محض ثبت آگهی جدید، ربات به شما اطلاع می‌دهد.",
            )
            return

        # اگر کاربر دسترسی دو شهر دارد، دکمه‌های فیلتر شهر نشان داده شود
        filter_markup = None
        if allowed_cities >= 2:
            filter_markup = {
                "inline_keyboard": [
                    [
                        {"text": "🏙️ فقط تربت‌حیدریه", "callback_data": "opp:torbat"},
                        {"text": "🏙️ فقط مشهد", "callback_data": "opp:mashhad"},
                    ],
                    [{"text": "🌐 همه فرصت‌ها (مشهد + تربت)", "callback_data": "opp:all"}],
                ]
            }

        await send_bale_reply(
            client,
            chat_id,
            f"🎯 <b>بهترین فرصت‌های شکار بازار {title_city}:</b>",
            filter_markup,
        )

        for item in opps[:4]:
            t = item.get("title", "خودرو")
            p = item.get("priceToman", 0)
            est = item.get("estimatedToman", 0)
            profit = item.get("profitToman", 0)
            disc = item.get("discountPercent", 0)
            url = item.get("url")
            item_city = item.get("city") or "تربت‌حیدریه"
            city_name = "مشهد" if "مشهد" in item_city else "تربت‌حیدریه"
            source = "دیوار" if item.get("source") == "divar" else "شیپور"

            card = (
                f"🚘 <b>خودرو:</b> ❮❮ <b>{t}</b> ❯❯\n\n"
                f"╭─────────────────────────╮\n"
                f"│ 💰 <b>قیمت فروشنده:</b> <b>« {format_toman_persian(p)} »</b>\n"
                f"╰─────────────────────────╯\n"
                f"📊 <b>ارزش کارشناسی بازار:</b> <code>{format_toman_persian(est)}</code>\n"
                f"🎁 <b>سود خالص شکار:</b> <code>🔥 {format_toman_persian(profit)} ({disc}٪ زیر قیمت)</code>\n"
                f"📍 <b>منبع:</b> {source} {city_name}"
            )
            markup = None
            if url:
                markup = {"inline_keyboard": [[{"text": f"🚗 مشاهده آگهی در {source}", "url": url}]]}
            await send_bale_reply(client, chat_id, card, markup)
    except Exception as e:
        logger.error(f"خطا در دریافت فرصت‌ها: {e}")
        await send_bale_reply(client, chat_id, "⚠️ خطا در دریافت فرصت‌های خرید.")


async def handle_subscription_status(client: httpx.AsyncClient, chat_id: int | str) -> None:
    try:
        res = await client.get(f"{API_BASE}/rules?chatId={chat_id}&messenger=bale", timeout=8.0)
        data = res.json() if res.status_code == 200 else {}
        if not isinstance(data, dict):
            data = {}
    except Exception:
        data = {}

    if is_admin_chat(chat_id) and not data.get("planName"):
        data = admin_access()

    plan_name = data.get("planName") or "دوره آزمایشی رایگان (۱۴ روزه)"
    allowed_cities = data.get("allowedCitiesCount", 1)
    user_city = data.get("userCity") or "تربت‌حیدریه"

    if allowed_cities >= 2:
        city_status = (
            "🏙️ <b>شهرهای تحت پوشش:</b> مشهد و تربت‌حیدریه (پایش همزمان ۲ شهر)\n"
            "✅ <b>دسترسی:</b> کامل به تمام آگهی‌های دیوار و شیپور هر دو شهر"
        )
    else:
        city_status = (
            f"🏙️ <b>شهر فعال شما:</b> <b>{user_city}</b> <i>(قفل‌شده در این پلن)</i>\n"
            f"⚡ <b>قابلیت ویژه پلن پرطرفدار (Pro):</b> رصد همزمان شهرهای مشهد + تربت‌حیدریه"
        )

    status_text = (
        "💳 <b>وضعیت اشتراک سامانه رادار خودرو:</b>\n\n"
        f"✨ <b>نوع اشتراک:</b> {plan_name}\n"
        f"✅ <b>وضعیت:</b> فعال و در حال دریافت آنی آگهی‌ها\n"
        f"{city_status}\n"
        f"🚀 <b>سرعت دریافت پیام:</b> کمتر از ۶۰ ثانیه پس از تایید در دیوار و شیپور\n"
        f"🎯 <b>تعداد مجاز فیلترها:</b> نامحدود\n\n"
        "👇 برای تغییر شهر پایش یا اتصال حساب کاربری از کلیدهای زیر استفاده کنید:"
    )
    markup = {
        "inline_keyboard": [
            [
                {"text": "🏢 تغییر شهر به مشهد", "callback_data": "set_city:مشهد"},
                {"text": "🏢 تغییر شهر به تربت‌حیدریه", "callback_data": "set_city:تربت‌حیدریه"},
            ],
            [
                {"text": "🌐 تغییر به هر دو شهر (مشهد + تربت)", "callback_data": "set_city:مشهد و تربت‌حیدریه"}
            ],
            [
                {"text": "🔗 اتصال به حساب سایت با شماره همراه", "callback_data": "show_link_guide"}
            ]
        ]
    }
    await send_bale_reply(client, chat_id, status_text, markup)


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
    msg = cb.get("message") or {}
    chat_id = msg.get("chat", {}).get("id") or cb.get("from", {}).get("id")
    user_info = cb.get("from", {})
    user_name = user_info.get("first_name", "") + " " + user_info.get("last_name", "")
    user_name = user_name.strip() or "کاربر رادار"

    if not chat_id:
        return

    logger.info(f"[BALE CB] chat_id={chat_id} data='{data}'")

    if cb_id:
        # پاسخ فوری برای رفع حالت لودینگ
        await answer_bale_callback(client, cb_id)

    # تغییر شهر پایش کاربر
    if data.startswith("set_city:"):
        new_city = data.split(":", 1)[1]
        try:
            res = await client.patch(
                f"{API_BASE}/rules",
                json={"chatId": str(chat_id), "messenger": "bale", "city": new_city},
                timeout=8.0,
            )
            r_data = res.json()
            if r_data.get("ok"):
                await send_bale_reply(client, chat_id, f"✅ شهر پایش حساب شما با موفقیت به <b>«{new_city}»</b> تغییر یافت.", MAIN_KEYBOARD)
            else:
                await send_bale_reply(client, chat_id, f"❌ خطا: {r_data.get('message', 'خطا در تغییر شهر')}")
        except Exception as e:
            logger.error(f"خطا در تغییر شهر: {e}")
            await send_bale_reply(client, chat_id, "⚠️ خطا در تغییر شهر.")
        return

    # نمایش راهنمای اتصال حساب
    if data == "show_link_guide":
        guide = (
            "🔗 <b>اتصال ربات به حساب سایت:</b>\n\n"
            "۱. وارد سایت <b>https://radar.digiral.ir</b> شوید.\n"
            "۲. از منو به بخش <b>«تنظیمات هشدار»</b> بروید.\n"
            "۳. <b>کد ۶ رقمی</b> خود را بردارید و در همین چت ارسال نمایید.\n\n"
            "یا شماره موبایل ثبت‌نامی خود در سایت را همین‌جا ارسال فرمایید."
        )
        await send_bale_reply(client, chat_id, guide)
        return

    # لغو فرآیند ساخت فیلتر
    if data == "cancel_wizard":
        USER_SESSIONS.pop(str(chat_id), None)
        await send_bale_reply(client, chat_id, "عملیات لغو شد.", MAIN_KEYBOARD)
        return

    # بررسی ثبت‌نام و فعال بودن اشتراک قبل از سایر عملیات
    if await ensure_bot_access(client, chat_id, user_name) is None:
        return

    # فیلتر فرصت‌ها بر اساس شهر
    if data.startswith("opp:"):
        tag = data.split(":", 1)[1]
        c_filter = "مشهد" if tag == "mashhad" else ("تربت‌حیدریه" if tag == "torbat" else "all")
        await handle_opportunities(client, chat_id, c_filter)
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
        await start_wizard_flow(client, chat_id, user_name)
        return

    # مرحله ۰: انتخاب شهر (مخصوص کاربران با دسترسی دو شهر)
    if data.startswith("city:"):
        session = USER_SESSIONS.get(str(chat_id))
        if not session:
            await start_wizard_flow(client, chat_id, user_name)
            return

        choice = data.split(":", 1)[1]
        if choice == "all":
            session["city"] = None
            session["city_name"] = "هر دو شهر (مشهد و تربت‌حیدریه)"
        else:
            session["city"] = choice
            session["city_name"] = choice

        session["step"] = "car"
        prompt = (
            f"🏙️ محدوده انتخابی: <b>{session['city_name']}</b>\n\n"
            f"🚗 <b>مرحله دوم:</b> لطفاً خودروی مورد نظرتان را برای پایش انتخاب کنید:"
        )
        await send_bale_reply(client, chat_id, prompt, {"inline_keyboard": CARS_GRID})
        return

    # مرحله ۱: انتخاب خودرو
    if data.startswith("car:"):
        car_code = data.split(":", 1)[1]
        make, model, fa_name = CAR_NAMES.get(car_code, ("", "", "خودرو دلخواه"))
        session = USER_SESSIONS.setdefault(str(chat_id), {})
        session["step"] = "budget"
        session["make"] = make
        session["model"] = model
        session["fa_name"] = fa_name

        c_info = f"📍 شهر: <b>{session.get('city_name', 'پیش‌فرض')}</b>\n" if session.get("city_name") else ""
        prompt = (
            f"✅ خودروی انتخابی: <b>{fa_name}</b>\n"
            f"{c_info}\n"
            f"💰 <b>مرحله بعد:</b> حداکثر سقف بودجه خرید خود را مشخص کنید:"
        )
        await send_bale_reply(client, chat_id, prompt, {"inline_keyboard": BUDGET_GRID})
        return

    # مرحله ۲: انتخاب بودجه
    if data.startswith("budget:"):
        session = USER_SESSIONS.get(str(chat_id))
        if not session:
            await send_bale_reply(client, chat_id, "لطفاً مجدداً از منو روی «تعریف فیلتر خودرو» کلیک فرمایید.")
            return

        try:
            budget_m = int(data.split(":", 1)[1])
        except ValueError:
            await send_bale_reply(client, chat_id, "بودجه نامعتبر است. لطفاً دوباره فیلتر را تعریف کنید.")
            return
        session["budget_max_toman"] = budget_m * 1_000_000 if budget_m > 0 else None
        session["step"] = "mode"

        b_text = f"{budget_m} میلیون تومان" if budget_m > 0 else "بدون سقف قیمت"
        prompt = (
            f"🚗 خودرو: <b>{session.get('fa_name')}</b>\n"
            f"💰 سقف بودجه: <b>{b_text}</b>\n\n"
            f"🎯 <b>مرحله نهایی:</b> مایلید چه آگهی‌هایی به شما پیام داده شوند؟"
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
                "city": session.get("city"),
                "price_max_toman": b_max,
                "min_discount_percent": min_discount_percent,
            },
        }

        try:
            res = await client.post(f"{API_BASE}/rules", json=payload, timeout=10.0)
            data = res.json()
            if data.get("ok"):
                c_label = session.get("city_name") or session.get("city") or "تربت‌حیدریه"
                success_text = (
                    f"🎉 <b>فیلتر جدید با موفقیت فعال شد!</b>\n\n"
                    f"🎯 <b>عنوان فیلتر:</b> «{rule_name}»\n"
                    f"🚗 <b>خودرو:</b> {fa_name}\n"
                    f"💰 <b>سقف قیمت:</b> {b_str}\n"
                    f"🔥 <b>نوع آگهی:</b> {mode_str}\n"
                    f"📍 <b>محدوده پایش:</b> {c_label} (دیوار و شیپور)\n\n"
                    f"⚡ از همین حالا، به محض اینکه آگهی با این مشخصات ثبت شود، فوراً با زنگ هشدار برای شما ارسال خواهد شد."
                )
                markup = {"inline_keyboard": [[{"text": "📋 مشاهده همه فیلترهای من", "callback_data": "menu_rules"}]]}
                await send_bale_reply(client, chat_id, success_text, markup)
            else:
                await send_bale_reply(client, chat_id, f"❌ خطا در ایجاد فیلتر: {data.get('message')}")
        except Exception as e:
            logger.error(f"خطا در ثبت نهایی فیلتر: {e}")
            await send_bale_reply(client, chat_id, "⚠️ خطا در ارتباط با سرور. لطفاً دقایقی بعد تلاش کنید.")


async def handle_bale_message(client: httpx.AsyncClient, message: dict) -> None:
    chat_id = message.get("chat", {}).get("id") or message.get("from", {}).get("id")
    text = (message.get("text") or "").strip()
    user_info = message.get("from", {})
    user_name = user_info.get("first_name", "") + " " + user_info.get("last_name", "")
    user_name = user_name.strip() or "کاربر رادار"

    if not chat_id or not text:
        return

    logger.info(f"[BALE MSG] chat={chat_id} user='{user_name}' text='{text}'")

    # ۱. اتصال خودکار فقط وقتی خودِ پیام کد، شماره، ایمیل یا RADAR-… باشد
    target_code = extract_link_token(text)

    if target_code:
        try:
            resp = await client.post(
                f"{API_BASE}/link",
                json={
                    "code": target_code,
                    "chatId": str(chat_id),
                    "messenger": "bale",
                    "userName": user_name,
                },
                timeout=8.0,
            )
            data = resp.json()
            if data.get("success"):
                reply = (
                    f"🎉 <b>{data.get('message', 'حساب شما با موفقیت متصل شد!')}</b>\n\n"
                    f"👤 نام کاربر: <b>{user_name}</b>\n"
                    f"🔔 تمام امکانات رادار و هشدارهای شکار لحظه‌ای در این چت برای شما فعال گردید."
                )
                await send_bale_reply(client, chat_id, reply, MAIN_KEYBOARD)
                return
            else:
                reply = (
                    f"❌ {data.get('message', 'کد اتصال نامعتبر است.')}\n\n"
                    f"📌 لطفاً کد ۶ رقمی خود را از بخش «تنظیمات هشدار» در سایت <b>https://radar.digiral.ir</b> برداشته و ارسال فرمایید."
                )
                await send_bale_reply(client, chat_id, reply)
                return
        except Exception as e:
            logger.error("خطا در اتصال بله (%s).", type(e).__name__)
            reply = "⚠️ خطا در ارتباط با سرور سایت. لطفاً بعداً تلاش فرمایید."
            await send_bale_reply(client, chat_id, reply)
            return

    # ۲. دکمه «❓ راهنما و تنظیم صدا» یا راهنما
    if text in ("❓ راهنما و معرفی سامانه", "❓ راهنما و تنظیم صدا", "❓ راهنما و پشتیبانی", "❓ راهنما", "/help", "راهنما"):
        await handle_sound_and_help(client, chat_id)
        return

    # ۳. دکمه «🔗 اتصال به حساب سایت» یا راهنمای کد
    if text in ("🔗 اتصال به حساب سایت", "🔗 راهنمای اتصال با کد سایت", "/link", "اتصال", "🔗 اتصال مجدد"):
        help_link = (
            "🔐 <b>نحوه فعال‌سازی و اتصال ربات به حساب سایت:</b>\n\n"
            "۱. ابتدا وارد سایت <b>https://radar.digiral.ir</b> شوید.\n"
            "۲. از منو وارد بخش <b>«تنظیمات هشدار»</b> شوید.\n"
            "۳. <b>کد ۶ رقمی</b> اختصاصی خود را بردارید و در همین چت ارسال نمایید.\n\n"
            "<i>(همچنین می‌توانید شماره موبایل ثبت‌نامی خود در سایت را بفرستید)</i>"
        )
        markup = {
            "inline_keyboard": [
                [{"text": "🌐 ورود به صفحه تنظیمات هشدار در سایت", "url": "https://radar.digiral.ir/settings/alerts"}],
            ]
        }
        await send_bale_reply(client, chat_id, help_link, markup)
        return

    # ۴. دکمه «💳 تمدید اشتراک در سایت»
    if text in ("💳 تمدید اشتراک در سایت", "تمدید اشتراک", "تمدید"):
        await send_expired_prompt(client, chat_id)
        return

    # ۶. بررسی ثبت‌نام و فعال بودن اشتراک برای دسترسی به امکانات ربات
    if await ensure_bot_access(client, chat_id, user_name) is None:
        return

    # ۷. دکمه «➕ تعریف فیلتر خودرو (شکار جدید)»
    if text in ("➕ تعریف فیلتر خودرو (شکار جدید)", "/new", "تعریف فیلتر"):
        await start_wizard_flow(client, chat_id, user_name)
        return

    # ۸. دکمه «📋 فیلترهای فعال من»
    if text in ("📋 فیلترهای فعال من", "/rules", "فیلترها"):
        await handle_list_rules(client, chat_id)
        return

    # ۹. دکمه «🎯 آخرین فرصت‌های شکار»
    if text in ("🎯 آخرین فرصت‌های شکار", "/hunt", "فرصت ها"):
        await handle_opportunities(client, chat_id)
        return

    # ۱۰. دکمه «💳 وضعیت اشتراک من»
    if text in ("💳 وضعیت اشتراک من", "/plan", "اشتراک"):
        await handle_subscription_status(client, chat_id)
        return

    # پیام پیش‌فرض شروع یا متفرقه برای کاربر فعال و ثبت‌نام‌شده
    welcome = (
        f"👋 <b>سلام {user_name} عزیز! به سامانه رادار هوشمند خودرو خوش آمدید.</b>\n\n"
        f"این سامانه آگهی‌های خودرو دیوار و شیپور تربت‌حیدریه و مشهد را لحظه‌به‌لحظه رصد کرده و آگهی‌های زیر قیمت و شکار را فوراً به شما می‌رساند.\n\n"
        f"👇 <b>برای شروع از دکمه‌های منوی زیر استفاده کنید:</b>"
    )
    await send_bale_reply(client, chat_id, welcome, MAIN_KEYBOARD)


def retry_delay_seconds(error: str | None) -> float:
    if error == "unauthorized":
        return 30.0
    if error:
        return 2.0
    return 0.5


async def fetch_bale_updates(
    client: httpx.AsyncClient,
    token: str,
    last_update_id: int,
) -> tuple[list[dict], int, str | None]:
    """یک دور getUpdates.

    برمی‌گرداند: (updates, new_offset, error)
    error یکی از None، unconfigured، unauthorized، http، api، network، bad_payload است.
    در خطا offset جلو نمی‌رود تا آپدیت از دست نرود.
    پاسخ HTTP 200 با ok=false هم خطا است؛ همان شکلی که ارسال پیام آن را شکست می‌داند.
    """
    if not token:
        return [], last_update_id, "unconfigured"

    url = f"https://tapi.bale.ai/bot{token}/getUpdates"
    params: dict[str, int] = {"timeout": 15}
    if last_update_id > 0:
        params["offset"] = last_update_id + 1

    try:
        resp = await client.get(url, params=params, timeout=20.0)
    except Exception as e:
        logger.error("ارتباط با API بله برقرار نشد (%s).", type(e).__name__)
        return [], last_update_id, "network"

    if resp.status_code in (401, 403, 404):
        logger.error("توکن بله رد شد یا ربات پیدا نشد (وضعیت %s).", resp.status_code)
        return [], last_update_id, "unauthorized"
    if resp.status_code != 200:
        logger.error("دریافت به‌روزرسانی بله ناموفق بود (وضعیت %s).", resp.status_code)
        return [], last_update_id, "http"

    try:
        data = resp.json()
    except Exception:
        logger.error("پاسخ getUpdates بله JSON معتبر نبود.")
        return [], last_update_id, "bad_payload"

    if not isinstance(data, dict):
        logger.error("ساختار پاسخ getUpdates بله نامعتبر است.")
        return [], last_update_id, "bad_payload"

    if data.get("ok") is False:
        error_code = data.get("error_code")
        if error_code in (401, 403):
            logger.error("توکن بله در getUpdates رد شد (کد %s).", error_code)
            return [], last_update_id, "unauthorized"
        logger.error(
            "getUpdates بله ناموفق بود (ok=false، کد %s).",
            error_code if isinstance(error_code, int) else "unknown",
        )
        return [], last_update_id, "api"

    updates = data.get("result", [])
    if not isinstance(updates, list):
        logger.error("ساختار پاسخ getUpdates بله نامعتبر است.")
        return [], last_update_id, "bad_payload"

    new_offset = last_update_id
    for up in updates:
        if isinstance(up, dict):
            new_offset = max(new_offset, int(up.get("update_id") or 0))
    return updates, new_offset, None


async def dispatch_bale_update(client: httpx.AsyncClient, update: dict) -> None:
    cb = update.get("callback_query")
    if cb:
        await handle_bale_callback(client, cb)
        return
    msg = update.get("message")
    if msg:
        await handle_bale_message(client, msg)


async def run_bale_polling() -> None:
    if not current_bale_token():
        logger.warning("توکن بله تنظیم نشده است.")
        return

    logger.info("سرویس شنود پیشرفته بله با پشتیبانی از دکمه‌های شیشه‌ای و ساخت فیلتر فعال شد...")
    last_update_id = 0

    async with httpx.AsyncClient() as client:
        while True:
            updates, last_update_id, err = await fetch_bale_updates(
                client, current_bale_token(), last_update_id
            )
            if err:
                await asyncio.sleep(retry_delay_seconds(err))
                continue
            for up in updates:
                if not isinstance(up, dict):
                    continue
                try:
                    await dispatch_bale_update(client, up)
                except Exception as e:
                    logger.error("خطا در پردازش آپدیت بله (%s).", type(e).__name__)
            await asyncio.sleep(retry_delay_seconds(None))


if __name__ == "__main__":
    asyncio.run(run_bale_polling())
