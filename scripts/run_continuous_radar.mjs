import { getServiceStore, estimationConfig } from '../lib/db/index.ts';
import { activeSources, activeEstimator } from '../lib/jobs/default.ts';
import { runPipeline } from '../lib/jobs/pipeline.ts';

const INTERVAL_MS = 60 * 1000;

console.log("🚀 شروع موتور پایشگر مداوم رادار خودرو (مشهد + تربت حیدریه)...");
console.log(`⏱ فاصله زمانی هر چرخه: ${INTERVAL_MS / 1000} ثانیه`);

async function cycle() {
  const time = new Date().toLocaleTimeString("fa-IR");
  console.log(`\n[${time}] 🔍 در حال بررسی و شکار آگهی‌های جدید...`);
  try {
    const store = await getServiceStore();
    const summary = await runPipeline(store, {
      sources: activeSources(),
      estimator: activeEstimator(),
      estimationConfig: estimationConfig(),
    });

    if ('skipped' in summary) {
      console.log(`⚠️ چرخه رد شد: ${summary.skipped}`);
      return;
    }

    const inserted = summary.ingest.reduce((acc, s) => acc + (s.inserted || 0), 0);
    const estimated = summary.estimation?.succeeded || 0;
    const hits = summary.alerts?.hits || 0;
    const notifications = summary.alerts?.notificationsCreated || 0;

    console.log(`✅ نتیجه پایش: +${inserted} آگهی جدید | کارشناسی: ${estimated} خودرو | فرصت‌های خرید کشف‌شده: ${hits} | اعلان‌های ارسالی: ${notifications}`);
  } catch (err) {
    console.error("❌ خطا در اجرای چرخه رادار:", err);
  }
}

// First cycle
cycle().catch(console.error);

// Loop every 60 seconds
setInterval(() => {
  cycle().catch(console.error);
}, INTERVAL_MS);
