export type CarBrand =
  | "ایران خودرو"
  | "سایپا"
  | "پارس خودرو"
  | "مدیران خودرو"
  | "کرمان موتور"
  | "گروه بهمن"
  | "سایر";

export interface DailyCarPrice {
  id: string;
  brand: CarBrand;
  name: string;
  year: string;
  priceToman: number;
  isDiscontinued: boolean;
  source: "baravard.com" | "z4car.com" | "car.ir" | "bama.ir" | "iranjib.ir" | "manual";
  updatedAt: string;
  isEditedByAdmin?: boolean;
}

export interface DailyPricesState {
  lastUpdated: string;
  sourceName: string;
  totalCount: number;
  prices: DailyCarPrice[];
}
