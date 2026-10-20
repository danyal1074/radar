import type { Store } from "../db/store";
import type { Listing } from "../types";
import { estimateSignature, toEstimateInput, type PriceEstimationProvider } from "./provider";

export interface EstimationConfig {
  ttlHours: number;
  failureRetryMinutes: number;
  maxPerRun: number;
  maxPerDay: number;
  costToman: number;
}

export interface EstimationSummary {
  considered: number;
  providerCalls: number;
  reusedFromCache: number;
  succeeded: number;
  failed: number;
  skippedByBudget: number;
  /** listing ids that got a new successful estimate (candidates for alert evaluation) */
  updatedListingIds: string[];
}

function startOfUtcDay(now: Date): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

/**
 * Fetches estimates for listings that don't have a fresh one.
 * Cost controls: (1) identical specs reuse a still-valid estimate, (2) per-run
 * and per-day call caps, (3) failed calls back off for `failureRetryMinutes`.
 * A failed/expired estimate is never presented as fresh.
 */
export async function runEstimation(
  store: Store,
  provider: PriceEstimationProvider,
  cfg: EstimationConfig,
  now: Date = new Date(),
  listingsOverride?: Listing[],
): Promise<EstimationSummary> {
  const summary: EstimationSummary = {
    considered: 0,
    providerCalls: 0,
    reusedFromCache: 0,
    succeeded: 0,
    failed: 0,
    skippedByBudget: 0,
    updatedListingIds: [],
  };

  const queue = listingsOverride ?? (await store.listingsNeedingEstimate(now, Math.max(cfg.maxPerRun * 4, 100)));

  const usedToday = (await store.usageSince(startOfUtcDay(now))).filter(
    (u) => u.kind === "estimate_request" || u.kind === "estimate_failed",
  ).length;
  let dayBudget = Math.max(0, cfg.maxPerDay - usedToday);
  let runBudget = cfg.maxPerRun;

  for (const listing of queue) {
    summary.considered++;
    const input = toEstimateInput(listing);
    const signature = estimateSignature(provider.id, input);
    const expiresAt = new Date(now.getTime() + cfg.ttlHours * 3_600_000).toISOString();

    // 1) reuse an identical, still-valid estimate (no paid call)
    const cached = await store.findFreshEstimateBySignature(signature, now);
    if (cached && cached.estimated_price_toman) {
      await store.insertEstimate({
        listing_id: listing.id,
        provider: cached.provider,
        estimated_price_toman: cached.estimated_price_toman,
        estimated_at: cached.estimated_at,
        expires_at: cached.expires_at,
        status: "success",
        confidence: cached.confidence,
        is_sample: cached.is_sample,
        request_metadata: { signature, input },
        response_metadata: { reused_from: cached.id },
      });
      await store.recordUsage({ kind: "estimate_cache_hit", provider: provider.id, cost_toman: 0 });
      summary.reusedFromCache++;
      summary.updatedListingIds.push(listing.id);
      continue;
    }

    // 2) budget guard
    if (runBudget <= 0 || dayBudget <= 0) {
      summary.skippedByBudget++;
      continue;
    }
    runBudget--;
    dayBudget--;

    // 3) provider call
    summary.providerCalls++;
    let result;
    try {
      result = await provider.estimate(input);
    } catch (err) {
      result = {
        ok: false as const,
        retryable: true,
        error: err instanceof Error ? err.message : "خطای ناشناخته سرویس تخمین",
      };
    }

    if (result.ok && result.priceToman > 0) {
      await store.insertEstimate({
        listing_id: listing.id,
        provider: provider.id,
        estimated_price_toman: result.priceToman,
        estimated_at: now.toISOString(),
        expires_at: expiresAt,
        status: "success",
        confidence: result.confidence,
        is_sample: provider.isSample,
        request_metadata: { signature, input },
        response_metadata: { response_id: result.responseId, ...result.raw },
      });
      await store.recordUsage({ kind: "estimate_request", provider: provider.id, cost_toman: cfg.costToman });
      summary.succeeded++;
      summary.updatedListingIds.push(listing.id);
    } else {
      const error = result.ok ? "پاسخ سرویس نامعتبر بود" : result.error;
      // Back off: the failed row's expires_at marks the earliest retry time.
      const retryAt = new Date(now.getTime() + cfg.failureRetryMinutes * 60_000).toISOString();
      await store.insertEstimate({
        listing_id: listing.id,
        provider: provider.id,
        estimated_price_toman: null,
        estimated_at: now.toISOString(),
        expires_at: retryAt,
        status: "failed",
        confidence: null,
        is_sample: provider.isSample,
        request_metadata: { signature, input },
        response_metadata: { error },
      });
      await store.recordUsage({ kind: "estimate_failed", provider: provider.id, cost_toman: 0 });
      summary.failed++;
    }
  }

  return summary;
}
