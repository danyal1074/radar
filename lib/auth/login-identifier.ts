/**
 * Pure login-identifier resolution.
 * Website accounts authenticate with a synthetic address `<phone>@radar.digiral.ir`.
 * A typed inbox address lives on `profiles.email` and must be mapped back to that auth email.
 * No identifier is hard-wired to a particular person.
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

/**
 * Auth emails to try with signInWithPassword, in order.
 * A phone always maps to `<phone>@radar.digiral.ir` and ignores profile hints.
 * An email uses the auth address of every profile whose profiles.email matches, then the typed address.
 * A username matches only the supplied profile hints (local-part, full name, or business name).
 */
export function loginAuthEmails(identifier: string, profiles: LoginProfileHint[] = []): string[] {
  const clean = normalizeLoginIdentifier(identifier);
  const phone = canonicalPhone(clean);
  if (phone) return [syntheticAuthEmail(phone)];

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
  return out;
}
