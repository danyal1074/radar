"""
سرویس هوشمند پیام‌رسان روبیکا (Rubika Bot Engine & Interactive Wizard)
پشتیبانی از:
- منوی دکمه‌ای ثابت و تمام گزینه‌های مشابه بله
- ویزارد چندمرحله‌ای ساخت فیلتر جدید مستقیم در روبیکا
- دکمه‌های شیشه‌ای مشاهده آگهی‌ها در دیوار و شیپور
- اتصال حساب کاربری سایت به روبیکا با کد اختصاصی
- ارسال آخرین فرصت‌های شکار خودرو به چت روبیکا
- مدیریت و نمایش فیلترهای فعال کاربر
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

# منوی اصلی و ثابت پایین صفحه در روبیکا
MAIN_KEYBOARD = {
    "keyboard": [
        [{"text": "➕ تعریف فیلتر خودرو (شکار جدید)"}, {"text": "📋 فیلترهای فعال من"}],
        [{"text": "🎯 آخرین فرصت‌های شکار"}, {"text": "💳 وضعیت اشتراک من"}],
        [{"text": "❓ راهنما و تنظیم صدا"}, {"text": "🔗 اتصال به حساب سایت"}],
    ],
    "resize_keyboard": True,
}

# کیبوردهای مراحل ساخت فیلتر
CARS_KEYBOARD = {
    "keyboard": [
        [{"text": "🚗 پراید"}, {"text": "🚗 پژو ۲۰۶"}],
        [{"text": "🚗 پژو پارس"}, {"text": "🚗 پژو ۲۰۷"}],
        [{"text": "🚗 دنا"}, {"text": "🚗 تارا"}],
        [{"text": "🚗 کوییک"}, {"text": "🚗 ساینا"}],
        [{"text": "🚗 سمند / سورن"}, {"text": "🚗 شاهین"}],
        [{"text": "🚗 تیبا"}, {"text": "🚘 تمام خودروها"}],
        [{"text": "❌ انصراف"}],
    ],
    "resize_keyboard": True,
}

BUDGET_KEYBOARD = {
    "keyboard": [
        [{"text": "💰 تا ۲۵۰ میلیون"}, {"text": "💰 تا ۴۰۰ میلیون"}],
        [{"text": "💰 تا ۶۰۰ میلیون"}, {"text": "💰 تا ۹۰۰ میلیون"}],
        [{"text": "💰 تا ۱.۵ میلیارد"}, {"text": "♾️ بدون سقف بودجه"}],
        [{"text": "❌ انصراف"}],
    ],
    "resize_keyboard": True,
}

MODE_KEYBOARD = {
    "keyboard": [
        [{"text": "🔥 فقط زیر قیمت بازار (سود تضمینی)"}],
        [{"text": "🔔 تمام آگهی‌های جدید (حتی قیمت عادی)"}],
        [{"text": "❌ انصراف"}],
    ],
    "resize_keyboard": True,
}

CITY_KEYBOARD = {
    "keyboard": [
        [{"text": "🏙️ فقط تربت‌حیدریه"}, {"text": "🏙️ فقط مشهد"}],
        [{"text": "🌐 هر دو شهر (مشهد + تربت)"}],
        [{"text": "❌ انصراف"}],
    ],
    "resize_keyboard": True,
}

USER_SESSIONS: dict[str, dict] = {}

CAR_MAP = {
    "پراید": ("سایپا", "پراید", "پراید"),
    "پژو ۲۰۶": ("ایران خودرو", "206", "پژو ۲۰۶"),
    "پژو پارس": ("ایران خودرو", "پارس", "پژو پارس"),
    "پژو ۲۰۷": ("ایران خودرو", "207", "پژو ۲۰۷"),
    "دنا": ("ایران خودرو", "دنا", "دنا"),
    "تارا": ("ایران خودرو", "تارا", "تارا"),
    "کوییک": ("سایپا", "کوییک", "کوییک"),
    "ساینا": ("سایپا", "ساینا", "ساینا"),
    "سمند / سورن": ("ایران خودرو", "سمند", "سمند و سورن"),
    "شاهین": ("سایپا", "شاهین", "شاهین"),
    "تیبا": ("سایپا", "تیبا", "تیبا"),
    "تمام خودروها": ("", "", "تمام خودروها"),
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
    reply_markup: dict | None = None,
) -> None:
    url = f"https://botapi.rubika.ir/v3/{RUBIKA_TOKEN}/sendMessage"
    payload = {
        "chat_id": chat_id,
        "text": text,
        "reply_markup": reply_markup or MAIN_KEYBOARD,
    }
    try:
        await client.post(url, json=payload, timeout=8.0)
    except Exception as e:
        logger.error(f"خطا در ارسال پیام به روبیکا: {e}")


async def start_wizard_flow(client: httpx.AsyncClient, chat_id: str) -> None:
    """آغاز فرآیند گام‌به‌گام ساخت فیلتر در روبیکا"""
    try:
        res = await client.get(f"{API_BASE}/rules?chatId={chat_id}&messenger=rubika", timeout=8.0)
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
        }
        prompt = (
            f"🎯 تعریف فیلتر هوشمند رادار خودرو:\n"
            f"⭐️ پلن شما: {plan_name} (دسترسی همزمان به ۲ شهر)\n\n"
            f"🏙️ مرحله اول: لطفاً شهر یا محدوده پایش این فیلتر را انتخاب کنید:"
        )
        await send_rubika_message(client, chat_id, prompt, CITY_KEYBOARD)
    else:
        USER_SESSIONS[str(chat_id)] = {
            "step": "car",
            "city": user_city,
            "city_name": user_city,
            "allowedCitiesCount": 1,
            "userCity": user_city,
        }
        prompt = (
            f"🎯 تعریف فیلتر هوشمند رادار خودرو:\n"
            f"🏙️ شهر تحت پایش: {user_city} (قفل در پلن {plan_name})\n\n"
            f"🚗 مرحله اول: لطفاً خودروی مورد نظرتان را برای پایش انتخاب کنید:"
        )
        await send_rubika_message(client, chat_id, prompt, CARS_KEYBOARD)


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
                MAIN_KEYBOARD,
            )
            return

        header = "🎯 آخرین فرصت‌های شکار بازار خودرو (دیوار و شیپور):\n━━━━━━━━━━━━━━━━━━━━━"
        await send_rubika_message(client, chat_id, header, MAIN_KEYBOARD)

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
                f"🚘 خودرو: ❮❮ {t} ❯❯\n"
                f"╭─────────────────────────╮\n"
                f"│ 💰 قیمت فروشنده: « {format_toman_persian(p)} »\n"
                f"╰─────────────────────────╯\n"
                f"📊 ارزش کارشناسی: {format_toman_persian(est)}\n"
                f"🎁 سود تخمینی: 🔥 {format_toman_persian(profit)} ({disc}٪ زیر قیمت)\n"
                f"📍 منبع: {source} {city_name}"
            )

            markup = {
                "inline_keyboard": [
                    [{"text": f"🚗 مشاهده آگهی در {source}", "url": url}]
                ]
            }
            await send_rubika_message(client, chat_id, card, markup)
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
                "برای تعریف فیلتر خودرو، روی دکمه «➕ تعریف فیلتر خودرو» در منوی پایین کلیک کنید."
            )
            await send_rubika_message(client, chat_id, empty_msg, MAIN_KEYBOARD)
            return

        lines = ["📋 فیلترهای فعال شما در رادار خودرو:\n"]
        for idx, r in enumerate(rules, 1):
            name = r.get("name", "فیلتر بدون نام")
            max_p = r.get("price_max_toman")
            p_str = f"تا {max_p // 1_000_000} میلیون تومان" if max_p else "بدون سقف قیمت"
            c_name = r.get("city") or "هر دو شهر (مشهد + تربت)"
            disc = r.get("min_discount_percent")
            disc_str = f"{disc}٪ زیر قیمت" if disc and disc > 0 else "تمام آگهی‌ها"
            lines.append(f"{idx}. 🎯 {name}\n   💰 {p_str} | 🔥 {disc_str} | 📍 {c_name}\n")

        await send_rubika_message(client, chat_id, "\n".join(lines), MAIN_KEYBOARD)
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
    allowed_cities = data.get("allowedCitiesCount", 1)

    if allowed_cities >= 2:
        city_status = "🏙️ شهرهای تحت پوشش: مشهد و تربت‌حیدریه (پایش همزمان ۲ شهر)"
    else:
        city_status = (
            f"🏙️ شهر فعال شما: {user_city} (قفل در این پلن)\n"
            f"⚡ امکان رصد همزمان مشهد و تربت در پلن پرطرفدار (Pro)"
        )

    status_text = (
        "💳 وضعیت اشتراک سامانه رادار خودرو:\n\n"
        f"✨ نوع اشتراک: {plan_name}\n"
        f"✅ وضعیت: فعال و در حال دریافت لحظه‌ای آگهی‌ها\n"
        f"{city_status}\n"
        "🚀 سرعت دریافت: کمتر از ۶۰ ثانیه پس از انتشار در دیوار و شیپور\n\n"
        "برای تمدید یا ارتقای اشتراک به سایت radar.digiral.ir مراجعه فرمایید."
    )
    await send_rubika_message(client, chat_id, status_text, MAIN_KEYBOARD)


async def handle_rubika_message(client: httpx.AsyncClient, update: dict) -> None:
    new_msg = update.get("new_message", {})
    chat_id = update.get("chat_id")
    text = (new_msg.get("text") or "").strip()

    if not chat_id or not text:
        return

    logger.info(f"پیام جدید در روبیکا از {chat_id}: {text}")

    # انصراف از ویزارد
    if text == "❌ انصراف":
        USER_SESSIONS.pop(str(chat_id), None)
        await send_rubika_message(client, chat_id, "عملیات لغو شد. منوی اصلی در خدمت شماست.", MAIN_KEYBOARD)
        return

    # ۱. اتصال با کد عددی سایت
    norm_text = normalize_digits(text)
    link_match = re.search(r"\b(\d{4,6})\b", norm_text)
    if not link_match:
        link_match = re.search(r"\b(RADAR-\d+)\b", norm_text, re.IGNORECASE)

    if link_match and not text.startswith("➕") and not text.startswith("🎯") and not text.startswith("📋") and not text.startswith("💳"):
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

        await send_rubika_message(client, chat_id, reply, MAIN_KEYBOARD)
        return

    # ۲. مراحل ویزارد ساخت فیلتر
    session = USER_SESSIONS.get(str(chat_id))

    # گام انتخاب شهر (در صورت فعال بودن)
    if session and session.get("step") == "city":
        if "مشهد" in text and "تربت" in text:
            session["city"] = None
            session["city_name"] = "هر دو شهر (مشهد و تربت‌حیدریه)"
        elif "مشهد" in text:
            session["city"] = "مشهد"
            session["city_name"] = "مشهد"
        else:
            session["city"] = "تربت‌حیدریه"
            session["city_name"] = "تربت‌حیدریه"

        session["step"] = "car"
        prompt = (
            f"🏙️ محدوده انتخابی: {session['city_name']}\n\n"
            f"🚗 مرحله دوم: لطفاً خودروی مورد نظرتان را برای پایش انتخاب کنید:"
        )
        await send_rubika_message(client, chat_id, prompt, CARS_KEYBOARD)
        return

    # گام انتخاب خودرو
    if session and session.get("step") == "car":
        matched = None
        for k, v in CAR_MAP.items():
            if k in text:
                matched = v
                break
        if not matched:
            matched = ("", "", text.replace("🚗", "").strip() or "تمام خودروها")

        session["make"] = matched[0]
        session["model"] = matched[1]
        session["fa_name"] = matched[2]
        session["step"] = "budget"

        prompt = (
            f"✅ خودروی انتخابی: {matched[2]}\n\n"
            f"💰 مرحله بعد: حداکثر سقف بودجه خرید خود را مشخص فرمایید:"
        )
        await send_rubika_message(client, chat_id, prompt, BUDGET_KEYBOARD)
        return

    # گام انتخاب بودجه
    if session and session.get("step") == "budget":
        b_max = None
        digits = normalize_digits(text)
        num_m = re.search(r"(\d+)", digits)
        if num_m:
            val = int(num_m.group(1))
            if val == 1:  # 1.5 میلیارد
                b_max = 1_500_000_000
            elif val > 0:
                b_max = val * 1_000_000

        session["budget_max_toman"] = b_max
        session["step"] = "mode"

        b_text = f"تا {b_max // 1_000_000} میلیون تومان" if b_max else "بدون سقف بودجه"
        prompt = (
            f"🚗 خودرو: {session.get('fa_name')}\n"
            f"💰 سقف بودجه: {b_text}\n\n"
            f"🎯 مرحله نهایی: مایلید چه آگهی‌هایی به شما پیام داده شوند؟"
        )
        await send_rubika_message(client, chat_id, prompt, MODE_KEYBOARD)
        return

    # گام انتخاب نوع آگهی و ثبت نهایی فیلتر
    if session and session.get("step") == "mode":
        USER_SESSIONS.pop(str(chat_id), None)
        is_discount = "زیر قیمت" in text
        min_disc = 5 if is_discount else 0

        fa_name = session.get("fa_name", "خودرو")
        b_max = session.get("budget_max_toman")
        b_str = f"تا {b_max // 1_000_000} میلیون" if b_max else "بدون سقف"
        mode_str = "زیر قیمت" if is_discount else "همه آگهی‌ها"
        rule_name = f"{fa_name} {b_str} ({mode_str})"
        c_label = session.get("city_name") or session.get("city") or "تربت‌حیدریه"

        payload = {
            "chatId": str(chat_id),
            "messenger": "rubika",
            "userName": "کاربر روبیکا",
            "rule": {
                "name": rule_name,
                "make": session.get("make") or None,
                "model": session.get("model") or None,
                "city": session.get("city"),
                "price_max_toman": b_max,
                "min_discount_percent": min_disc,
            },
        }

        try:
            res = await client.post(f"{API_BASE}/rules", json=payload, timeout=10.0)
            data = res.json()
            if data.get("ok"):
                success_text = (
                    f"🎉 فیلتر جدید با موفقیت در روبیکا فعال شد!\n\n"
                    f"🎯 عنوان فیلتر: «{rule_name}»\n"
                    f"🚗 خودرو: {fa_name}\n"
                    f"💰 سقف قیمت: {b_str}\n"
                    f"🔥 نوع آگهی: {mode_str}\n"
                    f"📍 محدوده پایش: {c_label} (دیوار و شیپور)\n\n"
                    f"⚡ از همین حالا، به محض ثبت آگهی مطابق با این فیلتر، فوراً به این چت ارسال خواهد شد."
                )
                await send_rubika_message(client, chat_id, success_text, MAIN_KEYBOARD)
            else:
                await send_rubika_message(client, chat_id, f"❌ خطا در ایجاد فیلتر: {data.get('message')}", MAIN_KEYBOARD)
        except Exception as e:
            logger.error(f"خطا در ثبت نهایی فیلتر در روبیکا: {e}")
            await send_rubika_message(client, chat_id, "⚠️ خطا در ثبت فیلتر. لطفاً دوباره تلاش فرمایید.", MAIN_KEYBOARD)
        return

    # ۳. کلیدهای منوی اصلی
    if "تعریف فیلتر" in text or text == "/new":
        await start_wizard_flow(client, chat_id)
        return

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
        await send_rubika_message(client, chat_id, help_link, MAIN_KEYBOARD)
        return

    if "راهنما" in text or "صدا" in text or text == "/help":
        help_msg = (
            "❓ راهنمای سامانه هوشمند رادار خودرو:\n\n"
            "این ربات آگهی‌های خودرو دیوار و شیپور شهرهای تربت‌حیدریه و مشهد را رصد کرده و آگهی‌های زیر قیمت و سودآور را به شما می‌رساند.\n\n"
            "🔔 تنظیم صدای زنگ اختصاصی برای پیام‌های روبیکا:\n"
            "۱. در بالای صفحه روی نام یا پروفایل ربات ضربه بزنید.\n"
            "۲. وارد بخش «اعلان‌ها» (Notifications) شوید.\n"
            "۳. یک صدای زنگ بلند یا صدای دزدگیر/رادار انتخاب کنید تا هر آگهی با زنگ اختصاصی به صدا درآید.\n\n"
            "🔹 گزینه‌های سریع:\n"
            "• تعریف فیلتر: انتخاب خودرو و سقف قیمت برای شکار\n"
            "• فیلترهای من: مشاهده فیلترهای فعال\n"
            "• آخرین فرصت‌ها: مشاهده ارزان‌ترین ماشین‌های امروز\n\n"
            "📞 پشتیبانی: ۰۹۹۹۹۲۱۲۲۰۹"
        )
        await send_rubika_message(client, chat_id, help_msg, MAIN_KEYBOARD)
        return

    # ۴. پیام خوش‌آمدگویی پیش‌فرض
    welcome = (
        "👋 سلام کاربر گرامی! به ربات رادار هوشمند شکار خودرو خوش آمدید.\n\n"
        "این سامانه آگهی‌های دیوار و شیپور تربت‌حیدریه و مشهد را ثانیه‌ای پایش کرده و فرصت‌های خرید زیر قیمت را فوراً به دست شما می‌رساند.\n\n"
        "👇 برای شروع از دکمه‌های منوی زیر استفاده کنید:"
    )
    await send_rubika_message(client, chat_id, welcome, MAIN_KEYBOARD)


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
