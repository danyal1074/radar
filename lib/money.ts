// Money convention
// ----------------
// The database and every domain function store prices as INTEGER TOMAN.
// Iranian sources frequently quote RIAL (1 toman = 10 rial). Conversion is
// explicit and lives only here so it can be tested in one place.

export const RIAL_PER_TOMAN = 10;

export function rialToToman(rial: number): number {
  if (!Number.isFinite(rial) || rial < 0) {
    throw new RangeError("مبلغ ریالی نامعتبر است");
  }
  return Math.round(rial / RIAL_PER_TOMAN);
}

export function tomanToRial(toman: number): number {
  if (!Number.isFinite(toman) || toman < 0) {
    throw new RangeError("مبلغ تومانی نامعتبر است");
  }
  return Math.round(toman * RIAL_PER_TOMAN);
}

const faNumber = new Intl.NumberFormat("fa-IR", { maximumFractionDigits: 0 });
const faDecimal = new Intl.NumberFormat("fa-IR", {
  maximumFractionDigits: 1,
  minimumFractionDigits: 0,
});

const faPlain = new Intl.NumberFormat("fa-IR", { useGrouping: false });

/** Jalali year without a thousands separator: ۱۴۰۰ (never ۱٬۴۰۰) */
export function formatYear(n: number): string {
  return faPlain.format(n);
}

/** ۴۰۰٬۰۰۰٬۰۰۰ */
export function formatNumber(n: number): string {
  return faNumber.format(n);
}

/** ۴۰۰٬۰۰۰٬۰۰۰ تومان */
export function formatToman(n: number | null | undefined): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return "—";
  return `${faNumber.format(n)} تومان`;
}

/** Compact: «۴۰۰ میلیون تومان», «۲٫۵ میلیارد تومان» */
export function formatTomanCompact(n: number | null | undefined): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return "—";
  const abs = Math.abs(n);
  if (abs >= 1_000_000_000) return `${faDecimal.format(n / 1_000_000_000)} میلیارد تومان`;
  if (abs >= 1_000_000) return `${faDecimal.format(n / 1_000_000)} میلیون تومان`;
  return formatToman(n);
}

export function formatPercent(n: number | null | undefined): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return "—";
  return `${faDecimal.format(n)}٪`;
}

export function formatKm(n: number | null | undefined): string {
  if (n === null || n === undefined) return "نامشخص";
  return `${faNumber.format(n)} کیلومتر`;
}

/** Persian/Arabic digits -> ASCII digits, strips separators. For form input. */
export function parseLooseNumber(input: string): number | null {
  if (!input) return null;
  const ascii = input
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[,٬،\s]/g, "");
  if (ascii === "" || !/^\d+(\.\d+)?$/.test(ascii)) return null;
  const n = Number(ascii);
  return Number.isFinite(n) ? n : null;
}
