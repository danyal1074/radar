import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { evaluateAndNotify } from "@/lib/alerts/run";
import { DevStore } from "@/lib/db/dev-store";
import { MockPriceEstimationProvider } from "@/lib/estimation/mock";
import { runEstimation } from "@/lib/estimation/service";
import { PLANS, planPrice, resolveAccess, TRIAL_DAYS } from "@/lib/plans";
import { sampleListings } from "@/lib/sources/mock";
import { paymentRequestSchema } from "@/lib/validation";

let store: DevStore;
let uid: string;
const mk = async (email: string) =>
  (await store.createUser({ email, passwordHash: "h", full_name: "نام کامل", business_name: "نمایشگاه", city: "تربت", role: "dealer" }))!.id;

beforeEach(async () => {
  store = new DevStore(path.join(mkdtempSync(path.join(tmpdir(), "cr-bill-")), "db.json"));
  uid = await mk("a@x.com");
});

describe("trial & access", () => {
  it("new accounts get a trial that expires", async () => {
    const sub = await store.getSubscription(uid);
    expect(sub?.status).toBe("trialing");
    const now = new Date();
    expect(resolveAccess(sub, now).hasAccess).toBe(true);
    expect(resolveAccess(sub, now).daysLeft).toBe(TRIAL_DAYS);
    const later = new Date(now.getTime() + (TRIAL_DAYS + 1) * 86_400_000);
    expect(resolveAccess(sub, later)).toMatchObject({ hasAccess: false, reason: "expired" });
  });
  it("no subscription or canceled means no access", () => {
    expect(resolveAccess(null).hasAccess).toBe(false);
    expect(resolveAccess({ user_id: "x", plan: "pro", status: "canceled", trial_ends_at: null, current_period_end: null, created_at: "", updated_at: "" }).hasAccess).toBe(false);
  });
});

describe("plan pricing", () => {
  it("applies duration discounts with integer toman", () => {
    expect(planPrice("pro", 1)).toBe(PLANS.pro.priceToman);
    expect(planPrice("pro", 12)).toBe(Math.round(PLANS.pro.priceToman * 12 * 0.85));
    expect(Number.isInteger(planPrice("basic", 3))).toBe(true);
  });
  it("rejects trial plan and unknown durations", () => {
    expect(() => planPrice("trial", 1)).toThrow();
    expect(() => planPrice("pro", 7)).toThrow();
  });
  it("payment form schema rejects trial plan, odd months and short references", () => {
    expect(paymentRequestSchema.safeParse({ plan: "trial", months: 1, reference: "123456" }).success).toBe(false);
    expect(paymentRequestSchema.safeParse({ plan: "pro", months: 5, reference: "123456" }).success).toBe(false);
    expect(paymentRequestSchema.safeParse({ plan: "pro", months: 1, reference: "12" }).success).toBe(false);
    expect(paymentRequestSchema.safeParse({ plan: "pro", months: 1, reference: "123456" }).success).toBe(true);
  });
});

describe("payments", () => {
  const pay = (plan: "basic" | "pro", months: number, ref: string) =>
    store.createPayment({ user_id: uid, plan, months, amount_toman: planPrice(plan, months), method: "manual_card_transfer", reference: ref, note: "" });

  it("confirming activates the plan; a second review is ignored", async () => {
    const p = await pay("pro", 1, "111111");
    expect((await store.reviewPayment(p.id, "confirmed"))?.status).toBe("confirmed");
    expect(await store.reviewPayment(p.id, "confirmed")).toBeNull();
    const sub = await store.getSubscription(uid);
    expect(sub).toMatchObject({ plan: "pro", status: "active" });
    expect(resolveAccess(sub).hasAccess).toBe(true);
  });
  it("renewing the same plan extends from the current end", async () => {
    const a = await pay("pro", 1, "111111");
    await store.reviewPayment(a.id, "confirmed");
    const end1 = new Date((await store.getSubscription(uid))!.current_period_end!).getTime();
    const b = await pay("pro", 1, "222222");
    await store.reviewPayment(b.id, "confirmed");
    const end2 = new Date((await store.getSubscription(uid))!.current_period_end!).getTime();
    expect(end2).toBeGreaterThan(end1 + 27 * 86_400_000);
  });
  it("rejecting leaves the subscription untouched", async () => {
    const before = await store.getSubscription(uid);
    const p = await pay("basic", 1, "333333");
    await store.reviewPayment(p.id, "rejected");
    expect(await store.getSubscription(uid)).toEqual(before);
  });
  it("users only see their own payments", async () => {
    const other = await mk("b@x.com");
    await pay("pro", 1, "444444");
    expect(await store.listPayments({ userId: other })).toHaveLength(0);
    expect(await store.listPayments({ userId: uid })).toHaveLength(1);
  });
});

describe("alerts respect subscription", () => {
  it("an expired account receives no notifications", async () => {
    const now = new Date();
    await store.upsertListings(sampleListings(now), { isSample: true, now });
    await runEstimation(store, new MockPriceEstimationProvider(), { ttlHours: 24, failureRetryMinutes: 60, maxPerRun: 50, maxPerDay: 500, costToman: 0 }, now);
    await store.createRule(uid, { name: "همه", make: null, model: null, year_min: null, year_max: null, price_min_toman: null, price_max_toman: null, mileage_min_km: null, mileage_max_km: null, city: null, source: null, min_discount_percent: 1, min_discount_toman: null, is_active: true });
    const future = new Date(now.getTime() + 30 * 86_400_000);
    const res = await evaluateAndNotify(store, future);
    expect(res.notificationsCreated).toBe(0);
    expect(res.skippedNoAccess).toBe(1);
  });
});
