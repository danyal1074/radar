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

/**
 * نمایش کاملاً خوانا به حروف فارسی بدون نیاز به شمارش صفرها:
 * مثال‌ها:
 * ۵۸۰_۰۰۰_۰۰۰ -> «۵۸۰ میلیون تومان»
 * ۱_۴۵۰_۰۰۰_۰۰۰ -> «۱ میلیارد و ۴۵۰ میلیون تومان»
 * ۲_۰۰۰_۰۰۰_۰۰۰ -> «۲ میلیارد تومان»
 * ۴۵۰_۵۰۰_۰۰۰ -> «۴۵۰ میلیون و ۵۰۰ هزار تومان»
 * ۶۵_۰۰۰_۰۰۰ -> «۶۵ میلیون تومان»
 */
export function formatTomanReadable(toman: number | null | undefined): string {
  if (toman === null || toman === undefined || !Number.isFinite(toman)) return "—";
  if (toman === 0) return "۰ تومان";

  const isNeg = toman < 0;
  let abs = Math.abs(Math.round(toman));

  const billions = Math.floor(abs / 1_000_000_000);
  abs %= 1_000_000_000;
  const millions = Math.floor(abs / 1_000_000);
  abs %= 1_000_000;
  const thousands = Math.floor(abs / 1_000);

  const parts: string[] = [];
  if (billions > 0) {
    parts.push(`${faNumber.format(billions)} میلیارد`);
  }
  if (millions > 0) {
    parts.push(`${faNumber.format(millions)} میلیون`);
  }
  if (thousands > 0 && (billions === 0 || millions === 0)) {
    parts.push(`${faNumber.format(thousands)} هزار`);
  }

  if (parts.length === 0) {
    return `${faNumber.format(toman)} تومان`;
  }

  const res = parts.join(" و ") + " تومان";
  return isNeg ? `منفی ${res}` : res;
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
