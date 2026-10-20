import { promises as fs } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { addMonths, TRIAL_DAYS } from "../plans";
import { isEstimateFresh } from "../pricing";
import type {
  AppNotification,
  Followup,
  Listing,
  Payment,
  PlanId,
  PriceEstimate,
  PriceHistoryPoint,
  Profile,
  Subscription,
  SystemJob,
  UsageEvent,
  UserRole,
  WatchRule,
  WatchRuleInput,
} from "../types";
import { safeListingUrl, type ListingImportItem } from "../validation";
import { isJunkOrUnrealisticListing } from "../junk-filter";
import type {
  AdminUserRow,
  NewEstimate,
  NewNotification,
  PlatformStats,
  Store,
  UpsertResult,
} from "./store";

/**
 * DEV STORE — JSON file persistence for local development and demos.
 * Not suitable for production: no concurrency control across processes, no
 * backups, passwords hashed in a flat file. Use SupabaseStore in production.
 */

export interface DevUser {
  profile: Profile;
  passwordHash: string;
}

interface Db {
  users: DevUser[];
  subscriptions: Subscription[];
  payments: Payment[];
  listings: Listing[];
  priceHistory: PriceHistoryPoint[];
  estimates: PriceEstimate[];
  rules: WatchRule[];
  saved: { user_id: string; listing_id: string; created_at: string }[];
  followups: Followup[];
  notifications: AppNotification[];
  jobs: SystemJob[];
  usage: UsageEvent[];
}

const emptyDb = (): Db => ({
  users: [],
  subscriptions: [],
  payments: [],
  listings: [],
  priceHistory: [],
  estimates: [],
  rules: [],
  saved: [],
  followups: [],
  notifications: [],
  jobs: [],
  usage: [],
});

const nowIso = () => new Date().toISOString();

export class DevStore implements Store {
  private chain: Promise<unknown> = Promise.resolve();

  constructor(private readonly file: string) {}

  // ---------- persistence ----------
  private async load(): Promise<Db> {
    try {
      const raw = await fs.readFile(this.file, "utf8");
      return { ...emptyDb(), ...(JSON.parse(raw) as Partial<Db>) };
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code === "ENOENT") return emptyDb();
      throw e;
    }
  }

  private async save(db: Db): Promise<void> {
    await fs.mkdir(path.dirname(this.file), { recursive: true });
    const tmp = `${this.file}.${process.pid}.tmp`;
    await fs.writeFile(tmp, JSON.stringify(db), "utf8");
    await fs.rename(tmp, this.file);
  }

  /** Serialise read-modify-write cycles inside this process. */
  private mutate<T>(fn: (db: Db) => T | Promise<T>): Promise<T> {
    const run = async () => {
      const db = await this.load();
      const out = await fn(db);
      await this.save(db);
      return out;
    };
    const p = this.chain.then(run, run);
    this.chain = p.catch(() => undefined);
    return p;
  }

  private async read<T>(fn: (db: Db) => T): Promise<T> {
    await this.chain.catch(() => undefined);
    return fn(await this.load());
  }

  // ---------- dev-only auth helpers (not part of Store) ----------
  async findUserByEmail(email: string): Promise<DevUser | null> {
    const e = email.trim().toLowerCase();
    return this.read((db) => db.users.find((u) => u.profile.email === e) ?? null);
  }

  async createUser(input: {
    email: string;
    passwordHash: string;
    full_name: string;
    business_name: string;
    city: string;
    role: UserRole;
  }): Promise<Profile | null> {
    return this.mutate((db) => {
      const email = input.email.trim().toLowerCase();
      if (db.users.some((u) => u.profile.email === email)) return null;
      const ts = nowIso();
      const profile: Profile = {
        id: randomUUID(),
        email,
        full_name: input.full_name,
        business_name: input.business_name,
        city: input.city,
        role: input.role,
        created_at: ts,
        updated_at: ts,
      };
      db.users.push({ profile, passwordHash: input.passwordHash });
      db.subscriptions.push({
        user_id: profile.id,
        plan: "trial",
        status: "trialing",
        trial_ends_at: new Date(Date.now() + TRIAL_DAYS * 86_400_000).toISOString(),
        current_period_end: null,
        created_at: ts,
        updated_at: ts,
      });
      return profile;
    });
  }

  async isEmpty(): Promise<boolean> {
    return this.read((db) => db.listings.length === 0);
  }

  // ---------- profiles & subscription ----------
  getProfile(userId: string) {
    return this.read((db) => db.users.find((u) => u.profile.id === userId)?.profile ?? null);
  }

  updateProfile(
    userId: string,
    patch: Partial<Pick<Profile, "full_name" | "business_name" | "city">>,
  ) {
    return this.mutate((db) => {
      const u = db.users.find((x) => x.profile.id === userId);
      if (!u) return null;
      u.profile = { ...u.profile, ...patch, updated_at: nowIso() };
      return u.profile;
    });
  }

  getSubscription(userId: string) {
    return this.read((db) => db.subscriptions.find((s) => s.user_id === userId) ?? null);
  }

  getSubscriptionsByUser(userIds: string[]) {
    return this.read((db) => {
      const set = new Set(userIds);
      return new Map(db.subscriptions.filter((s) => set.has(s.user_id)).map((s) => [s.user_id, s]));
    });
  }

  // ---------- payments ----------
  createPayment(input: Omit<Payment, "id" | "created_at" | "reviewed_at" | "status">) {
    return this.mutate((db) => {
      const p: Payment = {
        ...input,
        id: randomUUID(),
        status: "pending",
        created_at: nowIso(),
        reviewed_at: null,
      };
      db.payments.push(p);
      return p;
    });
  }

  listPayments(filter: { userId?: string; status?: Payment["status"] }) {
    return this.read((db) =>
      db.payments
        .filter((p) => (!filter.userId || p.user_id === filter.userId) && (!filter.status || p.status === filter.status))
        .sort((a, b) => b.created_at.localeCompare(a.created_at)),
    );
  }

  // ---------- listings ----------
  getListing(id: string) {
    return this.read((db) => db.listings.find((l) => l.id === id) ?? null);
  }

  listListings(opts: { limit?: number } = {}) {
    return this.read((db) =>
      [...db.listings]
        .sort((a, b) => (b.published_at ?? b.first_seen_at).localeCompare(a.published_at ?? a.first_seen_at))
        .slice(0, opts.limit ?? 5000),
    );
  }

  deleteListing(id: string): Promise<boolean> {
    return this.mutate((db) => {
      const idx = db.listings.findIndex((l) => l.id === id);
      if (idx === -1) return false;
      db.listings.splice(idx, 1);
      db.priceHistory = db.priceHistory.filter((h) => h.listing_id !== id);
      db.estimates = db.estimates.filter((e) => e.listing_id !== id);
      db.saved = db.saved.filter((s) => s.listing_id !== id);
      db.followups = db.followups.filter((f) => f.listing_id !== id);
      db.notifications = db.notifications.filter((n) => n.listing_id !== id);
      return true;
    });
  }

  deleteSampleListings(): Promise<number> {
    return this.mutate((db) => {
      const sampleIds = new Set(db.listings.filter((l) => l.is_sample).map((l) => l.id));
      const count = sampleIds.size;
      db.listings = db.listings.filter((l) => !sampleIds.has(l.id));
      db.priceHistory = db.priceHistory.filter((h) => !sampleIds.has(h.listing_id));
      db.estimates = db.estimates.filter((e) => !sampleIds.has(e.listing_id));
      db.saved = db.saved.filter((s) => !sampleIds.has(s.listing_id));
      db.followups = db.followups.filter((f) => !sampleIds.has(f.listing_id));
      db.notifications = db.notifications.filter((n) => !sampleIds.has(n.listing_id));
      return count;
    });
  }

  upsertListings(items: ListingImportItem[], opts: { isSample: boolean; now: Date }): Promise<UpsertResult> {
    return this.mutate((db) => {
      const res: UpsertResult = { inserted: 0, updated: 0, unchanged: 0, priceChanges: 0, touchedIds: [] };
      const ts = opts.now.toISOString();
      for (const it of items) {
        if (isJunkOrUnrealisticListing(it).isJunk) {
          continue;
        }
        const existing = db.listings.find(
          (l) => l.source === it.source && l.source_post_id === it.source_post_id,
        );
        const url = safeListingUrl(it.source_url ?? null);
        if (!existing) {
          const l: Listing = {
            id: randomUUID(),
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
            created_at: ts,
            updated_at: ts,
          };
          db.listings.push(l);
          db.priceHistory.push({ listing_id: l.id, price_toman: l.price_toman, seen_at: ts });
          res.inserted++;
          res.touchedIds.push(l.id);
          continue;
        }
        const priceChanged = existing.price_toman !== it.price_toman;
        const reappeared = existing.source_status !== "active";
        const changed =
          priceChanged ||
          reappeared ||
          existing.title !== it.title ||
          existing.mileage_km !== (it.mileage_km ?? null);
        existing.last_seen_at = ts;
        if (changed) {
          existing.title = it.title;
          existing.price_toman = it.price_toman;
          existing.mileage_km = it.mileage_km ?? null;
          existing.source_url = url ?? existing.source_url;
          existing.source_status = "active";
          existing.updated_at = ts;
          res.updated++;
          if (priceChanged) {
            db.priceHistory.push({ listing_id: existing.id, price_toman: it.price_toman, seen_at: ts });
            res.priceChanges++;
            res.touchedIds.push(existing.id);
          }
        } else {
          res.unchanged++;
        }
      }
      return res;
    });
  }

  getPriceHistory(listingId: string) {
    return this.read((db) =>
      db.priceHistory.filter((p) => p.listing_id === listingId).sort((a, b) => a.seen_at.localeCompare(b.seen_at)),
    );
  }

  // ---------- estimates ----------
  latestEstimates(listingIds: string[]) {
    return this.read((db) => {
      const wanted = new Set(listingIds);
      const out = new Map<string, PriceEstimate>();
      for (const e of db.estimates) {
        if (!wanted.has(e.listing_id)) continue;
        const prev = out.get(e.listing_id);
        if (!prev || e.created_at >= prev.created_at) out.set(e.listing_id, e);
      }
      return out;
    });
  }

  findFreshEstimateBySignature(signature: string, now: Date) {
    return this.read((db) => {
      let best: PriceEstimate | null = null;
      for (const e of db.estimates) {
        if (e.request_metadata?.signature !== signature) continue;
        if (!isEstimateFresh(e, now)) continue;
        if (!best || e.created_at >= best.created_at) best = e;
      }
      return best;
    });
  }

  insertEstimate(e: NewEstimate) {
    return this.mutate((db) => {
      const row: PriceEstimate = {
        id: randomUUID(),
        listing_id: e.listing_id,
        provider: e.provider,
        estimated_price_toman: e.estimated_price_toman,
        currency: "IRT",
        estimated_at: e.estimated_at,
        expires_at: e.expires_at,
        status: e.status,
        confidence: e.confidence,
        is_sample: e.is_sample,
        request_metadata: e.request_metadata,
        response_metadata: e.response_metadata,
        created_at: nowIso(),
      };
      db.estimates.push(row);
      return row;
    });
  }

  listingsNeedingEstimate(now: Date, limit: number) {
    return this.read((db) => {
      const latest = new Map<string, PriceEstimate>();
      for (const e of db.estimates) {
        const prev = latest.get(e.listing_id);
        if (!prev || e.created_at >= prev.created_at) latest.set(e.listing_id, e);
      }
      const nowMs = now.getTime();
      return db.listings
        .filter((l) => l.source_status === "active")
        .filter((l) => {
          const e = latest.get(l.id);
          if (!e) return true;
          if (e.status === "success") return !isEstimateFresh(e, now);
          // failed: retry only after the back-off window stored in expires_at
          return new Date(e.expires_at).getTime() <= nowMs;
        })
        .sort((a, b) => b.first_seen_at.localeCompare(a.first_seen_at))
        .slice(0, limit);
    });
  }

  // ---------- rules ----------
  listRules(userId: string) {
    return this.read((db) =>
      db.rules.filter((r) => r.user_id === userId).sort((a, b) => b.created_at.localeCompare(a.created_at)),
    );
  }

  createRule(userId: string, input: WatchRuleInput) {
    return this.mutate((db) => {
      const ts = nowIso();
      const r: WatchRule = { ...input, id: randomUUID(), user_id: userId, created_at: ts, updated_at: ts };
      db.rules.push(r);
      return r;
    });
  }

  updateRule(userId: string, id: string, input: WatchRuleInput) {
    return this.mutate((db) => {
      const idx = db.rules.findIndex((r) => r.id === id && r.user_id === userId);
      if (idx < 0) return null;
      db.rules[idx] = { ...db.rules[idx], ...input, updated_at: nowIso() };
      return db.rules[idx];
    });
  }

  setRuleActive(userId: string, id: string, active: boolean) {
    return this.mutate((db) => {
      const r = db.rules.find((x) => x.id === id && x.user_id === userId);
      if (!r) return null;
      r.is_active = active;
      r.updated_at = nowIso();
      return r;
    });
  }

  deleteRule(userId: string, id: string) {
    return this.mutate((db) => {
      const before = db.rules.length;
      db.rules = db.rules.filter((r) => !(r.id === id && r.user_id === userId));
      return db.rules.length < before;
    });
  }

  listAllActiveRules() {
    return this.read((db) => db.rules.filter((r) => r.is_active));
  }

  // ---------- saved & followups ----------
  listSavedIds(userId: string) {
    return this.read((db) => db.saved.filter((s) => s.user_id === userId).map((s) => s.listing_id));
  }

  setSaved(userId: string, listingId: string, saved: boolean) {
    return this.mutate((db) => {
      const exists = db.saved.some((s) => s.user_id === userId && s.listing_id === listingId);
      if (saved && !exists) {
        if (!db.listings.some((l) => l.id === listingId)) return;
        db.saved.push({ user_id: userId, listing_id: listingId, created_at: nowIso() });
      }
      if (!saved && exists) {
        db.saved = db.saved.filter((s) => !(s.user_id === userId && s.listing_id === listingId));
      }
    });
  }

  listFollowups(userId: string) {
    return this.read((db) => db.followups.filter((f) => f.user_id === userId));
  }

  upsertFollowup(
    userId: string,
    listingId: string,
    patch: Pick<Followup, "status" | "notes" | "next_followup_at">,
  ) {
    return this.mutate((db) => {
      const ts = nowIso();
      let f = db.followups.find((x) => x.user_id === userId && x.listing_id === listingId);
      if (!f) {
        f = { user_id: userId, listing_id: listingId, ...patch, created_at: ts, updated_at: ts };
        db.followups.push(f);
      } else {
        f.status = patch.status;
        f.notes = patch.notes;
        f.next_followup_at = patch.next_followup_at;
        f.updated_at = ts;
      }
      return f;
    });
  }

  // ---------- notifications ----------
  listNotifications(userId: string, opts: { unreadOnly?: boolean; limit?: number } = {}) {
    return this.read((db) =>
      db.notifications
        .filter((n) => n.user_id === userId && (!opts.unreadOnly || !n.is_read))
        .sort((a, b) => b.created_at.localeCompare(a.created_at))
        .slice(0, opts.limit ?? 200),
    );
  }

  unreadCount(userId: string) {
    return this.read((db) => db.notifications.filter((n) => n.user_id === userId && !n.is_read).length);
  }

  markNotificationRead(userId: string, id: string, read: boolean) {
    return this.mutate((db) => {
      const n = db.notifications.find((x) => x.id === id && x.user_id === userId);
      if (n) n.is_read = read;
    });
  }

  markAllNotificationsRead(userId: string) {
    return this.mutate((db) => {
      for (const n of db.notifications) if (n.user_id === userId) n.is_read = true;
    });
  }

  insertNotificationIfNew(n: NewNotification) {
    return this.mutate((db) => {
      if (db.notifications.some((x) => x.user_id === n.user_id && x.dedupe_key === n.dedupe_key)) return false;
      db.notifications.push({
        id: randomUUID(),
        user_id: n.user_id,
        listing_id: n.listing_id,
        watch_rule_id: n.watch_rule_id,
        type: "opportunity",
        title: n.title,
        body: n.body,
        is_read: false,
        dedupe_key: n.dedupe_key,
        created_at: nowIso(),
      });
      return true;
    });
  }

  // ---------- jobs & usage ----------
  startJob(jobType: string, metadata: Record<string, unknown> = {}) {
    return this.mutate((db) => {
      const j: SystemJob = {
        id: randomUUID(),
        job_type: jobType,
        status: "running",
        started_at: nowIso(),
        finished_at: null,
        error_message: null,
        metadata,
      };
      db.jobs.push(j);
      return j;
    });
  }

  finishJob(
    id: string,
    result: { status: "success" | "failed"; error?: string | null; metadata?: Record<string, unknown> },
  ) {
    return this.mutate((db) => {
      const j = db.jobs.find((x) => x.id === id);
      if (!j) return;
      j.status = result.status;
      j.finished_at = nowIso();
      j.error_message = result.error ?? null;
      j.metadata = { ...j.metadata, ...(result.metadata ?? {}) };
    });
  }

  recentJobs(limit: number) {
    return this.read((db) => [...db.jobs].sort((a, b) => b.started_at.localeCompare(a.started_at)).slice(0, limit));
  }

  recordUsage(ev: Omit<UsageEvent, "id" | "created_at">) {
    return this.mutate((db) => {
      db.usage.push({ ...ev, id: randomUUID(), created_at: nowIso() });
    });
  }

  usageSince(since: Date) {
    return this.read((db) => db.usage.filter((u) => u.created_at >= since.toISOString()));
  }

  // ---------- admin ----------
  listUsers(): Promise<AdminUserRow[]> {
    return this.read((db) =>
      db.users
        .map((u) => ({
          profile: u.profile,
          subscription: db.subscriptions.find((s) => s.user_id === u.profile.id) ?? null,
        }))
        .sort((a, b) => b.profile.created_at.localeCompare(a.profile.created_at)),
    );
  }

  setSubscription(
    userId: string,
    patch: {
      plan: PlanId;
      status: Subscription["status"];
      trial_ends_at?: string | null;
      current_period_end?: string | null;
    },
  ) {
    return this.mutate((db) => {
      const ts = nowIso();
      let s = db.subscriptions.find((x) => x.user_id === userId);
      if (!s) {
        s = {
          user_id: userId,
          plan: patch.plan,
          status: patch.status,
          trial_ends_at: null,
          current_period_end: null,
          created_at: ts,
          updated_at: ts,
        };
        db.subscriptions.push(s);
      }
      s.plan = patch.plan;
      s.status = patch.status;
      if (patch.trial_ends_at !== undefined) s.trial_ends_at = patch.trial_ends_at;
      if (patch.current_period_end !== undefined) s.current_period_end = patch.current_period_end;
      s.updated_at = ts;
      return s;
    });
  }

  /**
   * Approving a payment extends the subscription: if the current period is still
   * running, the new months are added to its end, otherwise they start now.
   */
  reviewPayment(id: string, status: "confirmed" | "rejected") {
    return this.mutate((db) => {
      const p = db.payments.find((x) => x.id === id);
      if (!p || p.status !== "pending") return null;
      p.status = status;
      p.reviewed_at = nowIso();
      if (status === "confirmed") {
        const now = new Date();
        let s = db.subscriptions.find((x) => x.user_id === p.user_id);
        const currentEnd =
          s && s.status === "active" && s.current_period_end ? new Date(s.current_period_end) : null;
        const start = currentEnd && currentEnd > now && s?.plan === p.plan ? currentEnd : now;
        const end = addMonths(start, p.months).toISOString();
        if (!s) {
          s = {
            user_id: p.user_id,
            plan: p.plan,
            status: "active",
            trial_ends_at: null,
            current_period_end: end,
            created_at: nowIso(),
            updated_at: nowIso(),
          };
          db.subscriptions.push(s);
        } else {
          s.plan = p.plan;
          s.status = "active";
          s.current_period_end = end;
          s.updated_at = nowIso();
        }
      }
      return p;
    });
  }

  platformStats(): Promise<PlatformStats> {
    return this.read((db) => ({
      users: db.users.length,
      activeSubscriptions: db.subscriptions.filter(
        (s) => s.status === "active" && s.current_period_end && new Date(s.current_period_end) > new Date(),
      ).length,
      trialing: db.subscriptions.filter(
        (s) => s.status === "trialing" && s.trial_ends_at && new Date(s.trial_ends_at) > new Date(),
      ).length,
      listings: db.listings.length,
      pendingPayments: db.payments.filter((p) => p.status === "pending").length,
      notifications: db.notifications.length,
    }));
  }
}
