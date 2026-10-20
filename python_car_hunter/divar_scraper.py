"""
ماژول اختصاصی اسکرپ و استخراج آگهی‌های خودرو از سایت دیوار
"""

from __future__ import annotations

import json
import logging
import re
from dataclasses import dataclass
from typing import List, Optional
import urllib.parse

import httpx
from bs4 import BeautifulSoup

from config import config

logger = logging.getLogger(__name__)


@dataclass
class DivarCarListing:
    token: str
    title: str
    brand: str
    model: str
    year: int
    mileage_km: int
    price_toman: int
    color: str
    url: str
    city: str
    image_url: Optional[str] = None


def normalize_digits(text: str) -> str:
    """تبدیل اعداد فارسی و عربی به اعداد انگلیسی استاندارد"""
    if not text:
        return ""
    trans = str.maketrans("۰۱۲۳۴۵۶۷۸۹٠١٢٣٤٥٦٧٨٩", "01234567890123456789")
    return text.translate(trans)


JUNK_KEYWORDS = [
    "فیش", "فروش فیش", "فیش ثبت نام", "فیش ثبت‌نام", "کارتکس",
    "حواله", "دعوتنامه", "دعوت نامه", "ثبت نام", "ثبت‌نام", "امتیاز", "پیش فروش", "پیش‌فروش",
    "قرعه کشی", "قرعه‌کشی", "طرح مادران", "طرح فرسوده", "سهمیه",
    "خریدار", "خریداریم", "خریدارم", "خریدار واقعی", "نیازمند", "نیازمند خودرو",
    "معاوضه با ملک", "معاوضه با زمین", "معاوضه با اپارتمان", "معاوضه با آپارتمان",
    "معاوضه با باغ", "معاوضه با خانه", "معاوضه با مغازه", "معاوضه با واحد",
    "اوراقی", "اسقاطی"
]


def is_junk_or_unrealistic(title: str, price_toman: int, brand: str = "") -> bool:
    """شناسایی آگهی‌های اسپم، حواله و غیرواقعی بدون حذف آگهی‌های دارای احتمال صفر اضافه"""
    t = (title or "").strip().lower()

    if len(t) < 4 or t in ["ماشین", "خودرو"]:
        return True

    for kw in JUNK_KEYWORDS:
        if kw in t:
            return True

    if price_toman > 0 and price_toman < 10_000_000:
        return True

    return False



class DivarScraper:
    def __init__(self, city_slug: Optional[str] = None) -> None:
        self.city_slug = city_slug or config.DIVAR_CITY_SLUG
        self.base_url = "https://divar.ir"
        self.headers = {
            "User-Agent": (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/124.0.0.0 Safari/537.36"
            ),
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
            "Accept-Language": "fa-IR,fa;q=0.9,en-US;q=0.8,en;q=0.7",
        }

    def _build_url(self, search_query: Optional[str] = None) -> str:
        """ساخت آدرس صفحه آگهی‌های خودرو دیوار بر اساس شهر و کلیدواژه جستجو"""
        path = f"/s/{self.city_slug}/{config.DIVAR_CATEGORY}"
        if search_query:
            params = urllib.parse.urlencode({"q": search_query})
            return f"{self.base_url}{path}?{params}"
        return f"{self.base_url}{path}"

    def fetch_listings(self, search_query: Optional[str] = None) -> List[DivarCarListing]:
        """
        اسکرپ و استخراج لیست آگهی‌های خودرو
        ابتدا داده‌های ساختاریافته Schema.org LD+JSON صفحه را پردازش می‌کند.
        در صورت نبود، به صورت Fallback ویجت‌های کارت‌های HTML را استخراج می‌کند.
        """
        target_url = self._build_url(search_query)
        logger.info(f"شروع استخراج آگهی‌های دیوار از: {target_url}")

        try:
            with httpx.Client(timeout=15.0, headers=self.headers, follow_redirects=True) as client:
                response = client.get(target_url)
                response.raise_for_status()
                html = response.text
        except Exception as e:
            logger.error(f"خطا در برقراری ارتباط با دیوار: {e}")
            return []

        listings = self._parse_schema_ld_json(html)
        if not listings:
            logger.warning("داده‌های JSON-LD یافت نشد، در حال تلاش با استخراج مستقیم از ساختار HTML...")
            listings = self._parse_html_cards(html)

        # فیلتر قیمت‌های صوری و غیرواقعی (پیش‌پرداخت‌ها، اقساط یا توافقی‌های زیر ۲۰۰ میلیون)
        valid_listings = [
            item for item in listings
            if item.price_toman >= config.MIN_VALID_PRICE_TOMAN and item.year > 0
        ]
        logger.info(f"تعداد {len(listings)} آگهی دریافت و {len(valid_listings)} آگهی معتبر تایید شد.")
        return valid_listings

    def _parse_schema_ld_json(self, html: str) -> List[DivarCarListing]:
        """استخراج سریع و دقیق از تگ‌های application/ld+json در کدهای SSR دیوار"""
        listings: List[DivarCarListing] = []
        
        # استفاده از regex مطمئن و بدون وابستگی به نودهای داخلی BeautifulSoup
        raw_scripts = re.findall(r'<script type="application/ld\+json"[^>]*>(.*?)</script>', html, re.DOTALL)
        for text in raw_scripts:
            if not text.strip():
                continue
            try:
                data = json.loads(text)
            except Exception:
                continue

            items = data if isinstance(data, list) else [data]
            for car in items:
                if not isinstance(car, dict) or car.get("@type") != "Car":
                    continue

                title = car.get("name") or car.get("web_info", {}).get("title") or ""
                url = car.get("url") or ""
                token_match = re.search(r"/([a-zA-Z0-9_-]+)(?:/)?$", url)
                token = token_match.group(1) if token_match else url

                brand_data = car.get("brand")
                brand = brand_data.get("name", "") if isinstance(brand_data, dict) else str(brand_data or "")
                model = car.get("model", "")
                color = car.get("color", "نامشخص")
                city = car.get("web_info", {}).get("city_persian", self.city_slug)
                image_url = car.get("image")

                # استخراج سال ساخت شمسی
                year_raw = car.get("productionDate", "0")
                try:
                    year = int(normalize_digits(str(year_raw)))
                except ValueError:
                    year = 0

                # استخراج کارکرد بر حسب کیلومتر
                mileage_raw = car.get("mileageFromOdometer", {}).get("value", "0")
                try:
                    mileage_km = int(normalize_digits(str(mileage_raw)))
                except ValueError:
                    mileage_km = 0

                # استخراج قیمت به تومان (قیمت LD دیوار به ریال است: ریال تقسیم بر ۱۰ = تومان)
                price_rial_raw = car.get("offers", {}).get("price", "0")
                try:
                    price_rial = int(normalize_digits(str(price_rial_raw)))
                    price_toman = price_rial // 10
                except ValueError:
                    price_toman = 0

                if token and title and price_toman > 0:
                    if is_junk_or_unrealistic(title, price_toman, brand):
                        continue
                    listings.append(
                        DivarCarListing(
                            token=token,
                            title=title,
                            brand=brand,
                            model=model,
                            year=year,
                            mileage_km=mileage_km,
                            price_toman=price_toman,
                            color=color,
                            url=url,
                            city=city,
                            image_url=image_url,
                        )
                    )

        return listings

    def _parse_html_cards(self, html: str) -> List[DivarCarListing]:
        """روش رزرو: استخراج اطلاعات از کارت‌های بصری HTML دیوار"""
        listings: List[DivarCarListing] = []
        soup = BeautifulSoup(html, "html.parser")
        cards = soup.select(".kt-post-card")

        for card in cards:
            link_tag = card.select_one("a.kt-post-card__action")
            if not link_tag:
                continue

            href = link_tag.get("href", "")
            url = f"{self.base_url}{href}" if href.startswith("/") else href
            token_match = re.search(r"/([a-zA-Z0-9_-]+)(?:/)?$", href)
            token = token_match.group(1) if token_match else href

            title_tag = card.select_one(".kt-post-card__title")
            title = title_tag.get_text(strip=True) if title_tag else ""

            descriptions = [d.get_text(strip=True) for d in card.select(".kt-post-card__description")]
            mileage_km = 0
            price_toman = 0

            for desc in descriptions:
                norm_desc = normalize_digits(desc)
                if "کیلومتر" in desc:
                    digits = re.sub(r"[^\d]", "", norm_desc)
                    if digits:
                        mileage_km = int(digits)
                elif "تومان" in desc:
                    digits = re.sub(r"[^\d]", "", norm_desc)
                    if digits:
                        price_toman = int(digits)

            # تلاش برای استخراج سال ساخت از متن عنوان (مثلاً ۹۷، ۱۴۰۱ یا ۱۳۸۵)
            year_match = re.search(r"(?:مدل\s*)?(1[34]\d{2}|\b[89]\d\b)", normalize_digits(title))
            year = 0
            if year_match:
                raw_y = int(year_match.group(1))
                year = 1300 + raw_y if raw_y < 100 else raw_y

            img_tag = card.select_one("img")
            image_url = img_tag.get("src") if img_tag else None

            if token and title and price_toman > 0:
                if is_junk_or_unrealistic(title, price_toman, ""):
                    continue
                listings.append(
                    DivarCarListing(
                        token=token,
                        title=title,
                        brand="",
                        model="",
                        year=year,
                        mileage_km=mileage_km,
                        price_toman=price_toman,
                        color="نامشخص",
                        url=url,
                        city=self.city_slug,
                        image_url=image_url,
                    )
                )

        return listings
