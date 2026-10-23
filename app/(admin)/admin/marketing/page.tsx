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

  const [config, listings, logs, divarSentToday, sheypoorSentToday] = await Promise.all([
    getMarketingConfig(),
    ctx.store.listListings({ limit: 100 }),
    getMarketingLogs(50),
    getTodaySentCount("divar"),
    getTodaySentCount("sheypoor"),
  ]);

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
