import { NextResponse } from "next/server";
import { getServiceStore } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const store = await getServiceStore();
    const listings = await store.listListings();
    const active = listings.filter((l) => l.source_status === "active");
    const estimates = await store.latestEstimates(active.map((l) => l.id));

    // پیدا کردن خودروهایی که زیر قیمت بازار هستند
    const opportunities = [];
    for (const l of active) {
      const est = estimates.get(l.id);
      if (est && est.estimated_price_toman && est.estimated_price_toman > l.price_toman) {
        const estPrice = est.estimated_price_toman;
        const diffToman = estPrice - l.price_toman;
        const discountPercent = Math.round((diffToman / estPrice) * 100);
        if (discountPercent >= 5) {
          opportunities.push({
            id: l.id,
            title: l.title,
            priceToman: l.price_toman,
            estimatedToman: estPrice,
            profitToman: diffToman,
            discountPercent,
            source: l.source,
            url: l.source_url,
            imageUrl: l.image_url,
            year: l.year,
            mileageKm: l.mileage_km,
            color: l.color,
          });
        }
      }
    }

    // مرتب‌سازی بر اساس بیشترین سود (تومان)
    opportunities.sort((a, b) => b.profitToman - a.profitToman);

    return NextResponse.json({
      ok: true,
      opportunities: opportunities.slice(0, 5),
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "خطای دریافت فرصت‌ها";
    return NextResponse.json({ ok: false, message: msg }, { status: 500 });
  }
}
