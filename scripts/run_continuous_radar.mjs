import fs from 'node:fs';

// Load .env.local into process.env before importing any app modules
if (fs.existsSync('.env.local')) {
  const envText = fs.readFileSync('.env.local', 'utf8');
  for (const line of envText.split('\n')) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const idx = trimmed.indexOf('=');
      const key = trimmed.slice(0, idx).trim();
      const val = trimmed.slice(idx + 1).trim();
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  }
}

// Dynamically import application modules after process.env is configured
const { env } = await import('../lib/env.ts');
console.log(`🔌 بررسی اتصال پایگاه‌داده: Supabase Online = ${env.hasSupabase} (${env.supabaseUrl})`);

if (!env.hasSupabase) {
  console.error("❌ خطا: اطلاعات اتصال Supabase در دسترس نیست!");
  process.exit(1);
}

const { getServiceStore, estimationConfig } = await import('../lib/db/index.ts');
const { activeSources, activeEstimator } = await import('../lib/jobs/default.ts');
const { runPipeline } = await import('../lib/jobs/pipeline.ts');

const INTERVAL_MS = 60 * 1000;

console.log("🚀 شروع موتور پایشگر مداوم رادار خودرو (مشهد + تربت حیدریه) - متصل به دیتابیس آنلاین Supabase...");
console.log(`⏱ فاصله زمانی هر چرخه: ${INTERVAL_MS / 1000} ثانیه`);

let isRunning = false;
let lastCycleStartedAt = 0;

async function cycle() {
  const nowMs = Date.now();
  let force = false;

  if (isRunning) {
    if (nowMs - lastCycleStartedAt > 50000) {
      console.warn("⚠️ چرخه قبلی بیش از ۵۰ ثانیه طول کشید. قفل بازنشانی می‌شود و چرخه جدید با force اجرا می‌گردد.");
      isRunning = false;
      force = true;
    } else {
      console.log("⏳ چرخه قبلی هنوز در حال اجراست، منتظر می‌مانیم...");
      return;
    }
  }

  isRunning = true;
  lastCycleStartedAt = nowMs;
  const time = new Date().toLocaleTimeString("fa-IR");
  console.log(`\n[${time}] 🔍 در حال بررسی و شکار آگهی‌های جدید از دیوار و شیپور (مشهد + تربت)...`);

  try {
    const store = await getServiceStore();
    const summary = await runPipeline(
      store,
      {
        sources: activeSources(),
        estimator: activeEstimator(),
        estimationConfig: estimationConfig(),
      },
      { force }
    );

    if ('skipped' in summary) {
      console.log(`⚠️ پردازش رد شد: ${summary.skipped}`);
    } else {
      const inserted = summary.ingest.reduce((acc, s) => acc + (s.inserted || 0), 0);
      const estimated = summary.estimation?.succeeded || 0;
      const hits = summary.alerts?.hits || 0;
      const notifications = summary.alerts?.notificationsCreated || 0;

      console.log(`✅ نتیجه پایش آنلاین: +${inserted} آگهی جدید | کارشناسی: ${estimated} خودرو | فرصت‌های کشف‌شده: ${hits} | اعلان‌های ارسالی: ${notifications}`);
    }
  } catch (err) {
    console.error("❌ خطا در اجرای چرخه این دقیقه (چرخه دقیقه بعد طبق برنامه اجرا خواهد شد):", err.message || err);
  } finally {
    isRunning = false;
  }
}

// First cycle immediately
cycle().catch(console.error);

// Loop every 60 seconds
setInterval(() => {
  cycle().catch(console.error);
}, INTERVAL_MS);
