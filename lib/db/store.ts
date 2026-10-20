import type {
  AppNotification,
  EstimateStatus,
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
import type { ListingImportItem } from "../validation";

export interface UpsertResult {
  inserted: number;
  updated: number;
  unchanged: number;
  priceChanges: number;
  /** ids of listings that were inserted or changed price (candidates for re-evaluation) */
  touchedIds: string[];
}

export interface NewEstimate {
  listing_id: string;
  provider: string;
  estimated_price_toman: number | null;
  estimated_at: string;
  expires_at: string;
  status: EstimateStatus;
  confidence: number | null;
  is_sample: boolean;
  request_metadata: Record<string, unknown>;
  response_metadata: Record<string, unknown>;
}

export interface NewNotification {
  user_id: string;
  listing_id: string;
  watch_rule_id: string | null;
  title: string;
  body: string;
  dedupe_key: string;
}

export interface AdminUserRow {
  profile: Profile;
  subscription: Subscription | null;
}

export interface PlatformStats {
  users: number;
  activeSubscriptions: number;
  trialing: number;
  listings: number;
  pendingPayments: number;
  notifications: number;
}

/**
 * Storage contract. Two implementations exist:
 *  - DevStore       : JSON file, for local development / demos (NOT for production)
 *  - SupabaseStore  : PostgreSQL via Supabase (RLS enforced for user-scoped calls)
 *
 * Every private-data method takes an explicit `userId` and must never return
 * another user's rows.
 */
export interface Store {
  // ---- profiles & subscription ----
  getProfile(userId: string): Promise<Profile | null>;
  updateProfile(
    userId: string,
    patch: Partial<Pick<Profile, "full_name" | "business_name" | "city">>,
  ): Promise<Profile | null>;
  getSubscription(userId: string): Promise<Subscription | null>;

  // ---- payments ----
  createPayment(
    input: Omit<Payment, "id" | "created_at" | "reviewed_at" | "status">,
  ): Promise<Payment>;
  listPayments(filter: { userId?: string; status?: PaymentStatus }): Promise<Payment[]>;

  // ---- shared listings ----
  getListing(id: string): Promise<Listing | null>;
  listListings(opts?: { limit?: number }): Promise<Listing[]>;
  upsertListings(items: ListingImportItem[], opts: { isSample: boolean; now: Date }): Promise<UpsertResult>;
  deleteListing(id: string): Promise<boolean>;
  deleteSampleListings(): Promise<number>;
  getPriceHistory(listingId: string): Promise<PriceHistoryPoint[]>;

  // ---- estimates (shared across all users: the estimate depends only on the listing) ----
  latestEstimates(listingIds: string[]): Promise<Map<string, PriceEstimate>>;
  findFreshEstimateBySignature(signature: string, now: Date): Promise<PriceEstimate | null>;
  insertEstimate(e: NewEstimate): Promise<PriceEstimate>;
  listingsNeedingEstimate(now: Date, limit: number): Promise<Listing[]>;

  // ---- watch rules ----
  listRules(userId: string): Promise<WatchRule[]>;
  createRule(userId: string, input: WatchRuleInput): Promise<WatchRule>;
  updateRule(userId: string, id: string, input: WatchRuleInput): Promise<WatchRule | null>;
  setRuleActive(userId: string, id: string, active: boolean): Promise<WatchRule | null>;
  deleteRule(userId: string, id: string): Promise<boolean>;

  // ---- saved & followups ----
  listSavedIds(userId: string): Promise<string[]>;
  setSaved(userId: string, listingId: string, saved: boolean): Promise<void>;
  listFollowups(userId: string): Promise<Followup[]>;
  upsertFollowup(
    userId: string,
    listingId: string,
    patch: Pick<Followup, "status" | "notes" | "next_followup_at">,
  ): Promise<Followup>;

  // ---- notifications ----
  listNotifications(userId: string, opts?: { unreadOnly?: boolean; limit?: number }): Promise<AppNotification[]>;
  unreadCount(userId: string): Promise<number>;
  markNotificationRead(userId: string, id: string, read: boolean): Promise<void>;
  markAllNotificationsRead(userId: string): Promise<void>;

  // ---- service-level (jobs / admin). Callers must be trusted server code. ----
  listAllActiveRules(): Promise<WatchRule[]>;
  /** Returns true if inserted, false if a notification with the same dedupe_key already exists. */
  insertNotificationIfNew(n: NewNotification): Promise<boolean>;
  startJob(jobType: string, metadata?: Record<string, unknown>): Promise<SystemJob>;
  finishJob(
    id: string,
    result: { status: "success" | "failed"; error?: string | null; metadata?: Record<string, unknown> },
  ): Promise<void>;
  recentJobs(limit: number): Promise<SystemJob[]>;
  recordUsage(ev: Omit<UsageEvent, "id" | "created_at">): Promise<void>;
  usageSince(since: Date): Promise<UsageEvent[]>;
  getSubscriptionsByUser(userIds: string[]): Promise<Map<string, Subscription>>;

  // ---- admin ----
  listUsers(): Promise<AdminUserRow[]>;
  setSubscription(
    userId: string,
    patch: {
      plan: PlanId;
      status: Subscription["status"];
      trial_ends_at?: string | null;
      current_period_end?: string | null;
    },
  ): Promise<Subscription>;
  reviewPayment(id: string, status: Exclude<PaymentStatus, "pending">): Promise<Payment | null>;
  platformStats(): Promise<PlatformStats>;
}
