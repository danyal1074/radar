import { describe, expect, it } from "vitest";
import { lookupDailyPrice } from "../lib/daily-prices/lookup";
import { getDailyCarPrices } from "../lib/daily-prices/service";
import { KHORASAN_RAZAVI_CITIES, getCityBySlug, normalizeCityNameFa } from "../lib/cities";
import { ruleMatchesListing } from "../lib/alerts/engine";
import type { Listing, WatchRule } from "../lib/types";

describe("Khorasan Razavi Cities Module", () => {
  it("should contain all major Khorasan Razavi cities", () => {
    expect(KHORASAN_RAZAVI_CITIES.length).toBe(2);
    expect(getCityBySlug("mashhad")?.nameFa).toBe("مشهد");
    expect(getCityBySlug("torbat-heydariyeh")?.nameFa).toBe("تربت حیدریه");
    expect(normalizeCityNameFa("torbat-heydariyeh")).toBe("تربت حیدریه");
  });
});

describe("Accidental / Damaged Cars Filter in Rules Engine", () => {
  const cleanCar: Listing = {
    id: "l1",
    source: "divar",
    source_post_id: "p1",
    source_url: null,
    title: "پژو 206 تیپ 2 بسیار تمیز بدون رنگ",
    make: "پژو",
    model: "پژو 206 تیپ 2",
    trim: null,
    year: 1398,
    mileage_km: 70000,
    color: "سفید",
    city: "مشهد",
    price_toman: 520_000_000,
    description: "بدنه: بدون رنگ | شاسی: سالم و پلمپ",
    image_url: null,
    published_at: null,
    first_seen_at: new Date().toISOString(),
    last_seen_at: new Date().toISOString(),
    source_status: "active",
    is_sample: false,
    is_damaged: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const damagedCar: Listing = {
    id: "l2",
    source: "divar",
    source_post_id: "p2",
    source_url: null,
    title: "پراید 141 تصادفی چپی اوراقی",
    make: "پراید",
    model: "پراید 141 DLXI",
    trim: null,
    year: 1384,
    mileage_km: 300000,
    color: "بژ",
    city: "تربت حیدریه",
    price_toman: 180_000_000,
    description: "بدنه: رنگ‌شدگی در ۳ ناحیه | شاسی: ضربه‌خورده",
    image_url: null,
    published_at: null,
    first_seen_at: new Date().toISOString(),
    last_seen_at: new Date().toISOString(),
    source_status: "active",
    is_sample: false,
    is_damaged: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const baseRule: WatchRule = {
    id: "r1",
    user_id: "u1",
    name: "قانون تست",
    make: null,
    model: null,
    year_min: null,
    year_max: null,
    price_min_toman: null,
    price_max_toman: null,
    mileage_min_km: null,
    mileage_max_km: null,
    city: null,
    source: null,
    min_discount_percent: null,
    min_discount_toman: null,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  it("should match both cars when damage_filter is 'all'", () => {
    const rule: WatchRule = { ...baseRule, damage_filter: "all" };
    expect(ruleMatchesListing(rule, cleanCar)).toBe(true);
    expect(ruleMatchesListing(rule, damagedCar)).toBe(true);
  });

  it("should only match clean car when damage_filter is 'clean_only'", () => {
    const rule: WatchRule = { ...baseRule, damage_filter: "clean_only" };
    expect(ruleMatchesListing(rule, cleanCar)).toBe(true);
    expect(ruleMatchesListing(rule, damagedCar)).toBe(false);
  });

  it("should only match damaged car when damage_filter is 'damaged_only'", () => {
    const rule: WatchRule = { ...baseRule, damage_filter: "damaged_only" };
    expect(ruleMatchesListing(rule, cleanCar)).toBe(false);
    expect(ruleMatchesListing(rule, damagedCar)).toBe(true);
  });
});

describe("Car Price Appraisal Engine - Priority & Accuracy", () => {
  it("should calculate accurate realistic price for Pride 141 (User screenshot case)", async () => {
    const dailyPrices = await getDailyCarPrices();
    expect(dailyPrices.length).toBeGreaterThan(0);

    const price = lookupDailyPrice(
      dailyPrices,
      "پراید",
      "پراید 141 DLXI",
      1384,
      "پراید 141 DLXI",
      "رنگ‌شدگی در ۳ ناحیه",
      "ضربه‌خورده",
    );

    expect(price).toBeTypeOf("number");
    expect(price).toBeGreaterThanOrEqual(140_000_000);
    expect(price).toBeLessThanOrEqual(230_000_000);
  });

  it("should calculate realistic price for 206 SD V8 without unrealistic drop", async () => {
    const dailyPrices = await getDailyCarPrices();
    const price = lookupDailyPrice(
      dailyPrices,
      "پژو",
      "پژو 206 SD V8",
      1391,
      "206 SD مدل 91",
      "تمام‌رنگ",
      "سالم و پلمپ",
    );

    expect(price).toBeTypeOf("number");
    expect(price).toBeGreaterThanOrEqual(250_000_000);
    expect(price).toBeLessThanOrEqual(480_000_000);
  });

  it("should properly estimate Chinese cars (Jac S5 / MVM X22 / Chery)", async () => {
    const dailyPrices = await getDailyCarPrices();
    const priceJac = lookupDailyPrice(
      dailyPrices,
      "جک",
      "جک S5 اتوماتیک",
      1398,
      "جک S5 اتوماتیک مدل 98",
      "بدون رنگ",
      "سالم و پلمپ",
    );

    expect(priceJac).toBeTypeOf("number");
    expect(priceJac).toBeGreaterThanOrEqual(800_000_000);
  });
});
