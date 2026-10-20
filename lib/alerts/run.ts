import type { Store } from "../db/store";
import { analyzeListingContent } from "../listing-meta";
import { formatPercent, formatToman } from "../money";
import { sendLiveAlert } from "../notify";
import { resolveAccess } from "../plans";
import { evaluateRules } from "./engine";

export interface AlertRunSummary {
  rulesEvaluated: number;
  listingsEvaluated: number;
  hits: number;
  notificationsCreated: number;
  duplicatesSkipped: number;
  skippedNoAccess: number;
}

/**
 * Evaluates every active rule (of accounts whose subscription grants access)
 * against every active listing and writes in-app notifications. Safe to run
 * repeatedly: the (user, rule, listing) dedupe key prevents repeat alerts.
 */
export async function evaluateAndNotify(
  store: Store,
  now: Date = new Date(),
  opts: { userId?: string } = {},
): Promise<AlertRunSummary> {
  const summary: AlertRunSummary = {
    rulesEvaluated: 0,
    listingsEvaluated: 0,
    hits: 0,
    notificationsCreated: 0,
    duplicatesSkipped: 0,
    skippedNoAccess: 0,
  };

  let rules = await store.listAllActiveRules();
  if (opts.userId) rules = rules.filter((r) => r.user_id === opts.userId);
  if (rules.length === 0) return summary;

  const subs = await store.getSubscriptionsByUser([...new Set(rules.map((r) => r.user_id))]);
  const allowed = rules.filter((r) => {
    const ok = resolveAccess(subs.get(r.user_id) ?? null, now).hasAccess;
    if (!ok) summary.skippedNoAccess++;
    return ok;
  });
  summary.rulesEvaluated = allowed.length;
  if (allowed.length === 0) return summary;

  const listings = (await store.listListings()).filter((l) => l.source_status === "active");
  const estimates = await store.latestEstimates(listings.map((l) => l.id));
  const ruleById = new Map(allowed.map((r) => [r.id, r]));

  for (const listing of listings) {
    summary.listingsEvaluated++;
    const estimate = estimates.get(listing.id) ?? null;
    const hits = evaluateRules(allowed, listing, estimate, now);
    for (const hit of hits) {
      summary.hits++;
      const rule = ruleById.get(hit.ruleId);
      const sample = estimate?.is_sample ? " (قیمت نمونه)" : "";
      const created = await store.insertNotificationIfNew({
        user_id: hit.userId,
        listing_id: listing.id,
        watch_rule_id: hit.ruleId,
        title: `فرصت خرید: ${listing.title}`,
        body:
          `قیمت آگهی ${formatToman(listing.price_toman)} است؛ ` +
          `${formatPercent(hit.diffPercent)} (${formatToman(hit.diffToman)}) پایین‌تر از قیمت تخمینی ` +
          `${formatToman(estimate?.estimated_price_toman)}${sample}. قانون «${rule?.name ?? ""}»`,
        dedupe_key: hit.dedupeKey,
      });
      if (created) {
        summary.notificationsCreated++;
        const analysis = analyzeListingContent(listing.title, listing.description || "");
        // Dispatch instant alert to Bale and Telegram
        sendLiveAlert({
          userId: hit.userId,
          title: listing.title,
          source: listing.source,
          priceToman: listing.price_toman,
          estimatedToman: estimate?.estimated_price_toman ?? null,
          discountPercent: hit.diffPercent > 0 ? hit.diffPercent : null,
          profitToman: hit.diffToman > 0 ? hit.diffToman : null,
          city: listing.city || "تربت‌حیدریه",
          url: listing.source_url,
          imageUrl: listing.image_url,
          tags: analysis.tags,
          ruleName: rule?.name ?? "هشدار سفارشی شما",
        }).catch(() => {});
      } else {
        summary.duplicatesSkipped++;
      }
    }
  }
  return summary;
}
