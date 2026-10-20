"""
ماژول تحلیل و مقایسه قیمت‌ها، محاسبه سود تخمینی و فیلتر گزینه‌های شکار
"""

from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import List, Optional

from baravard_evaluator import BaravardEvaluator
from config import config
from divar_scraper import DivarCarListing

logger = logging.getLogger(__name__)


@dataclass
class HuntedCarDeal:
    listing: DivarCarListing
    estimated_price_toman: int
    diff_toman: int
    discount_percent: float
    is_opportunity: bool


class CarDealAnalyzer:
    def __init__(self, evaluator: Optional[BaravardEvaluator] = None) -> None:
        self.evaluator = evaluator or BaravardEvaluator()

    def analyze_listing(self, listing: DivarCarListing) -> Optional[HuntedCarDeal]:
        """ارزیابی تک آگهی و محاسبه درصد زیر قیمت بودن"""
        estimated_price = self.evaluator.get_estimated_price(
            brand=listing.brand,
            model=listing.model,
            year=listing.year,
            mileage_km=listing.mileage_km,
            title=listing.title,
        )

        if not estimated_price or estimated_price <= 0:
            return None

        diff_toman = estimated_price - listing.price_toman
        discount_percent = (diff_toman / estimated_price) * 100.0

        min_pct = config.MIN_DISCOUNT_PERCENT * 100.0
        # اگر تخفیف بالای ۶۰ درصد باشد، احتمال اشتباه تایپی (کم گذاشتن صفر) است و نباید به عنوان فرصت خرید مخابره شود
        is_missing_zero = False
        if discount_percent >= 60.0:
            times10 = listing.price_toman * 10
            times100 = listing.price_toman * 100
            if (estimated_price * 0.5 <= times10 <= estimated_price * 1.6) or (estimated_price * 0.5 <= times100 <= estimated_price * 1.6):
                is_missing_zero = True
            else:
                is_missing_zero = True # هر اختلاف بالای ۶۰٪ در بازار واقعی نامعتبر است

        is_opportunity = (discount_percent >= min_pct) and (diff_toman > 0) and (not is_missing_zero)

        return HuntedCarDeal(
            listing=listing,
            estimated_price_toman=estimated_price,
            diff_toman=diff_toman,
            discount_percent=round(discount_percent, 1),
            is_opportunity=is_opportunity,
        )

    def hunt_opportunities(
        self,
        listings: List[DivarCarListing],
        min_discount_percent: Optional[float] = None,
    ) -> List[HuntedCarDeal]:
        """
        ارزیابی دسته‌جمعی آگهی‌ها، فیلتر موارد زیر قیمت و مرتب‌سازی نزولی بر اساس درصد تخفیف
        """
        threshold = (min_discount_percent if min_discount_percent is not None else config.MIN_DISCOUNT_PERCENT) * 100.0
        deals: List[HuntedCarDeal] = []

        for listing in listings:
            deal = self.analyze_listing(listing)
            if deal and deal.discount_percent >= threshold and deal.diff_toman > 0:
                deals.append(deal)

        # مرتب‌سازی: بیشترین درصد تخفیف و بیشترین سود در ردیف اول قرار می‌گیرد
        deals.sort(key=lambda d: d.discount_percent, reverse=True)
        logger.info(f"از میان {len(listings)} آگهی، تعداد {len(deals)} گزینه شکار پیدا شد.")
        return deals
