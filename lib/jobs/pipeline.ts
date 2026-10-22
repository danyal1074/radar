import { evaluateAndNotify, type AlertRunSummary } from "../alerts/run";
import type { Store } from "../db/store";
import { runEstimation, type EstimationConfig, type EstimationSummary } from "../estimation/service";
import type { PriceEstimationProvider } from "../estimation/provider";
import { sendLiveAlert } from "../notify";
import { computeDiff } from "../pricing";
import type { ListingSourceProvider } from "../sources/provider";

export interface PipelineSummary {
  ingest: { source: string; inserted: number; updated: number; unchanged: number; error?: string }[];
  estimation: EstimationSummary | null;
  alerts: AlertRunSummary | null;
}

// Guards against two runs overlapping inside one server process.
let running = false;

/**
 * ingest → estimate → evaluate alerts. Every stage failure is recorded in
 * system_jobs and does not stop later stages that can still run.
 */
export async function runPipeline(
  store: Store,
  deps: {
    sources: ListingSourceProvider[];
    estimator: PriceEstimationProvider;
    estimationConfig: EstimationConfig;
    now?: Date;
  },
): Promise<PipelineSummary | { skipped: "already_running" }> {
  if (running) return { skipped: "already_running" };
  running = true;
  const now = deps.now ?? new Date();
  const job = await store.startJob("pipeline");
  const summary: PipelineSummary = { ingest: [], estimation: null, alerts: null };
  const errors: string[] = [];

  try {
    // Ingest sources in parallel batches to scrape all 25+ cities rapidly without timeouts
    const BATCH_SIZE = 6;
    for (let i = 0; i < deps.sources.length; i += BATCH_SIZE) {
      const batch = deps.sources.slice(i, i + BATCH_SIZE);
      const batchResults = await Promise.all(
        batch.map(async (src) => {
          try {
            const { items, isSample } = await src.fetchLatest();
            return { src, items, isSample, error: null };
          } catch (e) {
            const msg = e instanceof Error ? e.message : "خطای ناشناخته";
            return { src, items: [], isSample: false, error: msg };
          }
        }),
      );

      for (const res of batchResults) {
        if (res.error) {
          errors.push(`${res.src.id}: ${res.error}`);
          summary.ingest.push({ source: res.src.id, inserted: 0, updated: 0, unchanged: 0, error: res.error });
        } else {
          try {
            const r = await store.upsertListings(res.items, { isSample: res.isSample, now });
            summary.ingest.push({ source: res.src.id, inserted: r.inserted, updated: r.updated, unchanged: r.unchanged });
          } catch (e) {
            const msg = e instanceof Error ? e.message : "خطای دیتابیس";
            errors.push(`${res.src.id}: ${msg}`);
            summary.ingest.push({ source: res.src.id, inserted: 0, updated: 0, unchanged: 0, error: msg });
          }
        }
      }
    }

    try {
      summary.estimation = await runEstimation(store, deps.estimator, deps.estimationConfig, now);
    } catch (e) {
      errors.push(`estimation: ${e instanceof Error ? e.message : "error"}`);
    }

    try {
      summary.alerts = await evaluateAndNotify(store, now);
    } catch (e) {
      errors.push(`alerts: ${e instanceof Error ? e.message : "error"}`);
    }

    await store.finishJob(job.id, {
      status: errors.length ? "failed" : "success",
      error: errors.length ? errors.join(" | ") : null,
      metadata: JSON.parse(JSON.stringify(summary)),
    });
    return summary;
  } finally {
    running = false;
  }
}
