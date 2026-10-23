export interface MarketingConfig {
  divarPhone: string;
  divarToken: string;
  sheypoorPhone: string;
  sheypoorToken: string;
  adLink: string; // لینک آگهی معرفی شما در دیوار
  sheypoorAdLink: string; // لینک آگهی شما در شیپور (اختیاری)
  template: string; // قالب پیام
  dailyLimit: number; // سقف پیام روزانه (پیش‌فرض ۲۵)
  delaySeconds: number; // فاصله ارسال‌ها (پیش‌فرض ۶۰ ثانیه)
  autoSendEnabled: boolean;
  minPriceToman?: number;
  maxPriceToman?: number;
  targetCity?: string;
}

export interface MarketingLogItem {
  id: string;
  listingId: string;
  source: "divar" | "sheypoor";
  postToken: string;
  carTitle: string;
  priceToman: number;
  city: string;
  messageText: string;
  status: "sent" | "failed" | "skipped";
  errorMessage?: string;
  sentAt: string;
}

export interface MarketingStorage {
  config: MarketingConfig;
  logs: MarketingLogItem[];
}
