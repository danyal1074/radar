/**
 * اسکریپت شبیه‌سازی بار سنگین همزمان (Concurrency Stress Test)
 * شبیه‌سازی ورود کاربران همزمان به سامانه و اندازه‌گیری زمان پاسخ، نرخ خطا و توان سرور
 */

const TARGET_URL = "http://127.0.0.1:3010";
const CONCURRENCY = 100; // ارسال همزمان ۱۰۰ کاربر در ثانیه (دسته به دسته تا مجموع ۱۰۰۰ درخواست)
const TOTAL_REQUESTS = 1000;

console.log(`🚀 شروع تست فشار همزمان روی سامانه...`);
console.log(`🎯 آدرس هدف: ${TARGET_URL}`);
console.log(`👥 تعداد درخواست‌ها: ${TOTAL_REQUESTS} درخواست با همزمانی ${CONCURRENCY}\n`);

async function runBenchmark() {
  const startTime = Date.now();
  let completed = 0;
  let successful = 0;
  let failed = 0;
  const latencies = [];

  const queue = Array.from({ length: TOTAL_REQUESTS }, (_, i) => i + 1);

  async function worker() {
    while (queue.length > 0) {
      queue.shift();
      const reqStart = Date.now();
      try {
        const res = await fetch(TARGET_URL, {
          method: "GET",
          headers: {
            "User-Agent": "LoadTestRunner/1.0",
          },
          signal: AbortSignal.timeout(10000),
        });
        const duration = Date.now() - reqStart;
        latencies.push(duration);
        completed++;
        if (res.status >= 200 && res.status < 400) {
          successful++;
        } else {
          failed++;
        }
      } catch (err) {
        completed++;
        failed++;
        latencies.push(Date.now() - reqStart);
      }
    }
  }

  const workers = Array.from({ length: CONCURRENCY }, () => worker());
  await Promise.all(workers);

  const totalTime = (Date.now() - startTime) / 1000;
  const avgLatency = Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length);
  latencies.sort((a, b) => a - b);
  const p50 = latencies[Math.floor(latencies.length * 0.5)];
  const p95 = latencies[Math.floor(latencies.length * 0.95)];
  const rps = Math.round(completed / totalTime);

  console.log("================ نتایج تست فشار ================");
  console.log(`⏱ زمان کل اجرای تست: ${totalTime.toFixed(2)} ثانیه`);
  console.log(`📊 کل درخواست‌ها: ${completed}`);
  console.log(`✅ موفق: ${successful} (${Math.round((successful / completed) * 100)}%)`);
  console.log(`❌ ناموفق یا خطا: ${failed}`);
  console.log(`⚡ میانگین سرعت پاسخگویی: ${avgLatency} میلی‌ثانیه`);
  console.log(`📈 صدک ۵۰ (میانه پاسخ): ${p50} میلی‌ثانیه`);
  console.log(`📈 صدک ۹۵ (کندترین ۵٪): ${p95} میلی‌ثانیه`);
  console.log(`🚀 توان سرویس‌دهی: ${rps} درخواست در هر ثانیه (RPS)`);
  console.log("================================================");
}

runBenchmark();
