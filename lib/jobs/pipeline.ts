import { evaluateAndNotify, type AlertRunSummary } from "../alerts/run";
import type { Store } from "../db/store";
import { runEstimation, type EstimationConfig, type EstimationSummary } from "../estimation/service";
import type { PriceEstimationProvider } from "../estimation/provider";
import type { ListingSourceProvider } from "../sources/provider";

export interface PipelineSummary {
  ingest: { source: string; inserted: number; updated: number; unchanged: number; error?: string }[];
  estimation: EstimationSummary | null;
  alerts: AlertRunSummary | null;
}

// قفل ایمن با بازنشانی خودکار حداکثر ۵۰ ثانیه برای پایش بدون وقفه هر ۱ دقیقه
let running = false;
let runningStartedAt = 0;
const LOCK_TIMEOUT_MS = 50 * 1000;

export function resetPipelineLock(): void {
  running = false;
  runningStartedAt = 0;
}

/**
 * پایپ‌لاین کاملاً تاب‌آور (Fault-Tolerant Pipeline):
 * اگر در هر مرحله یا دقیقه‌ای خطایی رخ دهد، خطا مهار شده، قفل بلافاصله آزاد می‌شود
 * تا در چرخه دقیقه بعد پایش بدون توقف به کار خود ادامه دهد.
 */
export async function runPipeline(
  store: Store,
  deps: {
    sources: ListingSourceProvider[];
    estimator: PriceEstimationProvider;
    estimationConfig: EstimationConfig;
    now?: Date;
  },
  options: { force?: boolean } = {},
): Promise<PipelineSummary | { skipped: "already_running" }> {
  const nowMs = Date.now();
  if (running && !options.force && nowMs - runningStartedAt < LOCK_TIMEOUT_MS) {
    return { skipped: "already_running" };
  }

  running = true;
  runningStartedAt = nowMs;

  let jobId: string | null = null;
  const summary: PipelineSummary = { ingest: [], estimation: null, alerts: null };
  const errors: string[] = [];

  try {
    const now = deps.now ?? new Date();

    // ثبت شروع جاب در دیتابیس (بدون بلاک کردن در صورت خطای اتصال)
    try {
      const job = await store.startJob("pipeline");
      jobId = job?.id ?? null;
    } catch (e) {
      console.warn("[pipeline] ثبت شروع جاب در دیتابیس ناموفق بود:", e);
    }

    // ۱. دریافت آگهی‌ها از منابع (با کنترل تایم‌اوت و مهار خطای هر منبع)
    const BATCH_SIZE = 4;
    for (let i = 0; i < deps.sources.length; i += BATCH_SIZE) {
      if (i > 0) {
        await new Promise((r) => setTimeout(r, 150));
      }
      const batch = deps.sources.slice(i, i + BATCH_SIZE);
      const batchResults = await Promise.all(
        batch.map(async (src) => {
          try {
            // حداکثر ۱۰ ثانیه مهلت برای هر منبع
            const timeoutPromise = new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error("Timeout (10s)")), 10000),
            );
            const { items, isSample } = await Promise.race([src.fetchLatest(), timeoutPromise]);
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

    // ۲. کارشناسی قیمت آگهی‌های تازه (مهار خطا برای عدم وقفه)
    try {
      summary.estimation = await runEstimation(store, deps.estimator, deps.estimationConfig, now);
    } catch (e) {
      errors.push(`estimation: ${e instanceof Error ? e.message : "error"}`);
    }

    // ۳. ارسال اعلان‌ها به ربات‌ها و کانال ایتا (مهار کامل خطا)
    try {
      summary.alerts = await evaluateAndNotify(store, now);
    } catch (e) {
      errors.push(`alerts: ${e instanceof Error ? e.message : "error"}`);
    }

    // ثبت پایان موفق/ناموفق جاب
    if (jobId) {
      try {
        await store.finishJob(jobId, {
          status: errors.length ? "failed" : "success",
          error: errors.length ? errors.join(" | ") : null,
          metadata: JSON.parse(JSON.stringify(summary)),
        });
      } catch (e) {
        console.warn("[pipeline] ثبت پایان جاب در دیتابیس ناموفق بود:", e);
      }
    }

    return summary;
  } catch (fatalErr) {
    console.error("[pipeline] خطای بحرانی مهار شد:", fatalErr);
    return summary;
  } finally {
    // قفل همواره در هر شرایطی فوراً آزاد می‌شود تا چرخه بعدی بدون مشکل اجرا شود
    running = false;
  }
}
