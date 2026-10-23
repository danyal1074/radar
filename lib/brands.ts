import { fuzzyIncludes, normalizeFa } from "./text";

/**
 * Manufacturer labels the bots and the panel store, and the model names Divar
 * listings actually use as `make` (model-as-make). A rule for the manufacturer
 * matches any model in its family. A rule for one model does not match siblings.
 */
const BRAND_FAMILIES: { label: string; models: string[] }[] = [
  {
    label: "سایپا",
    models: ["پراید", "تیبا", "ساینا", "کوییک", "کوئیک", "شاهین", "اطلس", "سهند"],
  },
  {
    label: "ایران خودرو",
    models: ["پژو", "سمند", "سورن", "دنا", "تارا", "رانا", "هایما", "آریسان", "پیکان", "پارس"],
  },
  {
    label: "مدیران خودرو",
    models: ["ام وی ام", "ام‌وی‌ام", "فونیکس", "چری"],
  },
  {
    label: "کرمان موتور",
    models: ["جک", "کی ام سی"],
  },
  {
    label: "بهمن",
    models: ["دیگنیتی", "فیدلیتی", "کاپرا"],
  },
];

function sameLabel(a: string, b: string): boolean {
  const left = normalizeFa(a);
  const right = normalizeFa(b);
  return Boolean(left) && left === right;
}

/** Models that should satisfy a manufacturer make. Empty when `make` is already a model. */
export function brandModelAliases(make: string | null | undefined): string[] {
  if (!make) return [];
  const family = BRAND_FAMILIES.find((f) => sameLabel(f.label, make));
  return family ? family.models : [];
}

export function makeMatchesListing(
  ruleMake: string | null | undefined,
  listing: { make: string; model?: string | null; title: string },
): boolean {
  if (!ruleMake) return true;
  const hay = `${listing.make} ${listing.model ?? ""} ${listing.title}`;
  if (fuzzyIncludes(hay, ruleMake)) return true;
  return brandModelAliases(ruleMake).some((alias) => fuzzyIncludes(hay, alias));
}
