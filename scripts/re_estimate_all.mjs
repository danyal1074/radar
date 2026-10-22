import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
import path from "node:path";
import { lookupDailyPrice } from "../lib/daily-prices/lookup.ts";
import { isJunkOrUnrealisticListing } from "../lib/junk-filter.ts";

// Parse .env.local if present
const envPath = path.resolve(".env.local");
let supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://mhjktkkzjgatyacmlnxx.supabase.co";
let supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, "utf-8").split("\n");
  for (const line of lines) {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const val = match[2].trim().replace(/^["']|["']$/g, "");
      if (key === "NEXT_PUBLIC_SUPABASE_URL" && !process.env.NEXT_PUBLIC_SUPABASE_URL) supabaseUrl = val;
      if (key === "SUPABASE_SERVICE_ROLE_KEY" && !supabaseKey) supabaseKey = val;
      if (key === "NEXT_PUBLIC_SUPABASE_ANON_KEY" && !supabaseKey) supabaseKey = val;
    }
  }
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log("Loading live daily car prices from .data or Supabase...");
  let prices = [];
  const pricesFile = path.resolve(".data/daily_car_prices.json");
  if (fs.existsSync(pricesFile)) {
    prices = JSON.parse(fs.readFileSync(pricesFile, "utf-8"));
  }
  if (!prices || prices.length === 0) {
    const { data } = await supabase
      .from("system_jobs")
      .select("metadata")
      .eq("job_type", "daily_car_prices")
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    prices = data?.metadata?.prices || [];
  }

  console.log(`Loaded ${prices.length} price benchmarks.`);

  // 1. Fetch listings
  const { data: listings, error } = await supabase
    .from("listings")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed fetching listings:", error);
    return;
  }

  console.log(`Analyzing ${listings.length} listings in database...`);

  const junkIds = [];
  const updatesToInsert = [];
  let failedCount = 0;

  for (let i = 0; i < listings.length; i++) {
    const l = listings[i];
    // Check if listing is junk / scam
    const junk = isJunkOrUnrealisticListing({
      title: l.title,
      price_toman: l.price_toman,
      make: l.make,
      model: l.model,
      year: l.year,
    });

    if (junk.isJunk) {
      junkIds.push(l.id);
      continue;
    }

    // Extract body and chassis
    let body_status = null;
    let chassis_status = null;
    if (l.description) {
      const bMatch = l.description.match(/بدنه:\s*([^|\n]+)/);
      if (bMatch) body_status = bMatch[1].trim();
      const cMatch = l.description.match(/شاسی:\s*([^|\n]+)/);
      if (cMatch) chassis_status = cMatch[1].trim();
    }

    const estPrice = lookupDailyPrice(
      prices,
      l.make,
      l.model,
      l.year ?? undefined,
      l.title,
      body_status,
      chassis_status
    );

    if (estPrice && estPrice > 0) {
      let finalPrice = estPrice;
      const effectiveYear = l.year ?? 1395;
      if (l.mileage_km && l.mileage_km > 0) {
        const age = Math.max(1, 1404 - effectiveYear);
        const expectedKm = age * 20_000;
        const diffKm = l.mileage_km - expectedKm;
        const ratio = Math.max(-0.06, Math.min(0.08, (diffKm / 10_000) * 0.007));
        finalPrice = Math.round(finalPrice * (1 - ratio));
      }

      updatesToInsert.push({
        listing_id: l.id,
        provider: "baravard",
        estimated_price_toman: finalPrice,
        currency: "IRT",
        status: "success",
        confidence: 0.95,
        is_sample: false,
        estimated_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
        request_metadata: { input: { make: l.make, model: l.model, title: l.title, year: l.year } },
        response_metadata: { source: "baravard.com", make: l.make, model: l.model, year: effectiveYear },
      });
    } else {
      failedCount++;
    }
  }

  // Delete junk in batches of 50
  if (junkIds.length > 0) {
    console.log(`Purging ${junkIds.length} junk/scam listings...`);
    for (let i = 0; i < junkIds.length; i += 50) {
      const chunk = junkIds.slice(i, i + 50);
      await supabase.from("price_estimates").delete().in("listing_id", chunk);
      await supabase.from("listings").delete().in("id", chunk);
    }
  }

  // Insert estimates in batches of 50 (clean up previous estimate for these listings first)
  console.log(`Inserting ${updatesToInsert.length} calculated estimates...`);
  for (let i = 0; i < updatesToInsert.length; i += 50) {
    const chunk = updatesToInsert.slice(i, i + 50);
    const chunkIds = chunk.map((c) => c.listing_id);
    await supabase.from("price_estimates").delete().in("listing_id", chunkIds);
    const { error: insErr } = await supabase.from("price_estimates").insert(chunk);
    if (insErr) {
      console.error("Insert batch error:", insErr);
    } else {
      console.log(`Progress: ${Math.min(i + 50, updatesToInsert.length)}/${updatesToInsert.length}`);
    }
  }

  console.log(`\n✅ Completed!`);
  console.log(`- Purged junk listings: ${junkIds.length}`);
  console.log(`- Successfully appraised: ${updatesToInsert.length}`);
  console.log(`- Failed / Unknown models: ${failedCount}`);
}

run();
