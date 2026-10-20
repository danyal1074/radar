import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Coins, Factory, History, ShieldAlert, Sparkles } from "lucide-react";
import { Card, PageHeader } from "@/components/ui";
import { requireContext } from "@/lib/auth";
import { formatDateTime } from "@/lib/dates";
import { formatNumber } from "@/lib/money";
import { getDailyCarPrices } from "@/lib/daily-prices/service";
import { AdminPriceTable } from "@/components/admin-price-table";

export const metadata: Metadata = { title: "لیست قیمت روز خودروها | پنل مدیریت" };
export const dynamic = "force-dynamic";

export default async function AdminPricesPage() {
  await requireContext({ admin: true });
  const prices = await getDailyCarPrices();

  const total = prices.length;
  const ikco = prices.filter((p) => p.brand === "ایران خودرو").length;
  const saipa = prices.filter((p) => p.brand === "سایپا").length;
  const discontinued = prices.filter((p) => p.isDiscontinued).length;
  const lastUpdated = prices.length > 0 ? prices[0].updatedAt : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <PageHeader
          title="لیست و مرجع قیمت روز خودروها"
          description="بروزرسانی روزانه قیمت محصولات ایران خودرو، سایپا، پراید، پارس، ۲۰۶ و... از معتبرترین مراجع بازار با قابلیت تغییر دستی"
        />
        <Link
          href="/admin"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-muted hover:text-brand-700 bg-surface px-3 py-2 rounded-xl border border-line"
        >
          <ArrowRight className="size-3.5" />
          <span>بازگشت به پنل مدیریت</span>
        </Link>
      </div>

      {/* کارت‌های خلاصه وضعیت */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card className="p-4 flex items-center gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700">
            <Coins className="size-5" />
          </span>
          <div>
            <p className="text-xs text-muted">کل خودروهای رصدشده</p>
            <p className="text-xl font-black text-ink">{formatNumber(total)} خودرو</p>
          </div>
        </Card>

        <Card className="p-4 flex items-center gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-700">
            <Factory className="size-5" />
          </span>
          <div>
            <p className="text-xs text-muted">ایران خودرو</p>
            <p className="text-xl font-black text-blue-800">{formatNumber(ikco)} مدل</p>
          </div>
        </Card>

        <Card className="p-4 flex items-center gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-amber-50 text-amber-700">
            <Factory className="size-5" />
          </span>
          <div>
            <p className="text-xs text-muted">سایپا و پارس خودرو</p>
            <p className="text-xl font-black text-amber-800">{formatNumber(saipa)} مدل</p>
          </div>
        </Card>

        <Card className="p-4 flex items-center gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-purple-50 text-purple-700">
            <History className="size-5" />
          </span>
          <div>
            <p className="text-xs text-muted">توقف تولید (پارس، پراید و...)</p>
            <p className="text-xl font-black text-purple-800">{formatNumber(discontinued)} مدل</p>
          </div>
        </Card>
      </div>

      {/* جدول قیمت‌ها و جستجو */}
      <AdminPriceTable initialPrices={prices} />
    </div>
  );
}
