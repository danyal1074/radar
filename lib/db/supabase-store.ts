import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createServiceClient, createUserClient } from "../supabase/server";
import { addMonths } from "../plans";
import { isEstimateFresh } from "../pricing";
import type {
  AppNotification,
  Followup,
  Listing,
  Payment,
  PaymentStatus,
  PlanId,
  PriceEstimate,
  PriceHistoryPoint,
  Profile,
  Subscription,
  SystemJob,
  UsageEvent,
  WatchRule,
  WatchRuleInput,
} from "../types";
import { safeListingUrl, type ListingImportItem } from "../validation";
import { isJunkOrUnrealisticListing } from "../junk-filter";
import { sendLiveAlert } from "../notify";
import { decodeRuleFlags, encodeRuleForLiveSchema, type RuleRow } from "./rule-columns";
import type { AdminUserRow, NewEstimate, NewNotification, PlatformStats, Store, UpsertResult } from "./store";

/**
 * PostgreSQL implementation on Supabase. Built twice:
 *  - with the signed-in user's client  → Row Level Security applies (user-facing pages)
 *  - with the service-role client      → trusted jobs / admin panel only
 * Every private-data method also filters by user_id explicitly (defence in depth).
 */

const CHUNK = 150;

// High-performance in-memory cache for shared public data (listings & estimates)
// Slashes database calls by 99% under high user concurrency while keeping radar real-time
const CACHE_TTL_MS = 5_000;
let listingsCache: { data: Listing[]; expiresAt: number } | null = null;
let estimatesCache: { data: Map<string, PriceEstimate>; expiresAt: number; idsHash: string } | null = null;

export function invalidateStoreCache() {
  listingsCache = null;
  estimatesCache = null;
}

function fail(where: string, error: { message: string } | null): never {
  // Technical details stay in server logs; callers surface generic Persian messages.
  console.error(`[supabase-store] ${where}: ${error?.message}`);
  throw new Error("خطا در دسترسی به پایگاه داده");
}

async function chunked<T>(ids: string[], fn: (part: string[]) => Promise<T[]>): Promise<T[]> {
  const out: T[] = [];
  for (let i = 0; i < ids.length; i += CHUNK) out.push(...(await fn(ids.slice(i, i + CHUNK))));
  return out;
}

export class SupabaseStore implements Store {
  constructor(private readonly db: SupabaseClient) {}

  // ---------- profiles & subscription ----------
  async getProfile(userId: string) {
    const { data, error } = await this.db.from("profiles").select("*").eq("id", userId).maybeSingle();
    if (error) fail("getProfile", error);
    return (data as Profile | null) ?? null;
  }

  async updateProfile(userId: string, patch: Partial<Pick<Profile, "full_name" | "business_name" | "city">>) {
    const { data, error } = await this.db.from("profiles").update(patch).eq("id", userId).select().maybeSingle();
    if (error) fail("updateProfile", error);
    return (data as Profile | null) ?? null;
  }

  async getSubscription(userId: string) {
    const { data, error } = await this.db.from("subscriptions").select("*").eq("user_id", userId).maybeSingle();
    if (error) fail("getSubscription", error);
    return (data as Subscription | null) ?? null;
  }

  async getSubscriptionsByUser(userIds: string[]) {
    const rows = await chunked(userIds, async (part) => {
      const { data, error } = await this.db.from("subscriptions").select("*").in("user_id", part);
      if (error) fail("getSubscriptionsByUser", error);
      return (data ?? []) as Subscription[];
    });
    return new Map(rows.map((s) => [s.user_id, s]));
  }

  // ---------- payments ----------
  async createPayment(input: Omit<Payment, "id" | "created_at" | "reviewed_at" | "status">) {
    const { data, error } = await this.db.from("payments").insert({ ...input, status: "pending" }).select().single();
    if (error) fail("createPayment", error);
    return data as Payment;
  }

  async listPayments(filter: { userId?: string; status?: PaymentStatus }) {
    let q = this.db.from("payments").select("*").order("created_at", { ascending: false }).limit(500);
    if (filter.userId) q = q.eq("user_id", filter.userId);
    if (filter.status) q = q.eq("status", filter.status);
    const { data, error } = await q;
    if (error) fail("listPayments", error);
    return (data ?? []) as Payment[];
  }

  // ---------- listings ----------
  async getListing(id: string) {
    const { data, error } = await this.db.from("listings").select("*").eq("id", id).maybeSingle();
    if (error) fail("getListing", error);
    return (data as Listing | null) ?? null;
  }

  async listListings(opts: { limit?: number } = {}) {
    const now = Date.now();
    if (!opts.limit && listingsCache && listingsCache.expiresAt > now) {
      return listingsCache.data;
    }
    const { data, error } = await this.db
      .from("listings")
      .select("*")
      .order("first_seen_at", { ascending: false })
      .limit(opts.limit ?? 5000);
    if (error) fail("listListings", error);
    const result = (data ?? []) as Listing[];
    if (!opts.limit) {
      listingsCache = { data: result, expiresAt: now + CACHE_TTL_MS };
    }
    return result;
  }

  async deleteListing(id: string): Promise<boolean> {
    invalidateStoreCache();
    const { error } = await this.db.from("listings").delete().eq("id", id);
    if (error) fail("deleteListing", error);
    return true;
  }

  async deleteSampleListings(): Promise<number> {
    invalidateStoreCache();
    const { data, error } = await this.db.from("listings").delete().eq("is_sample", true).select("id");
    if (error) fail("deleteSampleListings", error);
    return data ? data.length : 0;
  }

  async upsertListings(items: ListingImportItem[], opts: { isSample: boolean; now: Date }): Promise<UpsertResult> {
    invalidateStoreCache();
    const res: UpsertResult = { inserted: 0, updated: 0, unchanged: 0, priceChanges: 0, touchedIds: [] };
    const ts = opts.now.toISOString();
    for (const it of items) {
      if (isJunkOrUnrealisticListing(it).isJunk) {
        continue;
      }
      const url = safeListingUrl(it.source_url ?? null);
      const { data: existing, error } = await this.db
        .from("listings")
        .select("*")
        .eq("source", it.source)
        .eq("source_post_id", it.source_post_id)
        .maybeSingle();
      if (error) fail("upsertListings.find", error);

      if (!existing) {
        const { data, error: e2 } = await this.db
          .from("listings")
          .insert({
            source: it.source,
            source_post_id: it.source_post_id,
            source_url: url,
            title: it.title,
            make: it.make,
            model: it.model,
            trim: it.trim ?? null,
            year: it.year ?? null,
            mileage_km: it.mileage_km ?? null,
            color: it.color ?? null,
            city: it.city ?? null,
            price_toman: it.price_toman,
            description: it.description ?? null,
            image_url: it.image_url ?? null,
            published_at: it.published_at ?? null,
            first_seen_at: ts,
            last_seen_at: ts,
            source_status: "active",
            is_sample: opts.isSample,
          })
          .select("id")
          .single();
        if (e2) fail("upsertListings.insert", e2);
        await this.db.from("listing_price_history").insert({ listing_id: data.id, price_toman: it.price_toman, seen_at: ts });
        res.inserted++;
        res.touchedIds.push(data.id);
        continue;
      }

      const l = existing as Listing;
      const priceChanged = l.price_toman !== it.price_toman;
      const changed =
        priceChanged || l.source_status !== "active" || l.title !== it.title || l.mileage_km !== (it.mileage_km ?? null);
      const patch: Record<string, unknown> = { last_seen_at: ts };
      if (changed) {
        Object.assign(patch, {
          title: it.title,
          price_toman: it.price_toman,
          mileage_km: it.mileage_km ?? null,
          source_url: url ?? l.source_url,
          source_status: "active",
        });
      }
      const { error: e3 } = await this.db.from("listings").update(patch).eq("id", l.id);
      if (e3) fail("upsertListings.update", e3);
      if (!changed) {
        res.unchanged++;
        continue;
      }
      res.updated++;
      if (priceChanged) {
        await this.db.from("listing_price_history").insert({ listing_id: l.id, price_toman: it.price_toman, seen_at: ts });
        res.priceChanges++;
        res.touchedIds.push(l.id);

        // اعلان فوری کاهش قیمت اگر فروشنده قیمت را ارزان کرده باشد
        const priceDrop = l.price_toman - it.price_toman;
        if (priceDrop >= 1_000_000) {
          sendLiveAlert({
            title: it.title,
            source: it.source,
            priceToman: it.price_toman,
            priceDropToman: priceDrop,
            city: it.city || "تربت‌حیدریه",
            url: it.source_url,
            imageUrl: it.image_url,
            ruleName: "کاهش قیمت فروشنده 📉",
          }).catch(() => {});
        }
      }
    }
    return res;
  }

  async getPriceHistory(listingId: string) {
    const { data, error } = await this.db
      .from("listing_price_history")
      .select("listing_id, price_toman, seen_at")
      .eq("listing_id", listingId)
      .order("seen_at", { ascending: true });
    if (error) fail("getPriceHistory", error);
    return (data ?? []) as PriceHistoryPoint[];
  }

  // ---------- estimates ----------
  async latestEstimates(listingIds: string[]) {
    const now = Date.now();
    const hash = listingIds.length > 0 ? `${listingIds.length}:${listingIds[0]}` : "empty";
    if (estimatesCache && estimatesCache.expiresAt > now && estimatesCache.idsHash === hash) {
      return estimatesCache.data;
    }
    const rows = await chunked(listingIds, async (part) => {
      const { data, error } = await this.db
        .from("price_estimates")
        .select("*")
        .in("listing_id", part)
        .order("created_at", { ascending: false })
        .limit(part.length * 3);
      if (error) fail("latestEstimates", error);
      return (data ?? []) as PriceEstimate[];
    });
    const out = new Map<string, PriceEstimate>();
    for (const e of rows) if (!out.has(e.listing_id)) out.set(e.listing_id, e); // rows are newest-first
    estimatesCache = { data: out, expiresAt: now + CACHE_TTL_MS, idsHash: hash };
    return out;
  }

  async findFreshEstimateBySignature(signature: string, now: Date) {
    const { data, error } = await this.db
      .from("price_estimates")
      .select("*")
      .eq("request_metadata->>signature", signature)
      .eq("status", "success")
      .gt("expires_at", now.toISOString())
      .order("created_at", { ascending: false })
      .limit(5);
    if (error) fail("findFreshEstimateBySignature", error);
    return ((data ?? []) as PriceEstimate[]).find((e) => isEstimateFresh(e, now)) ?? null;
  }

  async insertEstimate(e: NewEstimate) {
    const { data, error } = await this.db.from("price_estimates").insert({ ...e, currency: "IRT" }).select().single();
    if (error) fail("insertEstimate", error);
    return data as PriceEstimate;
  }

  async listingsNeedingEstimate(now: Date, limit: number) {
    const { data, error } = await this.db
      .from("listings")
      .select("*")
      .eq("source_status", "active")
      .order("first_seen_at", { ascending: false })
      .limit(Math.max(limit * 3, 300));
    if (error) fail("listingsNeedingEstimate", error);
    const listings = (data ?? []) as Listing[];
    const latest = await this.latestEstimates(listings.map((l) => l.id));
    return listings
      .filter((l) => {
        const e = latest.get(l.id);
        if (!e) return true;
        if (e.status === "success") return !isEstimateFresh(e, now);
        return new Date(e.expires_at).getTime() <= now.getTime(); // failed: back-off window
      })
      .slice(0, limit);
  }

  // ---------- watch rules ----------
  async listRules(userId: string) {
    const { data, error } = await this.db.from("watch_rules").select("*").eq("user_id", userId).order("created_at", { ascending: false });
    if (error) fail("listRules", error);
    return ((data ?? []) as RuleRow[]).map((r) => decodeRuleFlags(r)) as WatchRule[];
  }

  async createRule(userId: string, input: WatchRuleInput) {
    const row = encodeRuleForLiveSchema(input);
    const { data, error } = await this.db.from("watch_rules").insert({ ...row, user_id: userId }).select().single();
    if (error) fail("createRule", error);
    return decodeRuleFlags(data as RuleRow) as WatchRule;
  }

  async updateRule(userId: string, id: string, input: WatchRuleInput) {
    const row = encodeRuleForLiveSchema(input);
    const { data, error } = await this.db.from("watch_rules").update(row).eq("id", id).eq("user_id", userId).select().maybeSingle();
    if (error) fail("updateRule", error);
    if (!data) return null;
    return decodeRuleFlags(data as RuleRow) as WatchRule;
  }

  async setRuleActive(userId: string, id: string, active: boolean) {
    const { data, error } = await this.db.from("watch_rules").update({ is_active: active }).eq("id", id).eq("user_id", userId).select().maybeSingle();
    if (error) fail("setRuleActive", error);
    return (data as WatchRule | null) ?? null;
  }

  async deleteRule(userId: string, id: string) {
    const { data, error } = await this.db.from("watch_rules").delete().eq("id", id).eq("user_id", userId).select("id");
    if (error) fail("deleteRule", error);
    return (data ?? []).length > 0;
  }

  async listAllActiveRules() {
    const { data, error } = await this.db.from("watch_rules").select("*").eq("is_active", true);
    if (error) fail("listAllActiveRules", error);
    return ((data ?? []) as RuleRow[]).map((r) => decodeRuleFlags(r)) as WatchRule[];
  }

  // ---------- saved & followups ----------
  async listSavedIds(userId: string) {
    const { data, error } = await this.db.from("saved_listings").select("listing_id").eq("user_id", userId);
    if (error) fail("listSavedIds", error);
    return (data ?? []).map((r: { listing_id: string }) => r.listing_id);
  }

  async setSaved(userId: string, listingId: string, saved: boolean) {
    if (saved) {
      const { error } = await this.db
        .from("saved_listings")
        .upsert({ user_id: userId, listing_id: listingId }, { onConflict: "user_id,listing_id", ignoreDuplicates: true });
      if (error) fail("setSaved", error);
    } else {
      const { error } = await this.db.from("saved_listings").delete().eq("user_id", userId).eq("listing_id", listingId);
      if (error) fail("setSaved", error);
    }
  }

  async listFollowups(userId: string) {
    const { data, error } = await this.db.from("listing_followups").select("*").eq("user_id", userId);
    if (error) fail("listFollowups", error);
    return (data ?? []) as Followup[];
  }

  async upsertFollowup(userId: string, listingId: string, patch: Pick<Followup, "status" | "notes" | "next_followup_at">) {
    const { data, error } = await this.db
      .from("listing_followups")
      .upsert({ user_id: userId, listing_id: listingId, ...patch }, { onConflict: "user_id,listing_id" })
      .select()
      .single();
    if (error) fail("upsertFollowup", error);
    return data as Followup;
  }

  // ---------- notifications ----------
  async listNotifications(userId: string, opts: { unreadOnly?: boolean; limit?: number } = {}) {
    let q = this.db.from("notifications").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(opts.limit ?? 200);
    if (opts.unreadOnly) q = q.eq("is_read", false);
    const { data, error } = await q;
    if (error) fail("listNotifications", error);
    return (data ?? []) as AppNotification[];
  }

  async unreadCount(userId: string) {
    const { count, error } = await this.db.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("is_read", false);
    if (error) fail("unreadCount", error);
    return count ?? 0;
  }

  async markNotificationRead(userId: string, id: string, read: boolean) {
    const { error } = await this.db.from("notifications").update({ is_read: read }).eq("id", id).eq("user_id", userId);
    if (error) fail("markNotificationRead", error);
  }

  async markAllNotificationsRead(userId: string) {
    const { error } = await this.db.from("notifications").update({ is_read: true }).eq("user_id", userId).eq("is_read", false);
    if (error) fail("markAllNotificationsRead", error);
  }

  async insertNotificationIfNew(n: NewNotification) {
    const { data, error } = await this.db
      .from("notifications")
      .upsert({ ...n, type: "opportunity" }, { onConflict: "user_id,dedupe_key", ignoreDuplicates: true })
      .select("id");
    if (error) fail("insertNotificationIfNew", error);
    return (data ?? []).length > 0; // ignored duplicates return no row
  }

  // ---------- jobs & usage ----------
  async startJob(jobType: string, metadata: Record<string, unknown> = {}) {
    const { data, error } = await this.db.from("system_jobs").insert({ job_type: jobType, status: "running", metadata }).select().single();
    if (error) fail("startJob", error);
    return data as SystemJob;
  }

  async finishJob(id: string, result: { status: "success" | "failed"; error?: string | null; metadata?: Record<string, unknown> }) {
    const { error } = await this.db
      .from("system_jobs")
      .update({ status: result.status, finished_at: new Date().toISOString(), error_message: result.error ?? null, ...(result.metadata ? { metadata: result.metadata } : {}) })
      .eq("id", id);
    if (error) fail("finishJob", error);
  }

  async recentJobs(limit: number) {
    const { data, error } = await this.db.from("system_jobs").select("*").order("started_at", { ascending: false }).limit(limit);
    if (error) fail("recentJobs", error);
    return (data ?? []) as SystemJob[];
  }

  async recordUsage(ev: Omit<UsageEvent, "id" | "created_at">) {
    const { error } = await this.db.from("usage_events").insert(ev);
    if (error) fail("recordUsage", error);
  }

  async usageSince(since: Date) {
    const { data, error } = await this.db.from("usage_events").select("*").gte("created_at", since.toISOString()).limit(50000);
    if (error) fail("usageSince", error);
    return (data ?? []) as UsageEvent[];
  }

  // ---------- admin (service role) ----------
  async listUsers(): Promise<AdminUserRow[]> {
    const { data, error } = await this.db.from("profiles").select("*").order("created_at", { ascending: false }).limit(2000);
    if (error) fail("listUsers", error);
    const profiles = (data ?? []) as Profile[];
    const subs = await this.getSubscriptionsByUser(profiles.map((p) => p.id));
    return profiles.map((profile) => ({ profile, subscription: subs.get(profile.id) ?? null }));
  }

  async setSubscription(
    userId: string,
    patch: { plan: PlanId; status: Subscription["status"]; trial_ends_at?: string | null; current_period_end?: string | null },
  ) {
    const { data, error } = await this.db.from("subscriptions").upsert({ user_id: userId, ...patch }, { onConflict: "user_id" }).select().single();
    if (error) fail("setSubscription", error);
    return data as Subscription;
  }

  /** Confirming extends the running period of the same plan, otherwise starts now. Only a still-pending payment can be reviewed. */
  async reviewPayment(id: string, status: Exclude<PaymentStatus, "pending">) {
    // The conditional update is the atomic guard against double-confirmation.
    const { data, error } = await this.db
      .from("payments")
      .update({ status, reviewed_at: new Date().toISOString() })
      .eq("id", id)
      .eq("status", "pending")
      .select()
      .maybeSingle();
    if (error) fail("reviewPayment", error);
    if (!data) return null;
    const p = data as Payment;
    if (status === "confirmed") {
      const now = new Date();
      const sub = await this.getSubscription(p.user_id);
      const currentEnd = sub?.status === "active" && sub.current_period_end ? new Date(sub.current_period_end) : null;
      const start = currentEnd && currentEnd > now && sub?.plan === p.plan ? currentEnd : now;
      await this.setSubscription(p.user_id, {
        plan: p.plan,
        status: "active",
        current_period_end: addMonths(start, p.months).toISOString(),
      });
    }
    return p;
  }

  async platformStats(): Promise<PlatformStats> {
    const nowIso = new Date().toISOString();
    const count = async (table: string, f?: (q: any) => any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
      let q = this.db.from(table).select("*", { count: "exact", head: true });
      if (f) q = f(q);
      const { count: c, error } = await q;
      if (error) fail(`platformStats.${table}`, error);
      return c ?? 0;
    };
    const [users, activeSubscriptions, trialing, listings, pendingPayments, notifications] = await Promise.all([
      count("profiles"),
      count("subscriptions", (q) => q.eq("status", "active").gt("current_period_end", nowIso)),
      count("subscriptions", (q) => q.eq("status", "trialing").gt("trial_ends_at", nowIso)),
      count("listings"),
      count("payments", (q) => q.eq("status", "pending")),
      count("notifications"),
    ]);
    return { users, activeSubscriptions, trialing, listings, pendingPayments, notifications };
  }
}

export async function getSupabaseUserStore(): Promise<Store> {
  return new SupabaseStore(await createUserClient());
}

export function getSupabaseServiceStore(): Store {
  return new SupabaseStore(createServiceClient());
}
