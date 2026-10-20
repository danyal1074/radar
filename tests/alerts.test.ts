import { describe, expect, it } from "vitest";
import { evaluateRule, ruleMatchesListing } from "@/lib/alerts/engine";
import type { Listing, PriceEstimate, WatchRule } from "@/lib/types";

const NOW = new Date("2026-10-18T12:00:00Z");
const listing = (o: Partial<Listing> = {}): Listing => ({
  id: "L1", source: "sample", source_post_id: "s1", source_url: null, title: "پراید ۱۳۱ مدل ۱۳۹۹",
  make: "پراید", model: "۱۳۱", trim: "SE", year: 1399, mileage_km: 90_000, color: "سفید", city: "تربت حیدریه",
  price_toman: 350_000_000, description: null, image_url: null, published_at: null,
  first_seen_at: "2026-10-18T00:00:00Z", last_seen_at: "2026-10-18T00:00:00Z", source_status: "active",
  is_sample: true, created_at: "x", updated_at: "x", ...o,
});
const est = (o: Partial<PriceEstimate> = {}): PriceEstimate => ({
  id: "E1", listing_id: "L1", provider: "mock", estimated_price_toman: 400_000_000, currency: "IRT",
  estimated_at: "2026-10-18T00:00:00Z", expires_at: "2026-10-19T00:00:00Z", status: "success", confidence: null,
  is_sample: true, request_metadata: {}, response_metadata: {}, created_at: "x", ...o,
});
const rule = (o: Partial<WatchRule> = {}): WatchRule => ({
  id: "R1", user_id: "U1", name: "پراید ۱۳۹۹", make: "پراید", model: "۱۳۱", year_min: 1399, year_max: 1399,
  price_min_toman: null, price_max_toman: 400_000_000, mileage_min_km: null, mileage_max_km: null, city: null,
  source: null, min_discount_percent: 10, min_discount_toman: null, is_active: true, created_at: "x", updated_at: "x", ...o,
});

describe("rule matching", () => {
  it("matches Persian text regardless of digit script / spacing", () => {
    expect(ruleMatchesListing(rule({ model: "131" }), listing())).toBe(true);
    expect(ruleMatchesListing(rule({ make: "پرايد" }), listing())).toBe(true); // arabic ya
  });
  it("respects year, price and mileage bounds", () => {
    expect(ruleMatchesListing(rule({ year_min: 1400, year_max: 1401 }), listing())).toBe(false);
    expect(ruleMatchesListing(rule({ price_max_toman: 300_000_000 }), listing())).toBe(false);
    expect(ruleMatchesListing(rule({ mileage_max_km: 50_000 }), listing())).toBe(false);
    expect(ruleMatchesListing(rule({ year_min: 1399 }), listing({ year: null }))).toBe(false);
  });
});

describe("evaluateRule", () => {
  it("hits when price is >=10% below a fresh estimate", () => {
    const r = evaluateRule(rule(), listing(), est(), NOW);
    expect(r.hit).toBe(true);
    if (r.hit) {
      expect(r.value.diffPercent).toBe(12.5);
      expect(r.value.dedupeKey).toBe("opportunity:U1:R1:L1");
    }
  });
  it("no hit when price is normal", () => {
    const r = evaluateRule(rule(), listing({ price_toman: 395_000_000 }), est(), NOW);
    expect(r).toEqual({ hit: false, reason: "below_threshold" });
  });
  it("no hit without an estimate", () => {
    expect(evaluateRule(rule(), listing(), null, NOW)).toEqual({ hit: false, reason: "no_fresh_estimate" });
  });
  it("no hit with an expired estimate", () => {
    const r = evaluateRule(rule(), listing(), est({ expires_at: "2026-10-18T06:00:00Z" }), NOW);
    expect(r).toEqual({ hit: false, reason: "no_fresh_estimate" });
  });
  it("no hit with a failed estimate", () => {
    const r = evaluateRule(rule(), listing(), est({ status: "failed", estimated_price_toman: null }), NOW);
    expect(r).toEqual({ hit: false, reason: "no_fresh_estimate" });
  });
  it("inactive rule and removed listing never hit", () => {
    expect(evaluateRule(rule({ is_active: false }), listing(), est(), NOW)).toEqual({ hit: false, reason: "inactive_rule" });
    expect(evaluateRule(rule(), listing({ source_status: "removed" }), est(), NOW)).toEqual({ hit: false, reason: "listing_removed" });
  });
  it("absolute toman threshold", () => {
    const r = rule({ min_discount_percent: null, min_discount_toman: 60_000_000 });
    expect(evaluateRule(r, listing(), est(), NOW).hit).toBe(false); // diff = 50M
    expect(evaluateRule(r, listing({ price_toman: 330_000_000 }), est(), NOW).hit).toBe(true); // 70M
  });
});
