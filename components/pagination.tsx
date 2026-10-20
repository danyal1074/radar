import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { formatNumber } from "@/lib/money";
import { buildQuery } from "@/lib/search-params";

export function Pagination({ page, totalPages, sp, basePath }: { page: number; totalPages: number; sp: Record<string, string | string[] | undefined>; basePath: string }) {
  if (totalPages <= 1) return null;
  const cls = "inline-flex min-h-10 items-center gap-1 rounded-lg border border-line-strong bg-surface px-3 text-sm hover:bg-paper";
  const off = "pointer-events-none opacity-40";
  return (
    <nav aria-label="صفحه‌بندی" className="mt-6 flex items-center justify-between">
      <Link href={`${basePath}${buildQuery(sp, { page: page - 1 })}`} className={`${cls} ${page <= 1 ? off : ""}`} aria-disabled={page <= 1}>
        <ChevronRight className="size-4" aria-hidden /> قبلی
      </Link>
      <span className="text-sm text-muted">
        صفحه {formatNumber(page)} از {formatNumber(totalPages)}
      </span>
      <Link href={`${basePath}${buildQuery(sp, { page: page + 1 })}`} className={`${cls} ${page >= totalPages ? off : ""}`} aria-disabled={page >= totalPages}>
        بعدی <ChevronLeft className="size-4" aria-hidden />
      </Link>
    </nav>
  );
}
