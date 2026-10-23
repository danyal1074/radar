/**
 * سرویس پایش خودکار و پیوسته رادار خودرو (نسخه آزمایشی: تربت‌حیدریه + مشهد)
 * مقاوم در برابر خطا و قطعی، با قابلیت بازنشانی خودکار قفل و تلاش مجدد هر ۱ دقیقه
 */

const CRON_URL = "http://127.0.0.1:3000/api/cron/pipeline";
const PRICES_CRON_URL = "http://127.0.0.1:3000/api/cron/daily-prices";
const CRON_SECRET = process.env.CRON_SECRET || "dev-cron-secret-16-chars-long";
const INTERVAL_SECONDS = 60;

let consecutiveSkips = 0;
let lastPricesUpdateDate = "";

console.log("⚡ شروع پایشگر پایدار رادار خودرو (تربت‌حیدریه + مشهد)...");
console.log(`⏱ زمان هر چرخه پایش آگهی‌ها: هر ${INTERVAL_SECONDS} ثانیه یک‌بار`);

async function checkDailyPrices() {
  try {
    const tehranTimeStr = new Date().toLocaleString("en-US", { timeZone: "Asia/Tehran" });
    const tehranDate = new Date(tehranTimeStr);
    const hour = tehranDate.getHours();
    const todayStr = tehranDate.toISOString().split("T")[0];

    if (hour >= 15 && lastPricesUpdateDate !== todayStr) {
      console.log(`\n📊 [ساعت ۱۵:۰۰] در حال بروزرسانی خودکار روزانه قیمت‌های بازار از سایت baravard.com ...`);
      const res = await fetch(PRICES_CRON_URL, {
        headers: { Authorization: `Bearer ${CRON_SECRET}` },
        signal: AbortSignal.timeout(30000),
      });
      if (res.ok) {
        const data = await res.json();
        lastPricesUpdateDate = todayStr;
        console.log(`✅ [ساعت ۱۵:۰۰] بروزرسانی قیمت‌ها انجام شد (${data.result?.count ?? 0} خودرو ثبت شد).`);
      }
    }
  } catch (err) {
    console.error("⚠️ خطا در سرویس بروزرسانی قیمت روزانه:", err.message);
  }
}

async function runCycle() {
  const time = new Date().toLocaleTimeString("fa-IR");
  console.log(`\n[${time}] 🔍 در حال پایش لحظه‌ای آگهی‌های خودرو (تربت‌حیدریه + مشهد)...`);

  try {
    // اگر چرخه قبل قفل مانده بود، با ارسال force=1 قفل را آزاد کن
    const url = consecutiveSkips >= 1 ? `${CRON_URL}?force=1` : CRON_URL;
    const res = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${CRON_SECRET}`,
      },
      signal: AbortSignal.timeout(45000), // حداکثر ۴۵ ثانیه مهلت برای پاسخ
    });

    if (res.ok) {
      const data = await res.json();
      if (data.result?.skipped === "already_running") {
        consecutiveSkips++;
        console.log(`⏳ پردازش در جریان است (شمارنده: ${consecutiveSkips}). در صورت طولانی شدن در دقیقه بعد قفل باز می‌شود.`);
      } else {
        consecutiveSkips = 0;
        const sources = data.result?.ingest || [];
        const totalNew = sources.reduce((acc, x) => acc + (x.inserted || 0), 0);
        const summaryList = sources
          .filter((x) => (x.inserted || 0) > 0 || (x.unchanged || 0) > 0)
          .map((x) => `${x.source.replace("divar-", "دیوار ").replace("sheypoor-", "شیپور ")}: +${x.inserted}`)
          .join(" | ");
        const alerts = data.result?.alerts?.notificationsCreated ?? 0;

        console.log(
          `✅ پایش با موفقیت انجام شد (+${totalNew} آگهی جدید): ${summaryList || "بدون آگهی جدید"}`,
        );
        if (alerts > 0) {
          console.log(`🎯 تعداد ${alerts} هشدار و پیام به ربات‌ها ارسال شد!`);
        }
      }
    } else {
      console.log(`⚠️ وضعیت پاسخ سرور: ${res.status}`);
    }
  } catch (err) {
    console.error("❌ خطا در اجرای این دقیقه (سیستم در دقیقه بعد مجدداً اجرا می‌شود):", err.message);
  }

  // بررسی نیاز به بروزرسانی روزانه قیمت‌ها
  await checkDailyPrices();
}

// اجرای اولین چرخه بلافاصله
runCycle();

// تکرار دقیقاً هر ۶۰ ثانیه یک‌بار با مقاومت در برابر خطا
setInterval(runCycle, INTERVAL_SECONDS * 1000);
