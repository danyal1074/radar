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

from config import config

logging.basicConfig(
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    level=logging.INFO,
)
logger = logging.getLogger(__name__)

BALE_TOKEN = config.BALE_BOT_TOKEN
API_BASE = "http://127.0.0.1:3000/api/bot"

# منوی کاربران مهمان (ثبت‌نام‌نشده)
GUEST_KEYBOARD = {
    "keyboard": [
        [{"text": "📝 ثبت‌نام در سامانه"}, {"text": "🔗 اتصال به حساب سایت"}],
        [{"text": "❓ راهنما و معرفی سامانه"}],
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


async def check_user_access(client: httpx.AsyncClient, chat_id: int | str) -> dict:
    """بررسی وضعیت عضویت و اشتراک کاربر در سامانه"""
    try:
        res = await client.get(f"{API_BASE}/rules?chatId={chat_id}&messenger=bale", timeout=8.0)
        if res.status_code == 200:
            return res.json()
        return {"registered": False, "hasAccess": False}
    except Exception as e:
        logger.error(f"خطا در بررسی دسترسی کاربر: {e}")
        return {"registered": False, "hasAccess": False}


def to_latin_digits(text: str) -> str:
    """تبدیل تمام ارقام فارسی به انگلیسی"""
    p2e = {"۰": "0", "۱": "1", "۲": "2", "۳": "3", "۴": "4", "۵": "5", "۶": "6", "۷": "7", "۸": "8", "۹": "9"}
    return "".join(p2e.get(c, c) for c in text)


async def start_inbot_registration(client: httpx.AsyncClient, chat_id: int | str, user_name: str) -> None:
    """شروع ثبت‌نام مستقیم در داخل ربات بله بدون نیاز به خروج از ربات"""
    USER_SESSIONS[str(chat_id)] = {
        "is_reg": True,
        "reg_step": "name",
        "userName": user_name,
    }
    prompt = (
        f"📝 <b>ثبت‌نام مستقیم در سامانه رادار خودرو</b>\n\n"
        f"👋 سلام {user_name} عزیز! به ربات رادار خوش آمدید 🚗✨\n\n"
        f"۱️⃣ <b>مرحله اول:</b> لطفاً <b>«نام و نام خانوادگی»</b> یا <b>«نام نمایشگاه اتومبیل»</b> خود را ارسال فرمایید:\n"
        f"<i>(مثال: نمایشگاه اتومبیل کلاسیک یا رضا رضایی)</i>"
    )
    cancel_btn = {
        "inline_keyboard": [
            [{"text": "❌ انصراف", "callback_data": "cancel_wizard"}]
        ]
    }
    await send_bale_reply(client, chat_id, prompt, cancel_btn)


async def send_registration_prompt(
    client: httpx.AsyncClient, chat_id: int | str, user_name: str
) -> None:
    """ارسال پیام دعوت به ثبت‌نام برای کاربران جدید یا متصل‌نشده"""
    text = (
        f"👋 <b>سلام {user_name} عزیز!</b>\n"
        f"به ربات هوشمند شکار خودرو <b>«رادار»</b> خوش آمدید 🚗✨\n\n"
        f"این ربات هوش مصنوعی، تمام آگهی‌های خودرو در دیوار و شیپور تربت‌حیدریه و مشهد را لحظه‌ای رصد کرده و خودروهای <b>زیر قیمت بازار</b> را بلافاصله برای شما شکار می‌کند.\n\n"
        f"🎁 <b>هدیه ویژه:</b> استفاده از تمام امکانات و دریافت هشدارهای شکار به مدت ۱۴ روز برای شما <b>کاملاً رایگان</b> است!\n\n"
        f"📝 <b>جهت فعال‌سازی آنی، لطفاً ثبت‌نام خود را در ربات انجام دهید:</b>"
    )
    markup = {
        "inline_keyboard": [
            [{"text": "📝 ثبت‌نام مستقیم در ربات (۱۴ روز رایگان)", "callback_data": "start_inbot_reg"}],
            [{"text": "🔗 قبلاً در سایت ثبت‌نام کرده‌ام (اتصال با کد)", "callback_data": "show_link_guide"}],
        ]
    }
    await send_bale_reply(client, chat_id, text, GUEST_KEYBOARD)
    await send_bale_reply(client, chat_id, "👇 برای ثبت‌نام روی دکمه زیر بزنید:", markup)


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
    url = f"https://tapi.bale.ai/bot{BALE_TOKEN}/answerCallbackQuery"
    payload = {"callback_query_id": callback_query_id}
    if text:
        payload["text"] = text
    try:
        await client.post(url, json=payload, timeout=5.0)
    except Exception as e:
        logger.debug(f"خطا در answerCallbackQuery: {e}")


async def start_wizard_flow(client: httpx.AsyncClient, chat_id: int | str, user_name: str) -> None:
    """شروع فرآیند هوشمند ساخت فیلتر با رعایت سهمیه شهر کاربر"""
    try:
        res = await client.get(f"{API_BASE}/rules?chatId={chat_id}&messenger=bale", timeout=8.0)
        user_data = res.json() if res.status_code == 200 else {}
    except Exception:
        user_data = {}

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
    except Exception:
        data = {}

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

    # نمایش راهنمای اتصال حساب
    if data == "show_link_guide":
        guide = (
            "🔗 <b>راهنمای اتصال حساب سایت:</b>\n\n"
            "۱. ابتدا وارد سایت <b>https://radar.digiral.ir</b> شوید و وارد حسابتان شوید.\n"
            "۲. به صفحه <b>«تنظیمات هشدار»</b> بروید.\n"
            "۳. در کادر اتصال ربات، <b>کد ۶ رقمی اختصاصی</b> خود را کپی کنید.\n"
            "۴. فقط همان کد را در همین صفحه چت ارسال کنید تا حسابتان متصل شود."
        )
        await send_bale_reply(client, chat_id, guide)
        return

    # شروع ثبت‌نام مستقیم در ربات
    if data == "start_inbot_reg":
        await start_inbot_registration(client, chat_id, user_name)
        return

    # تکمیل مرحله شهر در ثبت‌نام مستقیم
    if data.startswith("reg_city:"):
        choice_city = data.split(":", 1)[1]
        session = USER_SESSIONS.pop(str(chat_id), {})
        full_name = session.get("name") or user_name
        phone_num = session.get("phone") or ""

        try:
            payload = {
                "chatId": str(chat_id),
                "messenger": "bale",
                "fullName": full_name,
                "businessName": full_name,
                "phone": phone_num,
                "city": choice_city,
            }
            res = await client.post(f"{API_BASE}/register", json=payload, timeout=10.0)
            res_data = res.json() if res.status_code == 200 else {}
            if res.status_code == 200 and res_data.get("ok"):
                success_msg = (
                    f"🎉 <b>تبریک جناب {full_name} عزیز!</b>\n"
                    f"حساب کاربری شما با موفقیت در سامانه رادار ایجاد شد ✨\n\n"
                    f"⭐️ <b>اشتراک آزمایشی ۱۴ روزه رایگان (VIP)</b> برای شما فعال گردید.\n"
                    f"📱 <b>شماره همراه:</b> <code>{phone_num}</code>\n"
                    f"🏙️ <b>شهر پایش:</b> {choice_city}\n\n"
                    f"🔔 اکنون می‌توانید از طریق منوی زیر، خودروهای دلخواهتان را برای شکار ثبت کرده یا آخرین فرصت‌های زیر قیمت را مشاهده کنید 👇"
                )
                await send_bale_reply(client, chat_id, success_msg, MAIN_KEYBOARD)
            else:
                err_text = res_data.get("message", "خطا در برقراری ارتباط با سامانه")
                await send_bale_reply(client, chat_id, f"❌ خطا در ثبت‌نام: {err_text}\nلطفاً مجدداً امتحان کنید.")
        except Exception as e:
            logger.error(f"خطا در رجیستر بله: {e}")
            await send_bale_reply(client, chat_id, "⚠️ خطا در ثبت‌نام. لطفاً لحظاتی دیگر تلاش فرمایید.")
        return

    # لغو فرآیند (چه ثبت‌نام چه ساخت فیلتر)
    if data == "cancel_wizard":
        USER_SESSIONS.pop(str(chat_id), None)
        await send_bale_reply(client, chat_id, "عملیات لغو شد.", MAIN_KEYBOARD)
        return

    # بررسی ثبت‌نام و فعال بودن اشتراک قبل از سایر عملیات
    user_access = await check_user_access(client, chat_id)
    if not user_access.get("registered"):
        await send_registration_prompt(client, chat_id, user_name)
        return
    if user_access.get("planExpired"):
        await send_expired_prompt(client, chat_id, user_access.get("planName", "آزمایشی"))
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

        budget_m = int(data.split(":", 1)[1])
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
    chat_id = message.get("chat", {}).get("id")
    text = (message.get("text") or "").strip()
    user_info = message.get("from", {})
    user_name = user_info.get("first_name", "") + " " + user_info.get("last_name", "")
    user_name = user_name.strip() or "کاربر رادار"

    if not chat_id or not text:
        return

    # ۰. بررسی مراحل فعال ثبت‌نام مستقیم در ربات
    reg_session = USER_SESSIONS.get(str(chat_id))
    if reg_session and reg_session.get("is_reg"):
        reg_step = reg_session.get("reg_step")
        if reg_step == "name":
            clean_name = text.strip()
            if len(clean_name) < 2:
                await send_bale_reply(client, chat_id, "⚠️ لطفاً نام یا نام نمایشگاه را به صورت کامل بنویسید:")
                return
            reg_session["name"] = clean_name
            reg_session["reg_step"] = "phone"
            prompt = (
                f"بسیار عالی جناب <b>{clean_name}</b> عزیز 🌹\n\n"
                f"۲️⃣ <b>مرحله دوم:</b> لطفاً <b>شماره موبایل</b> خود را ارسال فرمایید:\n"
                f"<i>(جهت ثبت حساب کاربری و فعال‌سازی اشتراک ۱۴ روزه رایگان)</i>\n\n"
                f"📱 مثال: <code>09151234567</code>"
            )
            cancel_btn = {"inline_keyboard": [[{"text": "❌ انصراف", "callback_data": "cancel_wizard"}]]}
            await send_bale_reply(client, chat_id, prompt, cancel_btn)
            return

        elif reg_step == "phone":
            raw_phone = to_latin_digits(text).strip().replace(" ", "").replace("-", "")
            if raw_phone.startswith("+98"):
                raw_phone = "0" + raw_phone[3:]
            elif raw_phone.startswith("98"):
                raw_phone = "0" + raw_phone[2:]
            elif not raw_phone.startswith("0") and len(raw_phone) == 10:
                raw_phone = "0" + raw_phone

            import re
            if not re.match(r"^09\d{9}$", raw_phone):
                await send_bale_reply(
                    client,
                    chat_id,
                    "⚠️ شماره موبایل وارد شده معتبر نیست.\nلطفاً یک شماره ۱۱ رقمی معتبر (مانند <code>09151234567</code>) وارد نمایید:",
                )
                return

            reg_session["phone"] = raw_phone
            reg_session["reg_step"] = "city"
            prompt = (
                f"✅ شماره <code>{raw_phone}</code> ثبت شد.\n\n"
                f"۳️⃣ <b>مرحله سوم:</b> لطفاً شهر یا محدوده فعالیت خود را برای دریافت هشدارهای شکار انتخاب فرمایید:"
            )
            city_markup = {
                "inline_keyboard": [
                    [{"text": "🏢 مشهد", "callback_data": "reg_city:مشهد"}, {"text": "🏢 تربت‌حیدریه", "callback_data": "reg_city:تربت‌حیدریه"}],
                    [{"text": "🌐 هر دو شهر (مشهد و تربت)", "callback_data": "reg_city:مشهد و تربت‌حیدریه"}],
                    [{"text": "❌ انصراف", "callback_data": "cancel_wizard"}],
                ]
            }
            await send_bale_reply(client, chat_id, prompt, city_markup)
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
                    f"📍 پایش آنی آگهی‌های خودروی دیوار و شیپور\n\n"
                    f"🔔 از این پس تمام آگهی‌های شکار مطابق فیلترهای شما فوراً در این چت ارسال می‌شوند."
                )
                await send_bale_reply(client, chat_id, reply, MAIN_KEYBOARD)
            else:
                reply = f"❌ {data.get('message', 'کد اتصال نامعتبر است.')}"
                await send_bale_reply(client, chat_id, reply)
        except Exception as e:
            logger.error(f"خطا در اتصال بله: {e}")
            reply = "⚠️ خطا در ارتباط با سرور سایت. لطفاً بعداً تلاش فرمایید."
            await send_bale_reply(client, chat_id, reply)
        return

    # ۲. دکمه «📝 ثبت‌نام در سامانه»
    if text in ("📝 ثبت‌نام در سامانه", "ثبت نام", "/register"):
        await start_inbot_registration(client, chat_id, user_name)
        return

    # ۳. دکمه «💳 تمدید اشتراک در سایت»
    if text in ("💳 تمدید اشتراک در سایت", "تمدید اشتراک", "تمدید"):
        await send_expired_prompt(client, chat_id)
        return

    # ۴. دکمه «❓ راهنما و معرفی سامانه» یا تنظیم صدا
    if text in ("❓ راهنما و معرفی سامانه", "❓ راهنما و تنظیم صدا", "/help", "راهنما"):
        await handle_sound_and_help(client, chat_id)
        return

    # ۵. دکمه «🔗 اتصال به حساب سایت»
    if text in ("🔗 اتصال به حساب سایت", "/link", "اتصال", "🔗 اتصال مجدد"):
        help_link = (
            "🔗 <b>اتصال ربات به حساب کاربری سایت:</b>\n\n"
            "۱. ابتدا وارد سایت <b>https://radar.digiral.ir</b> شوید.\n"
            "۲. از منو به بخش <b>«تنظیمات هشدار»</b> بروید.\n"
            "۳. در کارت اتصال ربات، <b>کد ۶ رقمی</b> اختصاصی خود را بردارید.\n"
            "۴. فقط همان عدد را اینجا بفرستید تا حسابتان فوراً متصل شود."
        )
        await send_bale_reply(client, chat_id, help_link)
        return

    # ۶. بررسی ثبت‌نام و فعال بودن اشتراک برای دسترسی به امکانات ربات
    user_access = await check_user_access(client, chat_id)
    if not user_access.get("registered"):
        await send_registration_prompt(client, chat_id, user_name)
        return

    if user_access.get("planExpired"):
        await send_expired_prompt(client, chat_id, user_access.get("planName", "آزمایشی"))
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
