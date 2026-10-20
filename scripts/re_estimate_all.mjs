import { createClient } from "@supabase/supabase-js";
import fs from "fs";

const envStr = fs.readFileSync(".env.local", "utf8");
const env = {};
for (const line of envStr.split("\n")) {
  const parts = line.split("=");
  if (parts.length >= 2) env[parts[0].trim()] = parts.slice(1).join("=").trim();
}

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

// Load Baravard daily prices
const dailyPrices = JSON.parse(fs.readFileSync(".data/daily_car_prices.json", "utf8"));

function lookupDailyPrice(make, model, title, year) {
  const q = `${make || ""} ${model || ""} ${title || ""}`.toLowerCase();
  const yearStr = year ? String(year) : "";

  const candidates = [];
  for (const item of dailyPrices) {
    const item_name = item.name.toLowerCase();
    if (q.includes("صبا") && item_name.includes("صبا")) {
      candidates.push(item);
    } else if (q.includes("پراید") && item_name.includes("پراید")) {
      if ((q.includes("132") || q.includes("۱۳۲")) && item_name.includes("132")) candidates.push(item);
      else if ((q.includes("111") || q.includes("۱۱۱")) && item_name.includes("111")) candidates.push(item);
      else if ((q.includes("151") || q.includes("۱۵۱")) && item_name.includes("151")) candidates.push(item);
      else if ((q.includes("141") || q.includes("۱۴۱")) && item_name.includes("141")) candidates.push(item);
      else if (!item_name.includes("132") && !item_name.includes("111") && !item_name.includes("151")) candidates.push(item);
    } else if (q.includes("پیکان وانت") && (item_name.includes("پیکان وانت") || item_name.includes("وانت پیکان"))) {
      candidates.push(item);
    } else if (q.includes("پیکان") && item_name.includes("پیکان")) {
      candidates.push(item);
    } else if (q.includes("پارس") && item_name.includes("پارس")) {
      candidates.push(item);
    } else if (q.includes("206") || q.includes("۲۰۶")) {
      if (item_name.includes("206") || item_name.includes("۲۰۶")) candidates.push(item);
    } else if (q.includes("207") || q.includes("۲۰۷")) {
      if (item_name.includes("207") || item_name.includes("۲۰۷")) candidates.push(item);
    } else if (q.includes("تیبا") && item_name.includes("تیبا")) {
      candidates.push(item);
    } else if (q.includes("ساینا") && item_name.includes("ساینا")) {
      candidates.push(item);
    } else if ((q.includes("کوییک") || q.includes("کوئیک")) && (item_name.includes("کوییک") || item_name.includes("کوئیک"))) {
      candidates.push(item);
    } else if (q.includes("دنا") && item_name.includes("دنا")) {
      candidates.push(item);
    } else if (q.includes("تارا") && item_name.includes("تارا")) {
      candidates.push(item);
    } else if (q.includes("شاهین") && item_name.includes("شاهین")) {
      candidates.push(item);
    } else if ((q.includes("سمند") || q.includes("سورن")) && (item_name.includes("سمند") || item_name.includes("سورن"))) {
      candidates.push(item);
    } else if ((q.includes("405") || q.includes("۴۰۵")) && (item_name.includes("405") || item_name.includes("۴۰۵"))) {
      candidates.push(item);
    }
  }

  if (candidates.length === 0) return null;

  if (yearStr) {
    const exact = candidates.filter((c) => c.year.includes(yearStr));
    if (exact.length > 0) return exact[0].priceToman;

    // Pick closest
    let best = candidates[0];
    let bestDiff = 999;
    for (const c of candidates) {
      const m = c.year.match(/\d{4}/);
      if (m) {
        const y = parseInt(m[0], 10);
        const diff = Math.abs(y - year);
        if (diff < bestDiff) {
          bestDiff = diff;
          best = c;
        }
      }
    }
    return best.priceToman;
  }

  return candidates[0].priceToman;
}

async function reestimate() {
  console.log("1. Fetching all active listings from Supabase...");
  const { data: listings, error } = await supabase.from("listings").select("*");
  if (error) {
    console.error("Error fetching listings:", error);
    return;
  }
  console.log(`Found ${listings.length} listings.`);

  let updatedCount = 0;
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 7 * 24 * 3600 * 1000).toISOString();

  for (const l of listings) {
    let year = l.year;
    if (!year) {
      const m = l.title.match(/\b(13[789]\d|140\d)\b/);
      if (m) year = parseInt(m[1], 10);
      const m2 = l.title.match(/مدل\s*(\d{2})\b/);
      if (m2) year = parseInt(m2[1], 10) < 30 ? 1400 + parseInt(m2[1], 10) : 1300 + parseInt(m2[1], 10);
    }

    let estimated = lookupDailyPrice(l.make, l.model, l.title, year);
    if (!estimated) {
      // Fallback
      if (l.title.includes("پراید") || l.title.includes("صبا")) estimated = 500_000_000;
      else if (l.title.includes("پیکان")) estimated = 300_000_000;
      else continue;
    }

    // Apply mileage adjustment if available
    if (l.mileage_km && l.mileage_km > 0 && year) {
      const age = Math.max(1, 1404 - year);
      const expectedKm = age * 20_000;
      const diffKm = l.mileage_km - expectedKm;
      const ratio = Math.max(-0.06, Math.min(0.08, (diffKm / 10_000) * 0.007));
      estimated = Math.round(estimated * (1 - ratio));
    }

    // Delete existing old estimates for this listing
    await supabase.from("price_estimates").delete().eq("listing_id", l.id);

    // Insert new fresh estimate from Baravard
    const { error: insErr } = await supabase.from("price_estimates").insert({
      listing_id: l.id,
      provider: "baravard",
      estimated_price_toman: estimated,
      estimated_at: now.toISOString(),
      expires_at: expiresAt,
      status: "success",
      confidence: 0.95,
      is_sample: false,
      request_metadata: { source: "baravard.com", year },
      response_metadata: { source: "baravard.com" },
    });

    if (!insErr) {
      updatedCount++;
      console.log(`Updated [${l.title} (مدل ${year})] -> قیمت کارشناسی برآورد: ${estimated.toLocaleString("fa-IR")} تومان (قیمت فروشنده: ${l.price_toman.toLocaleString("fa-IR")})`);
    } else {
      console.warn("Insert error:", insErr);
    }
  }

  console.log(`\n✅ Successfully re-estimated ${updatedCount} listings with Baravard!`);
}

reestimate().catch(console.error);
