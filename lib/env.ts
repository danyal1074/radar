import "server-only";

/** Server-side configuration. Never import this from a client component. */

function int(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? Math.trunc(n) : fallback;
}

export const env = {
  get supabaseUrl() {
    return process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  },
  get supabaseAnonKey() {
    return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
  },
  /** server only - never expose */
  get supabaseServiceRoleKey() {
    return process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  },
  get hasSupabase() {
    return Boolean(this.supabaseUrl && this.supabaseAnonKey && this.supabaseServiceRoleKey);
  },
  /** Comma separated emails that become platform admins on registration. */
  get adminEmails(): string[] {
    return (process.env.ADMIN_EMAILS ?? "")
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
  },
  get cronSecret() {
    return process.env.CRON_SECRET ?? "";
  },
  get sessionSecret() {
    return process.env.SESSION_SECRET ?? "";
  },
  get estimateTtlHours() {
    return int("ESTIMATE_TTL_HOURS", 24);
  },
  get estimateFailureRetryMinutes() {
    return int("ESTIMATE_FAILURE_RETRY_MINUTES", 60);
  },
  get maxEstimatesPerRun() {
    return int("MAX_ESTIMATES_PER_RUN", 200);
  },
  get maxEstimatesPerDay() {
    return int("MAX_ESTIMATES_PER_DAY", 50000);
  },
  /** Cost of one paid estimate in toman (set from Baravard's real pricing). */
  get estimateCostToman() {
    return int("ESTIMATE_COST_TOMAN", 0);
  },
  get baravardApiKey() {
    return process.env.BARAVARD_API_KEY ?? "";
  },
  get devStorePath() {
    return process.env.DEV_STORE_PATH ?? ".data/dev-store.json";
  },
  get allowDevStoreInProduction() {
    return process.env.ALLOW_DEV_STORE_IN_PRODUCTION === "true";
  },
  /** Allow demo listings / demo estimates outside the dev store (never enable for real customers). */
  get allowSampleData() {
    return process.env.ALLOW_SAMPLE_DATA === "true";
  },
  get isProduction() {
    return process.env.NODE_ENV === "production";
  },
  get paymentCardNumber() {
    return process.env.PAYMENT_CARD_NUMBER ?? "";
  },
  get paymentCardHolder() {
    return process.env.PAYMENT_CARD_HOLDER ?? "";
  },
  get supportContact() {
    return process.env.SUPPORT_CONTACT ?? "";
  },
};
