/** Normalise Persian text for matching: unify Arabic/Persian letters and digits, drop ZWNJ/spaces. */
export function normalizeFa(input: string | null | undefined): string {
  if (!input) return "";
  return input
    .replace(/[ي]/g, "ی")
    .replace(/[ك]/g, "ک")
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[‌‏‎\s\-_]+/g, "")
    .toLowerCase();
}

export function fuzzyIncludes(haystack: string | null | undefined, needle: string | null | undefined): boolean {
  const n = normalizeFa(needle);
  if (!n) return true;
  return normalizeFa(haystack).includes(n);
}
