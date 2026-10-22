import { z } from "zod";

// ---------- URL allowlist (SSRF / open-redirect protection) ----------
// We never fetch these URLs server-side; we only render them as <a href>.
// Still, we only accept https links on known marketplace hosts.

const ALLOWED_HOSTS = [/(^|\.)divar\.ir$/i, /(^|\.)sheypoor\.com$/i];

export function isAllowedListingUrl(raw: string | null | undefined): boolean {
  if (!raw) return false;
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return false;
  }
  if (u.protocol !== "https:") return false;
  if (u.username || u.password) return false;
  if (u.port && u.port !== "443") return false;
  return ALLOWED_HOSTS.some((re) => re.test(u.hostname));
}

/** Returns the URL only if it passes validation, else null. */
export function safeListingUrl(raw: string | null | undefined): string | null {
  return isAllowedListingUrl(raw) ? (raw as string) : null;
}

// ---------- shared helpers ----------

const optionalInt = (min: number, max: number) =>
  z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? null : v),
    z.coerce.number().int().min(min).max(max).nullable(),
  );

const optionalText = z.preprocess(
  (v) => (typeof v === "string" && v.trim() === "" ? null : v),
  z.string().trim().max(80).nullable(),
);

// ---------- auth ----------

export const registerSchema = z.object({
  full_name: z.string().trim().min(2, "نام و نام خانوادگی را وارد کنید").max(80),
  business_name: z.string().trim().min(2, "نام نمایشگاه را وارد کنید").max(80),
  city: z
    .string()
    .trim()
    .min(2, "شهر را انتخاب کنید")
    .max(60)
    .transform((v) => (v.includes("مشهد") ? "مشهد" : "تربت‌حیدریه")),
  phone: z
    .string()
    .trim()
    .transform((v) => v.replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d))).replace(/\s+/g, ""))
    .refine((v) => /^09\d{9}$/.test(v), "شماره موبایل باید ۱۱ رقم و با ۰۹ شروع شود"),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .optional()
    .or(z.literal(""))
    .transform((v) => (v && v.length > 0 ? v : null))
    .refine((v) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), "فرمت ایمیل نامعتبر است"),
  password: z
    .string()
    .min(6, "رمز عبور حداقل ۶ کاراکتر باشد")
    .max(128),
});

export const loginSchema = z.object({
  identifier: z
    .string()
    .trim()
    .min(1, "شماره موبایل یا ایمیل را وارد کنید")
    .transform((v) => v.replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d))).trim()),
  password: z.string().min(1, "رمز عبور را وارد کنید"),
});

// ---------- watch rules ----------

export const watchRuleSchema = z
  .object({
    name: z.string().trim().max(80).default("هشدار خودرو جدید"),
    make: optionalText,
    model: optionalText,
    year_min: optionalInt(1300, 1500),
    year_max: optionalInt(1300, 1500),
    price_min_toman: optionalInt(0, 100_000_000_000),
    price_max_toman: optionalInt(0, 100_000_000_000),
    mileage_min_km: optionalInt(0, 2_000_000),
    mileage_max_km: optionalInt(0, 2_000_000),
    city: optionalText,
    source: z.preprocess(
      (v) => (v === "" || v === "any" || v === undefined ? null : v),
      z.enum(["divar", "sheypoor", "manual", "sample"]).nullable(),
    ),
    min_discount_percent: z.preprocess(
      (v) => (v === "" || v === null || v === undefined ? null : v),
      z.coerce.number().min(0).max(90).nullable(),
    ),
    min_discount_toman: optionalInt(0, 100_000_000_000),
    urgent_only: z.boolean().default(false),
    paint_free_only: z.boolean().default(false),
    damage_filter: z.enum(["all", "clean_only", "damaged_only"]).default("all").nullable(),
    is_active: z.boolean().default(true),
  })
  .superRefine((r, ctx) => {
    const pairs: [keyof typeof r, keyof typeof r, string][] = [
      ["year_min", "year_max", "بازه سال نامعتبر است"],
      ["price_min_toman", "price_max_toman", "بازه قیمت نامعتبر است"],
      ["mileage_min_km", "mileage_max_km", "بازه کارکرد نامعتبر است"],
    ];
    for (const [a, b, msg] of pairs) {
      const va = r[a] as number | null;
      const vb = r[b] as number | null;
      if (va !== null && vb !== null && va > vb) {
        ctx.addIssue({ code: "custom", path: [b], message: msg });
      }
    }
    // If no specific discount is specified, any vehicle matching the criteria (make/price/etc.) triggers the alert
  });

export type WatchRuleFormValues = z.infer<typeof watchRuleSchema>;

// ---------- followups ----------

export const followupSchema = z.object({
  status: z.enum(["none", "watching", "contacted", "negotiating", "bought", "dropped"]),
  notes: z.string().max(2000).default(""),
  next_followup_at: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? null : v),
    z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).nullable(),
  ),
});

// ---------- listing import (JSON / admin panel) ----------

export const listingImportItemSchema = z.object({
  source: z.enum(["divar", "sheypoor", "manual", "sample"]).default("manual"),
  source_post_id: z.string().trim().min(1).max(120),
  source_url: z.string().url().nullable().optional(),
  title: z.string().trim().min(3).max(200),
  make: z.string().trim().min(1).max(60),
  model: z.string().trim().min(1).max(80),
  trim: z.string().trim().max(80).nullable().optional(),
  year: z.number().int().min(1300).max(1500).nullable().optional(),
  mileage_km: z.number().int().min(0).max(3_000_000).nullable().optional(),
  color: z.string().trim().max(40).nullable().optional(),
  city: z.string().trim().max(60).nullable().optional(),
  price_toman: z.number().int().positive().max(100_000_000_000),
  description: z.string().max(5000).nullable().optional(),
  image_url: z.string().url().nullable().optional(),
  is_damaged: z.boolean().optional(),
  published_at: z.string().datetime({ offset: true }).nullable().optional(),
});

export const listingImportSchema = z.array(listingImportItemSchema).min(1).max(500);
export type ListingImportItem = z.infer<typeof listingImportItemSchema>;

// ---------- payments ----------

export const paymentRequestSchema = z.object({
  plan: z.enum(["basic", "pro", "business"]),
  months: z.coerce.number().int().refine((m) => [1, 3, 12].includes(m), "مدت نامعتبر است"),
  reference: z.string().trim().min(4, "کد پیگیری را وارد کنید").max(60),
  note: z.string().trim().max(300).default(""),
});

// ---------- listing query ----------

export const SORT_KEYS = ["newest", "price_asc", "discount", "score"] as const;
export type SortKey = (typeof SORT_KEYS)[number];

export interface ListingFilters {
  q?: string;
  make?: string;
  model?: string;
  yearMin?: number;
  yearMax?: number;
  priceMin?: number;
  priceMax?: number;
  mileageMin?: number;
  mileageMax?: number;
  city?: string;
  source?: string;
  onlyOpportunities?: boolean;
  onlyUrgent?: boolean;
  onlyPaintless?: boolean;
  damageFilter?: "all" | "clean_only" | "damaged_only";
}

export function toInt(v: string | string[] | undefined): number | undefined {
  const s = Array.isArray(v) ? v[0] : v;
  if (!s) return undefined;
  const n = Number(s.replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0)).replace(/[,٬\s]/g, ""));
  return Number.isFinite(n) ? Math.trunc(n) : undefined;
}

export function toStr(v: string | string[] | undefined): string | undefined {
  const s = Array.isArray(v) ? v[0] : v;
  const t = s?.trim();
  return t ? t : undefined;
}
