import { describe, expect, it } from "vitest";
import { formatToman, parseLooseNumber, rialToToman, tomanToRial } from "@/lib/money";
import { compare, computeDiff, isEstimateFresh, opportunityScore } from "@/lib/pricing";
import type { PriceEstimate } from "@/lib/types";

const est = (over: Partial<PriceEstimate> = {}): PriceEstimate => ({
  id: "e1", listing_id: "l1", provider: "mock", estimated_price_toman: 400_000_000, currency: "IRT",
  estimated_at: "2026-10-18T00:00:00Z", expires_at: "2026-10-19T00:00:00Z", status: "success",
  confidence: null, is_sample: true, request_metadata: {}, response_metadata: {}, created_at: "2026-10-18T00:00:00Z",
  ...over,
});
const NOW = new Date("2026-10-18T12:00:00Z");

describe("rial/toman conversion", () => {
  it("converts both ways explicitly", () => {
    expect(rialToToman(4_000_000_000)).toBe(400_000_000);
    expect(tomanToRial(400_000_000)).toBe(4_000_000_000);
    expect(rialToToman(tomanToRial(123_456))).toBe(123_456);
  });
  it("rejects negative / NaN", () => {
    expect(() => rialToToman(-1)).toThrow();
    expect(() => tomanToRial(NaN)).toThrow();
  });
  it("parses Persian digits and separators", () => {
    expect(parseLooseNumber("۴۰۰٬۰۰۰٬۰۰۰")).toBe(400_000_000);
    expect(parseLooseNumber("400,000")).toBe(400_000);
    expect(parseLooseNumber("abc")).toBeNull();
  });
  it("formats with thousands separators", () => {
    expect(formatToman(400_000_000)).toContain("۴۰۰");
    expect(formatToman(null)).toBe("—");
  });
});

describe("computeDiff", () => {
  it("diff = estimate - price; percent = diff / estimate * 100", () => {
    expect(computeDiff(360_000_000, 400_000_000)).toEqual({ diffToman: 40_000_000, diffPercent: 10 });
  });
  it("negative when listing is above the estimate", () => {
    expect(computeDiff(440_000_000, 400_000_000)).toEqual({ diffToman: -40_000_000, diffPercent: -10 });
  });
  it("never divides by zero / invalid estimate", () => {
    expect(computeDiff(100, 0)).toBeNull();
    expect(computeDiff(100, -5)).toBeNull();
    expect(computeDiff(100, null)).toBeNull();
    expect(computeDiff(100, Number.NaN)).toBeNull();
    expect(computeDiff(0, 100)).toBeNull();
  });
});

describe("estimate freshness", () => {
  it("fresh success", () => expect(isEstimateFresh(est(), NOW)).toBe(true));
  it("expired is not fresh", () => expect(isEstimateFresh(est({ expires_at: "2026-10-18T11:00:00Z" }), NOW)).toBe(false));
  it("failed is not fresh", () => expect(isEstimateFresh(est({ status: "failed", estimated_price_toman: null }), NOW)).toBe(false));
  it("null estimate", () => expect(isEstimateFresh(null, NOW)).toBe(false));
});

describe("compare / label / score", () => {
  it("opportunity when >= 8% cheaper with fresh estimate", () => {
    const c = compare(360_000_000, est(), NOW);
    expect(c.label).toBe("opportunity");
    expect(c.diffPercent).toBe(10);
  });
  it("expired estimate yields no diff and never an opportunity", () => {
    const c = compare(300_000_000, est({ expires_at: "2026-10-18T01:00:00Z" }), NOW);
    expect(c).toMatchObject({ fresh: false, diffPercent: null, diffToman: null, label: "normal" });
  });
  it("no estimate -> normal", () => {
    expect(compare(300_000_000, null, NOW).label).toBe("normal");
  });
  it("score is null without fresh estimate, bounded 0..100 otherwise", () => {
    expect(opportunityScore(compare(300_000_000, null, NOW), null)).toBeNull();
    const s = opportunityScore(compare(200_000_000, est(), NOW), 1)!;
    expect(s).toBeGreaterThan(0);
    expect(s).toBeLessThanOrEqual(100);
    expect(opportunityScore(compare(500_000_000, est(), NOW), null)).toBe(0);
  });
});
