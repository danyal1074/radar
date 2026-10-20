/**
 * سرویس پایش خودکار و مداوم رادار خودرو (دیوار + شیپور تربت‌حیدریه)
 * و بروزرسانی خودکار روزانه قیمت‌های بازار خودرو (ایران خودرو، سایپا و...)
 * اجرا در پس‌زمینه سیستم: بررسی دوره‌ای و ارسال آنی به بله و تلگرام
 */

const CRON_URL = "http://127.0.0.1:3000/api/cron/pipeline";
const PRICES_CRON_URL = "http://127.0.0.1:3000/api/cron/daily-prices";
const CRON_SECRET = process.env.CRON_SECRET || "dev-cron-secret-16-chars-long";
const INTERVAL_SECONDS = 60; // هر ۶۰ ثانیه پایش آگهی‌ها انجام می‌شود

let lastPricesUpdateDate = "";

console.log("⚡ شروع پایشگر خودکار رادار لحظه‌ای خودرو (دیوار و شیپور تربت‌حیدریه)...");
console.log("📊 بروزرسانی روزانه خودکار قیمت‌های خودرو از baravard.com فعال است (هر روز ساعت ۱۵:۰۰ ظهر).");
console.log(`⏱ زمان هر چرخه پایش آگهی‌ها: هر ${INTERVAL_SECONDS} ثانیه یک‌بار`);

async function checkDailyPrices() {
  const tehranTimeStr = new Date().toLocaleString("en-US", { timeZone: "Asia/Tehran" });
  const tehranDate = new Date(tehranTimeStr);
  const hour = tehranDate.getHours();
  const todayStr = tehranDate.toISOString().split("T")[0];

  // اگر ساعت ۱۵ یا بعد از آن است و امروز هنوز بروزرسانی انجام نشده
  if (hour >= 15 && lastPricesUpdateDate !== todayStr) {
    console.log(`\n📊 [ساعت ۱۵:۰۰] در حال بروزرسانی خودکار روزانه قیمت‌های بازار از سایت baravard.com ...`);
    try {
      const res = await fetch(PRICES_CRON_URL, {
        headers: { Authorization: `Bearer ${CRON_SECRET}` },
      });
      if (res.ok) {
        const data = await res.json();
        lastPricesUpdateDate = todayStr;
        console.log(`✅ [ساعت ۱۵:۰۰] بروزرسانی با موفقیت انجام شد (${data.result?.count ?? 0} خودرو ثبت شد).`);
      } else {
        console.warn(`⚠️ خطا در بروزرسانی روزانه قیمت‌ها: وضعیت ${res.status}`);
      }
    } catch (err) {
      console.error("❌ خطا در اتصال به سرویس بروزرسانی قیمت روز:", err.message);
    }
  }
}

async function runCycle() {
  const time = new Date().toLocaleTimeString("fa-IR");
  console.log(`\n[${time}] 🔍 در حال بررسی و پایش آگهی‌های جدید دیوار و شیپور تربت‌حیدریه...`);
  try {
    const res = await fetch(CRON_URL, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${CRON_SECRET}`,
      },
    });

    if (res.ok) {
      const data = await res.json();
      const divar = data.result?.ingest?.find((x) => x.source === "divar")?.inserted ?? 0;
      const sheypoor = data.result?.ingest?.find((x) => x.source === "sheypoor")?.inserted ?? 0;
      const alerts = data.result?.alerts?.notificationsCreated ?? 0;
      console.log(`✅ پایش با موفقیت انجام شد: ${divar} آگهی جدید دیوار، ${sheypoor} آگهی جدید شیپور`);
      if (alerts > 0) {
        console.log(`🎯 تعداد ${alerts} هشدار و پیام به ربات بله و تلگرام ارسال شد!`);
      }
    } else {
      console.log(`⚠️ وضعیت پاسخ: ${res.status}`);
    }
  } catch (err) {
    console.error("❌ خطا در اجرای چرخه پایش:", err.message);
  }

  // بررسی نیاز به بروزرسانی روزانه قیمت‌ها
  await checkDailyPrices();
}

// اجرای اولین چرخه بلافاصله
runCycle();

// تنظیم تکرار دوره‌ای
setInterval(runCycle, INTERVAL_SECONDS * 1000);
