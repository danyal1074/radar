/**
 * Pure login-identifier resolution.
 * Website accounts authenticate with a synthetic address `<phone>@radar.digiral.ir`.
 * A typed inbox address lives on `profiles.email` and must be mapped back to that auth email.
 *
 * A few usernames (and one phone) used to reach an older account before profiles
 * could resolve them. Those addresses are extra candidates tried AFTER the account
 * the identifier actually belongs to, so a shared phone signs into the newer
 * account when that password matches.
 */

export interface LoginProfileHint {
  id: string;
  /** profiles.email — real inbox or the synthetic auth address. */
  email: string;
  /** auth.users.email when known. */
  authEmail?: string | null;
  fullName?: string | null;
  businessName?: string | null;
}

const PERSIAN_DIGITS = "۰۱۲۳۴۵۶۷۸۹";
const ARABIC_DIGITS = "٠١٢٣٤٥٦٧٨٩";

export function normalizeLoginIdentifier(raw: string): string {
  return raw
    .trim()
    .replace(/[۰-۹]/g, (d) => String(PERSIAN_DIGITS.indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String(ARABIC_DIGITS.indexOf(d)))
    .replace(/\s+/g, "")
    .toLowerCase();
}

/** Iranian mobile, normalised to 09xxxxxxxxx, or null. */
export function canonicalPhone(identifier: string): string | null {
  const clean = normalizeLoginIdentifier(identifier);
  if (/^09\d{9}$/.test(clean)) return clean;
  if (/^9\d{9}$/.test(clean)) return `0${clean}`;
  return null;
}

export function syntheticAuthEmail(phone: string): string {
  return `${phone}@radar.digiral.ir`;
}

/**
 * Older sign-in aliases. The phone is listed only as a *second* candidate:
 * `<phone>@radar.digiral.ir` is always tried first.
 */
const LEGACY_LOGIN_CANDIDATES: Record<string, readonly string[]> = {
  admin: ["admin@radar.ir"],
  danyal: ["danyal.haghdady@gmail.com"],
  danyal1074: ["danyal.haghdady@gmail.com"],
  "danyal.haghdady": ["danyal.haghdady@gmail.com"],
  "09999212209": ["danyal.haghdady@gmail.com"],
};

/** Quote a PostgREST `.or()` value. Dots and other reserved characters must not be bare. */
export function quotePostgrestValue(value: string): string {
  return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

/**
 * `.or()` filter for a username. Email local-parts keep their dots inside quotes.
 * A name keeps the spaces the user typed as `%`, so "دانیال حقدادی" matches a stored full name.
 */
export function usernameProfileOrFilter(raw: string): string | null {
  const clean = normalizeLoginIdentifier(raw);
  if (!clean || clean.includes("@") || canonicalPhone(clean)) return null;
  const localKey = clean.replace(/[%_,()"]/g, "");
  if (!localKey) return null;

  const spaced = raw
    .trim()
    .replace(/[۰-۹]/g, (d) => String(PERSIAN_DIGITS.indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String(ARABIC_DIGITS.indexOf(d)))
    .replace(/\s+/g, " ")
    .toLowerCase();
  const words = spaced.split(" ").map((word) => word.replace(/[%_,()"]/g, "")).filter(Boolean);
  const namePattern = `%${(words.length ? words : [localKey]).join("%")}%`;

  return [
    `email.ilike.${quotePostgrestValue(`${localKey}@%`)}`,
    `full_name.ilike.${quotePostgrestValue(namePattern)}`,
    `business_name.ilike.${quotePostgrestValue(namePattern)}`,
  ].join(",");
}

function pushEmail(out: string[], value: string | null | undefined) {
  const v = (value ?? "").trim();
  if (!v.includes("@")) return;
  if (out.some((e) => e.toLowerCase() === v.toLowerCase())) return;
  out.push(v);
}

function compact(value: string | null | undefined): string {
  return normalizeLoginIdentifier(value ?? "").replace(/[.\-_]/g, "");
}

function hintMatchesUsername(hint: LoginProfileHint, username: string): boolean {
  const key = compact(username);
  if (!key) return false;
  const emails = [hint.email, hint.authEmail ?? ""];
  for (const email of emails) {
    const local = compact(email.split("@")[0] ?? "");
    if (local && local === key) return true;
  }
  if (compact(hint.fullName) === key) return true;
  if (compact(hint.businessName) === key) return true;
  return false;
}

function appendLegacyCandidates(out: string[], key: string) {
  for (const email of LEGACY_LOGIN_CANDIDATES[key] ?? []) pushEmail(out, email);
}

/**
 * Auth emails to try with signInWithPassword, in order.
 * A phone tries `<phone>@radar.digiral.ir` first, then any legacy alias of that phone.
 * An email uses the auth address of every profile whose profiles.email matches, then the typed address.
 * A username uses matching profile hints, then a legacy alias when one exists.
 */
export function loginAuthEmails(identifier: string, profiles: LoginProfileHint[] = []): string[] {
  const clean = normalizeLoginIdentifier(identifier);
  const phone = canonicalPhone(clean);
  if (phone) {
    const out = [syntheticAuthEmail(phone)];
    appendLegacyCandidates(out, phone);
    return out;
  }

  const out: string[] = [];
  if (clean.includes("@")) {
    for (const hint of profiles) {
      if (normalizeLoginIdentifier(hint.email) !== clean) continue;
      pushEmail(out, hint.authEmail || hint.email);
    }
    pushEmail(out, clean);
    return out;
  }

  for (const hint of profiles) {
    if (!hintMatchesUsername(hint, clean)) continue;
    pushEmail(out, hint.authEmail);
    if (!hint.authEmail && /@radar\.(digiral\.ir|local)$/i.test(hint.email)) pushEmail(out, hint.email);
  }
  appendLegacyCandidates(out, clean);
  return out;
}
