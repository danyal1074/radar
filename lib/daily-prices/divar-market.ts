/**
 * ماژول استخراج و محاسبه قیمت حدودی بازار مستقیماً از روی آگهی‌های دیوار (Divar Market Estimator)
 * با تحلیل آمار معاملات و آگهی‌های هم‌مدل موجود در دیوار و محاسبه میانگین قیمت واقعی بازار
 */

export interface DivarMarketStats {
  sampleCount: number;
  averageToman: number;
  minToman: number;
  maxToman: number;
  medianToman: number;
  confidence: number;
  source: "divar_market";
}

/**
 * یکسان‌سازی کلید خوشه‌بندی خودروها بر اساس مدل‌های رسمی دیوار و عنوان‌ها
 */
export function getCarClusterKey(make?: string | null, model?: string | null, title?: string | null): string {
  const raw = `${make || ""} ${model || ""} ${title || ""}`
    .toLowerCase()
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/ي/g, "ی")
    .replace(/ك/g, "ک");

  // پراید
  if (/131|۱۳۱/.test(raw) && /pride|پراید/.test(raw)) return "pride_131";
  if (/111|۱۱۱/.test(raw) && /pride|پراید/.test(raw)) return "pride_111";
  if (/132|۱۳۲/.test(raw) && /pride|پراید/.test(raw)) return "pride_132";
  if (/141|۱۴۱/.test(raw) && /pride|پراید/.test(raw)) return "pride_141";
  if (/151|۱۵۱|وانت\s*پراید/.test(raw)) return "pride_151";
  if (/صبا|saba|نسیم|nasim/.test(raw) && /pride|پراید/.test(raw)) return "pride_saba";
  if (/pride|پراید/.test(raw)) return "pride_general";

  // پژو پارس
  if (/پارس|pars|پرشیا/.test(raw)) {
    if (/elx|ای\s*ال\s*ایکس/.test(raw)) return "peugeot_pars_elx";
    if (/tu5|تی\s*یو\s*فایو/.test(raw)) return "peugeot_pars_tu5";
    return "peugeot_pars_xu7";
  }

  // پژو 206
  if (/206|۲۰۶/.test(raw)) {
    if (/تیپ\s*2|tip\s*2|2\b/.test(raw)) return "peugeot_206_tip2";
    if (/تیپ\s*5|tip\s*5|5\b/.test(raw)) return "peugeot_206_tip5";
    if (/اس\s*دی|sd/.test(raw)) return "peugeot_206_sd";
    return "peugeot_206_general";
  }

  // پژو 207
  if (/207|۲۰۷/.test(raw)) {
    if (/اتومات|auto/.test(raw)) return "peugeot_207_auto";
    if (/پانوراما|سقف\s*شیشه/.test(raw)) return "peugeot_207_pano";
    return "peugeot_207_manual";
  }

  // پژو 405
  if (/405|۴۰۵/.test(raw)) {
    if (/slx|اس\s*ال\s*ایکس/.test(raw)) return "peugeot_405_slx";
    return "peugeot_405_glx";
  }

  // ساینا
  if (/ساینا|saina/.test(raw)) {
    if (/s\b|اس\b/.test(raw)) return "saina_s";
    if (/da\b/.test(raw)) return "saina_da";
    return "saina_manual";
  }

  // کوییک
  if (/کوییک|کوئیک|quick|quik/.test(raw)) {
    if (/r\b|آر\b/.test(raw)) return "quick_r";
    if (/s\b|اس\b/.test(raw)) return "quick_s";
    if (/gxr|gx/.test(raw)) return "quick_gx";
    if (/اتومات|auto/.test(raw)) return "quick_auto";
    return "quick_manual";
  }

  // تیبا
  if (/تیبا\s*2|tiba\s*2|تیبا\s*دو/.test(raw)) return "tiba_2";
  if (/تیبا|tiba/.test(raw)) return "tiba_1";

  // دنا
  if (/دنا|dena/.test(raw)) {
    if (/پلاس\s*توربو\s*اتومات|turbo\s*auto/.test(raw)) return "dena_plus_turbo_auto";
    if (/پلاس\s*توربو|plus\s*turbo/.test(raw)) return "dena_plus_turbo";
    if (/پلاس|plus/.test(raw)) return "dena_plus";
    return "dena_standard";
  }

  // تارا
  if (/تارا|tara/.test(raw)) {
    if (/اتومات|v4|v2|auto/.test(raw)) return "tara_auto";
    return "tara_manual";
  }

  // شاهین
  if (/شاهین|shahin/.test(raw)) {
    if (/اتومات|plus|g\s*plus/.test(raw)) return "shahin_auto";
    return "shahin_g";
  }

  // سمند و سورن
  if (/سورن|soren/.test(raw)) {
    if (/پلاس|plus/.test(raw)) return "soren_plus";
    return "soren_elx";
  }
  if (/سمند|samand/.test(raw)) {
    if (/ef7|ای\s*اف\s*سون/.test(raw)) return "samand_ef7";
    return "samand_lx";
  }

  // رنو تندر و ساندرو
  if (/تندر|ال\s*90|ال\s*نود|l90|logan/.test(raw)) return "tondar_90";
  if (/ساندرو|sandero/.test(raw)) return "sandero";

  // زانتیا
  if (/زانتیا|xantia/.test(raw)) return "xantia_2000";

  // وانت نیسان و پیکان
  if (/نیسان|زامیاد|zamyad/.test(raw)) return "nissan_zamyad";
  if (/وانت\s*پیکان|پیکان\s*وانت|paykan/.test(raw)) return "paykan_pickup";

  // ام وی ام
  if (/x22|ایکس\s*22/.test(raw)) return "mvm_x22";
  if (/x33|ایکس\s*33/.test(raw)) return "mvm_x33";
  if (/x55|ایکس\s*55/.test(raw)) return "mvm_x55";

  // وانت مزدا
  if (/وانت\s*مزدا|مزدا\s*2000|مزدا\s*۱۶۰۰|مزدا\s*کارا/.test(raw)) return "mazda_pickup";

  // سایر موارد بر اساس نام خام
  return raw.replace(/[^a-z0-9\u0600-\u06FF]/g, "_").slice(0, 30);
}

/**
 * استخراج میانگین قیمت از مجموعه آگهی‌های هم‌مدل موجود در دیوار
 */
export function estimateFromDivarListings(
  targetCar: { make?: string | null; model?: string | null; title?: string | null; year?: number | null },
  allDivarListings: Array<{ make?: string | null; model?: string | null; title?: string | null; year?: number | null; price_toman?: number | null }>
): DivarMarketStats | null {
  const targetKey = getCarClusterKey(targetCar.make, targetCar.model, targetCar.title);
  if (!targetKey || targetKey.length < 3) return null;

  const targetYear = targetCar.year || 1395;

  // فیلتر آگهی‌های مشابه در دیوار با سال نزدیک (حداکثر ۱ سال اختلاف)
  const matches = allDivarListings.filter((l) => {
    if (!l.price_toman || l.price_toman < 25_000_000 || l.price_toman > 15_000_000_000) return false;
    const lKey = getCarClusterKey(l.make, l.model, l.title);
    if (lKey !== targetKey) return false;

    if (l.year) {
      const yearDiff = Math.abs(l.year - targetYear);
      return yearDiff <= 1;
    }
    return true;
  });

  if (matches.length < 2) {
    // اگر با سال نزدیک پیدا نشد، با کلید خوشه‌ای همان مدل بررسی شود با ضریب سال
    const generalMatches = allDivarListings.filter((l) => {
      if (!l.price_toman || l.price_toman < 25_000_000 || l.price_toman > 15_000_000_000) return false;
      return getCarClusterKey(l.make, l.model, l.title) === targetKey;
    });

    if (generalMatches.length < 3) return null;

    // استخراج قیمت با تنظیم سال
    const prices = generalMatches.map((m) => {
      let p = m.price_toman!;
      if (m.year && targetCar.year) {
        const yearDiff = targetCar.year - m.year;
        p = p * (1 + yearDiff * 0.05); // هر سال اختلاف مدل حدود ۵ درصد
      }
      return Math.round(p);
    });

    return computeStats(prices);
  }

  const prices = matches.map((m) => m.price_toman!);
  return computeStats(prices);
}

function computeStats(prices: number[]): DivarMarketStats {
  prices.sort((a, b) => a - b);

  // حذف ۱۰ درصد ارزان‌ترین و گران‌ترین برای حذف آگهی‌های پرت و فیک (Trimmed Mean)
  let trimmed = prices;
  if (prices.length >= 5) {
    const trimCount = Math.floor(prices.length * 0.15);
    trimmed = prices.slice(trimCount, prices.length - trimCount);
  }

  const sum = trimmed.reduce((acc, v) => acc + v, 0);
  const averageToman = Math.round(sum / trimmed.length);
  const mid = Math.floor(trimmed.length / 2);
  const medianToman = trimmed.length % 2 === 0 ? Math.round((trimmed[mid - 1] + trimmed[mid]) / 2) : trimmed[mid];

  return {
    sampleCount: prices.length,
    averageToman,
    minToman: trimmed[0],
    maxToman: trimmed[trimmed.length - 1],
    medianToman,
    confidence: Math.min(0.98, 0.75 + prices.length * 0.03),
    source: "divar_market",
  };
}

// In-memory cache for recent Divar listings (5 minutes TTL)
let recentDivarListingsCache: { data: any[]; expiresAt: number } | null = null;

export async function fetchLiveDivarClusterEstimate(
  targetCar: { make?: string | null; model?: string | null; title?: string | null; year?: number | null },
  supabaseClient?: any
): Promise<DivarMarketStats | null> {
  const now = Date.now();
  let listings = recentDivarListingsCache?.data || [];

  if (!listings || listings.length === 0 || (recentDivarListingsCache && recentDivarListingsCache.expiresAt < now)) {
    let sb = supabaseClient;
    if (!sb) {
      try {
        const { env } = await import("../env");
        if (env.hasSupabase && env.supabaseServiceRoleKey) {
          const { createClient } = await import("@supabase/supabase-js");
          sb = createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
            auth: { persistSession: false, autoRefreshToken: false },
          });
        }
      } catch {
        // Fallback silently if not available
      }
    }

    if (sb) {
      try {
        const { data } = await sb
          .from("listings")
          .select("make, model, title, year, price_toman")
          .eq("source", "divar")
          .gt("price_toman", 20000000)
          .order("first_seen_at", { ascending: false })
          .limit(400);

        if (data && data.length > 0) {
          listings = data;
          recentDivarListingsCache = { data, expiresAt: now + 5 * 60 * 1000 };
        }
      } catch {
        // Fallback silently
      }
    }
  }

  if (!listings || listings.length === 0) return null;
  return estimateFromDivarListings(targetCar, listings);
}

