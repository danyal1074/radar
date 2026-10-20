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
    for (const src of deps.sources) {
      try {
        const { items, isSample } = await src.fetchLatest();
        const r = await store.upsertListings(items, { isSample, now });
        summary.ingest.push({ source: src.id, inserted: r.inserted, updated: r.updated, unchanged: r.unchanged });
      } catch (e) {
        const msg = e instanceof Error ? e.message : "خطای ناشناخته";
        errors.push(`${src.id}: ${msg}`);
        summary.ingest.push({ source: src.id, inserted: 0, updated: 0, unchanged: 0, error: msg });
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
