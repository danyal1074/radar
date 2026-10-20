import type { FollowupStatus, ListingSource, OpportunityLabel } from "./types";

export const SOURCE_LABEL: Record<ListingSource, string> = {
  divar: "دیوار",
  sheypoor: "شیپور",
  manual: "ثبت دستی",
  sample: "نمونه",
};

export const FOLLOWUP_LABEL: Record<FollowupStatus, string> = {
  none: "بدون پیگیری",
  watching: "در حال پیگیری",
  contacted: "تماس گرفته شد",
  negotiating: "در حال چانه‌زنی",
  bought: "خریداری شد",
  dropped: "منصرف شدم",
};

export const OPPORTUNITY_LABEL: Record<OpportunityLabel, string> = {
  opportunity: "فرصت خرید",
  needs_review: "نیازمند بررسی",
  normal: "قیمت عادی",
  missing_zero: "⚠️ احتمال اشتباه فروشنده (صفر کم)",
};
