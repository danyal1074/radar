"""
ماژول اختصاصی اسکرپ و استخراج آگهی‌های خودرو از سایت شیپور (Sheypoor)
"""

from __future__ import annotations

import json
import logging
import re
from typing import List, Optional

import httpx

from divar_scraper import DivarCarListing, normalize_digits, is_junk_or_unrealistic

logger = logging.getLogger(__name__)


def parse_car_info(title: str) -> tuple[str, str, int]:
    t = title.strip()
    make = "سایر"
    model = t
    year = 1395

    # Look for 4-digit solar year
    m4 = re.search(r"\b(13[789]\d|140\d)\b", t)
    if m4:
        year = int(m4.group(1))
    else:
        # Look for 2-digit year after مدل
        m2 = re.search(r"مدل\s*(\d{2})\b", t)
        if m2:
            y2 = int(m2.group(1))
            year = 1400 + y2 if y2 < 30 else 1300 + y2

    makes = [
        "پژو", "پراید", "تیبا", "ساینا", "کوییک", "شاهین", "تارا", "دنا", "رانا", "سمند",
        "بسترن", "جک", "ام وی ام", "چری", "فونیکس", "فیدلیتی", "دیگنیتی", "لاماری", "هایما",
        "کیاموتورز", "کیا", "هیوندای", "تویوتا", "نیسان", "رنو", "مزدا", "چانگان", "لیفان", "برلیانس",
    ]
    for m in makes:
        if m in t:
            make = m
            break

    return make, model, year


class SheypoorScraper:
    def __init__(self, city_slug: str = "iran") -> None:
        self.city_slug = city_slug
        self.headers = {
            "User-Agent": (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
            ),
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "fa,en;q=0.9",
        }

    def fetch_listings(self, search_query: Optional[str] = None) -> List[DivarCarListing]:
        url = f"https://www.sheypoor.com/s/{self.city_slug}/car"
        params = {}
        if search_query:
            params["q"] = search_query

        try:
            with httpx.Client(timeout=15.0, headers=self.headers, follow_redirects=True) as client:
                resp = client.get(url, params=params)
                if resp.status_code != 200:
                    logger.warning(f"شیپور پاسخ ناموفق داد: {resp.status_code}")
                    return []
                html = resp.text

            return self._parse_html(html)
        except Exception as e:
            logger.error(f"خطا در اسکرپ شیپور: {e}")
            return []

    def _parse_html(self, html: str) -> List[DivarCarListing]:
        push_matches = re.findall(r'self\.__next_f\.push\(\[1,"([\s\S]*?)"\]\)', html)
        full_payload = ""
        for m in push_matches:
            try:
                full_payload += json.loads(f'"{m}"')
            except Exception:
                full_payload += m

        item_regex = re.compile(
            r'"id":"(\d+)"[\s\S]*?"title":"([^"]+)"[\s\S]*?"url":"([^"]+)"[\s\S]*?"amount":"([^"]+)"[\s\S]*?"currency":"([^"]+)"[\s\S]*?"location":"([^"]+)"'
        )
        listings: List[DivarCarListing] = []

        for match in item_regex.finditer(full_payload):
            try:
                title = match.group(2).strip()
                raw_url = match.group(3)
                amount_str = match.group(4).replace(",", "")
                currency = match.group(5)
                location = match.group(6)

                id_match = re.search(r"-(\d+)\.html", raw_url)
                token = f"sheypoor-{id_match.group(1) if id_match else match.group(1)}"

                norm_amount = normalize_digits(amount_str)
                price_toman = int(norm_amount) if norm_amount.isdigit() else 0
                if "ریال" in currency:
                    price_toman //= 10

                if price_toman < 10_000_000:
                    continue

                make, model, year = parse_car_info(title)
                if is_junk_or_unrealistic(title, price_toman, make):
                    continue
                city = location.split("،")[0].strip() if "،" in location else location

                listings.append(
                    DivarCarListing(
                        token=token,
                        title=f"{title} (شیپور)",
                        brand=make,
                        model=model,
                        year=year,
                        mileage_km=0,
                        price_toman=price_toman,
                        color="",
                        url=raw_url,
                        city=city,
                        image_url=None,
                    )
                )
            except Exception as e:
                logger.debug(f"خطا در پارس آیتم شیپور: {e}")

        logger.info(f"تعداد {len(listings)} آگهی واقعی خودرو از شیپور استخراج شد.")
        return listings
