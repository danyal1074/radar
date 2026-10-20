// Core domain types. All prices are integer TOMAN unless a field name says otherwise.

export type ListingSource = "divar" | "sheypoor" | "manual" | "sample";
export type SourceStatus = "active" | "removed" | "unknown";
export type FollowupStatus =
  | "none"
  | "watching"
  | "contacted"
  | "negotiating"
  | "bought"
  | "dropped";
export type EstimateStatus = "success" | "failed";
export type UserRole = "dealer" | "admin";
export type PlanId = "trial" | "basic" | "pro" | "business";
export type SubscriptionStatus = "trialing" | "active" | "expired" | "canceled";
export type PaymentStatus = "pending" | "confirmed" | "rejected";

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  business_name: string;
  city: string;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export interface Listing {
  id: string;
  source: ListingSource;
  source_post_id: string;
  /** Real, verified URL of the original ad. null => button disabled. */
  source_url: string | null;
  title: string;
  make: string;
  model: string;
  trim: string | null;
  year: number | null; // Jalali year (e.g. 1399)
  mileage_km: number | null;
  color: string | null;
  city: string | null;
  price_toman: number;
  description: string | null;
  image_url: string | null;
  published_at: string | null;
  first_seen_at: string;
  last_seen_at: string;
  source_status: SourceStatus;
  /** true => demo/sample record, must be labelled in the UI */
  is_sample: boolean;
  created_at: string;
  updated_at: string;
}

export interface PriceEstimate {
  id: string;
  listing_id: string;
  provider: string; // "mock" | "baravard" | ...
  estimated_price_toman: number | null;
  currency: "IRT";
  estimated_at: string;
  expires_at: string;
  status: EstimateStatus;
  confidence: number | null; // 0..1, only if the provider returns it
  is_sample: boolean;
  request_metadata: Record<string, unknown>;
  response_metadata: Record<string, unknown>;
  created_at: string;
}

export interface PriceHistoryPoint {
  listing_id: string;
  price_toman: number;
  seen_at: string;
}

export interface WatchRule {
  id: string;
  user_id: string;
  name: string;
  make: string | null;
  model: string | null;
  year_min: number | null;
  year_max: number | null;
  price_min_toman: number | null;
  price_max_toman: number | null;
  mileage_min_km: number | null;
  mileage_max_km: number | null;
  city: string | null;
  source: ListingSource | null;
  min_discount_percent: number | null;
  min_discount_toman: number | null;
  urgent_only?: boolean;
  paint_free_only?: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type WatchRuleInput = Omit<
  WatchRule,
  "id" | "user_id" | "created_at" | "updated_at"
>;

export interface Followup {
  user_id: string;
  listing_id: string;
  status: FollowupStatus;
  notes: string;
  next_followup_at: string | null;
  updated_at: string;
  created_at: string;
}

export interface AppNotification {
  id: string;
  user_id: string;
  listing_id: string;
  watch_rule_id: string | null;
  type: "opportunity";
  title: string;
  body: string;
  is_read: boolean;
  dedupe_key: string;
  created_at: string;
}

export interface Subscription {
  user_id: string;
  plan: PlanId;
  status: SubscriptionStatus;
  trial_ends_at: string | null;
  current_period_end: string | null;
  created_at: string;
  updated_at: string;
}

export interface Payment {
  id: string;
  user_id: string;
  plan: PlanId;
  months: number;
  amount_toman: number;
  method: "manual_card_transfer" | "gateway";
  status: PaymentStatus;
  reference: string; // tracking code entered by the dealer / gateway ref
  note: string;
  created_at: string;
  reviewed_at: string | null;
}

export interface SystemJob {
  id: string;
  job_type: string;
  status: "running" | "success" | "failed";
  started_at: string;
  finished_at: string | null;
  error_message: string | null;
  metadata: Record<string, unknown>;
}

export interface UsageEvent {
  id: string;
  kind: "estimate_request" | "estimate_cache_hit" | "estimate_failed";
  provider: string;
  cost_toman: number;
  created_at: string;
}

// ---- Computed views ----

export type OpportunityLabel = "opportunity" | "needs_review" | "normal" | "missing_zero";

export interface TypoInfo {
  isTypo: boolean;
  type: "missing_zero" | "missing_two_zeros" | "unrealistic";
  suggestedPriceToman?: number;
  message: string;
}

export interface PriceComparison {
  estimatedToman: number | null;
  diffToman: number | null;
  diffPercent: number | null;
  /** estimate exists, succeeded and has not expired */
  fresh: boolean;
  label: OpportunityLabel;
  typoInfo?: TypoInfo | null;
}

export interface ListingView {
  listing: Listing;
  estimate: PriceEstimate | null; // latest estimate row (any status)
  comparison: PriceComparison;
  saved: boolean;
  followup: Followup | null;
  /** best matching active rule for this user, if any */
  matchedRuleIds: string[];
  score: number | null;
}
