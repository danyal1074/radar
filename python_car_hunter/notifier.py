"""
ماژول ارسال اعلان‌های شکیل به تلگرام و پیام‌رسان بله (Bale Messenger)
"""

from __future__ import annotations

import logging
from typing import Optional

import httpx

from analyzer import HuntedCarDeal
from config import config

logger = logging.getLogger(__name__)


def format_toman(amount: int) -> str:
    """فرمت‌بندی زیبای مبلغ به تومان (مثلاً ۴۵۰,۰۰۰,۰۰۰ تومان)"""
    return f"{amount:,} تومان"


def format_deal_message(deal: HuntedCarDeal) -> str:
    """قالب‌بندی پیام شکیل، خوانا و جذاب برای نمایشگاه‌دار و شکارچی خودرو"""
    l = deal.listing
    profit_toman = deal.diff_toman
    profit_million = profit_toman / 1_000_000

    msg = (
        f"🚨 <b>شکار آگهی زیر قیمت خودرو!</b> 🚨\n\n"
        f"🚗 <b>خودرو:</b> {l.title}\n"
        f"📅 <b>سال ساخت:</b> مدل {l.year}\n"
        f"🛣 <b>کارکرد:</b> {l.mileage_km:,} کیلومتر\n"
        f"🎨 <b>رنگ:</b> {l.color}\n"
        f"📍 <b>موقعیت:</b> {l.city}\n\n"
        f"💵 <b>قیمت فروشنده دیوار:</b>\n"
        f"👉 <code>{format_toman(l.price_toman)}</code>\n\n"
        f"📊 <b>قیمت کارشناسی بازار (برآورد):</b>\n"
        f"👉 <code>{format_toman(deal.estimated_price_toman)}</code>\n\n"
        f"🔥 <b>درصد زیر قیمت:</b> {deal.discount_percent}% تخفیف\n"
        f"💰 <b>سود ناخالص تخمینی:</b> {format_toman(profit_toman)} (~{profit_million:,.1f} میلیون)\n\n"
        f"🔗 <a href='{l.url}'>مشاهده و تماس در سایت دیوار</a>\n"
        f"━━━━━━━━━━━━━━━\n"
        f"🤖 <i>رادار هوشمند خودرو (تربت‌حیدریه و خراسان)</i>"
    )
    return msg


class MultiChannelNotifier:
    """کلاس مدیریت ارسال پیام به کانال‌ها و ربات‌های تلگرام و بله"""

    def __init__(self) -> None:
        self.tg_token = config.TELEGRAM_BOT_TOKEN
        self.tg_chat_id = config.TELEGRAM_ADMIN_CHAT_ID
        self.bale_token = config.BALE_BOT_TOKEN
        self.bale_chat_id = config.BALE_ADMIN_CHAT_ID

    def send_deal(self, deal: HuntedCarDeal) -> bool:
        """ارسال یک فرصت شکار شده به هر دو بستر (تلگرام و بله)"""
        html_message = format_deal_message(deal)
        tg_ok = self.send_to_telegram(html_message)
        bale_ok = self.send_to_bale(html_message)
        return tg_ok or bale_ok

    def send_to_telegram(self, html_text: str, chat_id: Optional[str] = None) -> bool:
        """ارسال مستقیم به تلگرام از طریق Bot API"""
        token = self.tg_token
        target_chat = chat_id or self.tg_chat_id

        if not token or not target_chat:
            logger.debug("تنظیمات تلگرام (توکن یا Chat ID) خالی است.")
            return False

        url = f"https://api.telegram.org/bot{token}/sendMessage"
        payload = {
            "chat_id": target_chat,
            "text": html_text,
            "parse_mode": "HTML",
            "disable_web_page_preview": False,
        }

        try:
            with httpx.Client(timeout=10.0) as client:
                resp = client.post(url, json=payload)
                if resp.status_code == 200:
                    logger.info("پیام با موفقیت به تلگرام ارسال شد.")
                    return True
                else:
                    logger.error(f"خطا در ارسال تلگرام: {resp.status_code} - {resp.text}")
        except Exception as e:
            logger.error(f"عدم برقراری ارتباط با API تلگرام: {e}")
        return False

    def send_to_bale(self, html_text: str, chat_id: Optional[str] = None) -> bool:
        """ارسال به پیام‌رسان بله از طریق Bot API سازگار با تلگرام"""
        token = self.bale_token
        target_chat = chat_id or self.bale_chat_id

        if not token or not target_chat:
            logger.debug("تنظیمات بله (توکن یا Chat ID) خالی است.")
            return False

        # اندپوینت رسمی API بات بله
        url = f"https://tapi.bale.ai/bot{token}/sendMessage"
        payload = {
            "chat_id": target_chat,
            "text": html_text,
            "parse_mode": "HTML",
            "disable_web_page_preview": False,
        }

        try:
            with httpx.Client(timeout=10.0) as client:
                resp = client.post(url, json=payload)
                if resp.status_code == 200:
                    logger.info("پیام با موفقیت به پیام‌رسان بله ارسال شد.")
                    return True
                else:
                    logger.error(f"خطا در ارسال بله: {resp.status_code} - {resp.text}")
        except Exception as e:
            logger.error(f"عدم برقراری ارتباط با API بله: {e}")
        return False
