import type { Metadata } from "next";
import { requireContext } from "@/lib/auth";
import {
  getMarketingConfig,
  getMarketingLogs,
  getTodaySentCount,
} from "@/lib/marketing/store";
import { MarketingClient } from "./marketing-client";

export const metadata: Metadata = { title: "تبلیغ و پیام‌رسان هوشمند چت" };
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminMarketingPage() {
  const ctx = await requireContext({ admin: true });

  const [config, rawListings, logs, divarSentToday, sheypoorSentToday] = await Promise.all([
    getMarketingConfig(),
    ctx.store.listListings(),
    getMarketingLogs(100),
    getTodaySentCount("divar"),
    getTodaySentCount("sheypoor"),
  ]);

  // دقیقاً همان آگهی‌های پایش‌شده رادار (محدود به مشهد و تربت حیدریه)
  const listings = rawListings.filter((l) => {
    const c = l.city || "";
    return c.includes("مشهد") || c.includes("تربت");
  });

  return (
    <MarketingClient
      config={config}
      listings={listings}
      logs={logs}
      divarSentToday={divarSentToday}
      sheypoorSentToday={sheypoorSentToday}
    />
  );
}
