/**
 * تمام شهرهای استان خراسان رضوی با نام فارسی و اسلاگ استاندارد دیوار و شیپور
 */
export interface KhorasanCity {
  slug: string;
  nameFa: string;
  popular?: boolean;
}

export const KHORASAN_RAZAVI_CITIES: KhorasanCity[] = [
  { slug: "mashhad", nameFa: "مشهد", popular: true },
  { slug: "torbat-heydariyeh", nameFa: "تربت حیدریه", popular: true },
  { slug: "neyshabur", nameFa: "نیشابور", popular: true },
  { slug: "sabzevar", nameFa: "سبزوار", popular: true },
  { slug: "kashmar", nameFa: "کاشمر", popular: true },
  { slug: "quchan", nameFa: "قوچان", popular: true },
  { slug: "torbat-jam", nameFa: "تربت جام", popular: true },
  { slug: "chenaran", nameFa: "چناران", popular: true },
  { slug: "taybad", nameFa: "تایباد" },
  { slug: "gonabad", nameFa: "گناباد" },
  { slug: "sarakhs", nameFa: "سرخس" },
  { slug: "fariman", nameFa: "فریمان" },
  { slug: "khaf", nameFa: "خواف" },
  { slug: "dargaz", nameFa: "درگز" },
  { slug: "bardaskan", nameFa: "بردسکن" },
  { slug: "golbahar", nameFa: "گلبهار", popular: true },
  { slug: "kalat", nameFa: "کلات" },
  { slug: "rashtkhar", nameFa: "رشتخوار" },
  { slug: "feyzabad", nameFa: "مه‌ولات (فیض‌آباد)" },
  { slug: "khalilabad", nameFa: "خلیل‌آباد" },
  { slug: "bajestan", nameFa: "بجستان" },
  { slug: "bakharz", nameFa: "باخرز" },
  { slug: "jowayin", nameFa: "جوین" },
  { slug: "joghtai", nameFa: "جغتای" },
  { slug: "firuzeh", nameFa: "فیروزه" },
];

export const POPULAR_CITIES = KHORASAN_RAZAVI_CITIES.filter((c) => c.popular);

export function getCityBySlug(slug: string): KhorasanCity | undefined {
  return KHORASAN_RAZAVI_CITIES.find(
    (c) => c.slug.toLowerCase() === slug.toLowerCase(),
  );
}

export function getCityByNameFa(name: string): KhorasanCity | undefined {
  if (!name) return undefined;
  return KHORASAN_RAZAVI_CITIES.find(
    (c) => name.includes(c.nameFa) || c.nameFa.includes(name),
  );
}

export function normalizeCityNameFa(input?: string | null): string {
  if (!input) return "کل خراسان رضوی";
  const found = getCityByNameFa(input);
  if (found) return found.nameFa;
  const bySlug = getCityBySlug(input);
  if (bySlug) return bySlug.nameFa;
  return input;
}
