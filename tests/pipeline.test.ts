import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { evaluateAndNotify } from "@/lib/alerts/run";
import { DevStore } from "@/lib/db/dev-store";
import { MockPriceEstimationProvider } from "@/lib/estimation/mock";
import { runEstimation, type EstimationConfig } from "@/lib/estimation/service";
import { runPipeline } from "@/lib/jobs/pipeline";
import { MockListingSourceProvider, sampleListings } from "@/lib/sources/mock";
import type { WatchRuleInput } from "@/lib/types";

const NOW = new Date("2026-10-18T12:00:00Z");
const cfg: EstimationConfig = { ttlHours: 24, failureRetryMinutes: 60, maxPerRun: 50, maxPerDay: 500, costToman: 1000 };
const ruleInput = (o: Partial<WatchRuleInput> = {}): WatchRuleInput => ({
  name: "پراید", make: "پراید", model: null, year_min: null, year_max: null, price_min_toman: null,
  price_max_toman: 500_000_000, mileage_min_km: null, mileage_max_km: null, city: null, source: null,
  min_discount_percent: 10, min_discount_toman: null, is_active: true, ...o,
});

let store: DevStore;
let u1: string;
let u2: string;

beforeEach(async () => {
  store = new DevStore(path.join(mkdtempSync(path.join(tmpdir(), "cr-")), "db.json"));
  u1 = (await store.createUser({ email: "a@x.com", passwordHash: "h", full_name: "الف", business_name: "ن۱", city: "تربت", role: "dealer" }))!.id;
  u2 = (await store.createUser({ email: "b@x.com", passwordHash: "h", full_name: "ب", business_name: "ن۲", city: "تربت", role: "dealer" }))!.id;
  await store.upsertListings(sampleListings(NOW), { isSample: true, now: NOW });
});

describe("listing ingest", () => {
  it("dedupes on (source, source_post_id) and tracks price changes", async () => {
    const again = await store.upsertListings(sampleListings(NOW), { isSample: true, now: NOW });
    expect(again).toMatchObject({ inserted: 0, updated: 0, unchanged: 10 });
    const changed = sampleListings(NOW).map((l, i) => (i === 0 ? { ...l, price_toman: 320_000_000 } : l));
    const r = await store.upsertListings(changed, { isSample: true, now: NOW });
    expect(r).toMatchObject({ inserted: 0, updated: 1, priceChanges: 1 });
    const all = await store.listListings();
    expect(all).toHaveLength(10);
    const first = all.find((l) => l.source_post_id === "sample-1")!;
    expect((await store.getPriceHistory(first.id)).map((p) => p.price_toman)).toEqual([330_000_000, 320_000_000]);
  });
  it("drops source URLs that are not https on divar/sheypoor", async () => {
    const item = { ...sampleListings(NOW)[0], source: "manual" as const, source_post_id: "m1", source_url: "https://evil.example.com/x" };
    await store.upsertListings([item, { ...item, source_post_id: "m2", source_url: "https://divar.ir/v/abc" }], { isSample: false, now: NOW });
    const l = await store.listListings();
    expect(l.find((x) => x.source_post_id === "m1")!.source_url).toBeNull();
    expect(l.find((x) => x.source_post_id === "m2")!.source_url).toBe("https://divar.ir/v/abc");
  });
});

describe("estimation service", () => {
  it("fetches estimates, reuses identical specs and records usage", async () => {
    const provider = new MockPriceEstimationProvider();
    const s1 = await runEstimation(store, provider, cfg, NOW);
    expect(s1.providerCalls + s1.reusedFromCache).toBeGreaterThan(0);
    expect(s1.failed).toBe(1); // the "unknown car" has no data -> failed, not invented
    const s2 = await runEstimation(store, provider, cfg, NOW);
    expect(s2.providerCalls).toBe(0); // everything fresh, failed one backing off
  });
  it("does not retry a failed estimate before the back-off window", async () => {
    const p = new MockPriceEstimationProvider();
    await runEstimation(store, p, cfg, NOW);
    const later = new Date(NOW.getTime() + 30 * 60_000);
    expect((await runEstimation(store, p, cfg, later)).providerCalls).toBe(0);
    const afterBackoff = new Date(NOW.getTime() + 61 * 60_000);
    expect((await runEstimation(store, p, cfg, afterBackoff)).providerCalls).toBe(1);
  });
  it("expired estimates are re-requested", async () => {
    const p = new MockPriceEstimationProvider();
    await runEstimation(store, p, cfg, NOW);
    const next = new Date(NOW.getTime() + 25 * 3_600_000);
    expect((await runEstimation(store, p, cfg, next)).providerCalls).toBeGreaterThan(0);
  });
  it("honours per-run budget", async () => {
    const p = new MockPriceEstimationProvider();
    const s = await runEstimation(store, p, { ...cfg, maxPerRun: 2 }, NOW);
    expect(s.providerCalls).toBeLessThanOrEqual(2);
    expect(s.skippedByBudget).toBeGreaterThan(0);
  });
  it("a provider failure never produces a usable estimate", async () => {
    const p = new MockPriceEstimationProvider({ failForModels: ["پراید"] });
    await runEstimation(store, p, cfg, NOW);
    const ls = await store.listListings();
    const est = await store.latestEstimates(ls.map((l) => l.id));
    for (const l of ls.filter((x) => x.make === "پراید")) {
      expect(est.get(l.id)!.status).toBe("failed");
      expect(est.get(l.id)!.estimated_price_toman).toBeNull();
    }
  });
});

describe("alerts end to end", () => {
  it("creates notifications only for matching low-priced listings, never duplicates, per user", async () => {
    await store.createRule(u1, ruleInput());
    await runEstimation(store, new MockPriceEstimationProvider(), cfg, NOW);
    const r1 = await evaluateAndNotify(store, NOW);
    expect(r1.notificationsCreated).toBeGreaterThan(0);
    const r2 = await evaluateAndNotify(store, NOW);
    expect(r2.notificationsCreated).toBe(0);
    expect(r2.duplicatesSkipped).toBe(r1.notificationsCreated);

    const n1 = await store.listNotifications(u1);
    expect(n1.length).toBe(r1.notificationsCreated);
    expect(n1.every((n) => n.body.includes("قیمت نمونه"))).toBe(true);
    // user 2 has no rules -> sees nothing, and cannot see user 1's rows
    expect(await store.listNotifications(u2)).toHaveLength(0);
    expect(await store.listRules(u2)).toHaveLength(0);
  });
  it("no estimate -> no price alert", async () => {
    await store.createRule(u1, ruleInput());
    const r = await evaluateAndNotify(store, NOW);
    expect(r.hits).toBe(0);
  });
  it("accounts without access get no alerts", async () => {
    await store.createRule(u1, ruleInput());
    await runEstimation(store, new MockPriceEstimationProvider(), cfg, NOW);
    await store.setSubscription(u1, { plan: "trial", status: "expired", trial_ends_at: "2026-01-01T00:00:00Z" });
    const r = await evaluateAndNotify(store, NOW);
    expect(r.notificationsCreated).toBe(0);
    expect(r.skippedNoAccess).toBe(1);
  });
  it("users cannot modify or read each other's rules / follow-ups / saved", async () => {
    const rule = await store.createRule(u1, ruleInput());
    expect(await store.updateRule(u2, rule.id, ruleInput({ name: "hack" }))).toBeNull();
    expect(await store.deleteRule(u2, rule.id)).toBe(false);
    expect(await store.setRuleActive(u2, rule.id, false)).toBeNull();
    const l = (await store.listListings())[0];
    await store.setSaved(u1, l.id, true);
    await store.upsertFollowup(u1, l.id, { status: "watching", notes: "secret", next_followup_at: null });
    expect(await store.listSavedIds(u2)).toEqual([]);
    expect(await store.listFollowups(u2)).toEqual([]);
  });
});

describe("pipeline", () => {
  it("runs ingest -> estimate -> alerts and logs a job", async () => {
    await store.createRule(u1, ruleInput());
    const res = await runPipeline(store, {
      sources: [new MockListingSourceProvider()],
      estimator: new MockPriceEstimationProvider(),
      estimationConfig: cfg,
      now: NOW,
    });
    expect("skipped" in res).toBe(false);
    const jobs = await store.recentJobs(5);
    expect(jobs[0]).toMatchObject({ job_type: "pipeline", status: "success" });
  });
});

describe("billing", () => {
  it("confirming a payment activates / extends the subscription", async () => {
    const p = await store.createPayment({ user_id: u1, plan: "pro", months: 3, amount_toman: 2_821_500, method: "manual_card_transfer", reference: "123456", note: "" });
    const done = await store.reviewPayment(p.id, "confirmed");
    expect(done?.status).toBe("confirmed");
    const sub = await store.getSubscription(u1);
    expect(sub).toMatchObject({ plan: "pro", status: "active" });
    expect(new Date(sub!.current_period_end!).getTime()).toBeGreaterThan(Date.now() + 80 * 86_400_000);
    expect(await store.reviewPayment(p.id, "confirmed")).toBeNull(); // not twice
  });
});
