import type { Metadata } from "next";
import { ImportForm } from "@/components/import-form";
import { Badge, Button, Card, PageHeader } from "@/components/ui";
import { adminStore, requireContext } from "@/lib/auth";
import { dataMode } from "@/lib/db";
import { formatDate, formatDateTime } from "@/lib/dates";
import { formatNumber, formatToman } from "@/lib/money";
import { PLANS, resolveAccess } from "@/lib/plans";
import { deleteSampleListingsAction } from "@/app/actions";
import { cancelSubscriptionAction, changePlanAction, grantAccessAction, reviewPaymentAction, runPipelineAction, refreshCarPricesAction } from "./actions";

export const metadata: Metadata = { title: "پنل مدیریت" };
export const dynamic = "force-dynamic";

const daysAgo = (d: number) => new Date(Date.now() - d * 86_400_000);

export default async function AdminPage() {
  await requireContext({ admin: true });
  const store = await adminStore();
  const [stats, users, pending, allPayments, jobs, usage] = await Promise.all([
    store.platformStats(),
    store.listUsers(),
    store.listPayments({ status: "pending" }),
    store.listPayments({}),
    store.recentJobs(8),
    store.usageSince(daysAgo(30)),
  ]);
  const byId = new Map(users.map((u) => [u.profile.id, u.profile]));
  const requests = usage.filter((u) => u.kind === "estimate_request").length;
  const cost = usage.reduce((s, u) => s + u.cost_toman, 0);

  const confirmedPayments = allPayments.filter((p) => p.status === "confirmed");
  const totalRevenue = confirmedPayments.reduce((s, p) => s + p.amount_toman, 0);

  const tiles: [string, string][] = [
    ["کاربران کل", formatNumber(stats.users)],
    ["اشتراک فعال", formatNumber(stats.activeSubscriptions)],
    ["آزمایشی", formatNumber(stats.trialing)],
    ["پرداخت در انتظار", formatNumber(stats.pendingPayments)],
    ["درآمد تأییدشده", formatToman(totalRevenue)],
  ];

  return (
    <>
      <PageHeader title="پنل مدیریت" description="کاربران، پرداخت‌ها، پردازش‌ها و هزینهٔ API تخمین قیمت" />
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {tiles.map(([k, v]) => (
            <Card key={k} className="p-4">
              <p className="text-xs text-muted">{k}</p>
              <p className="text-xl font-bold">{v}</p>
            </Card>
          ))}
        </div>

        {/* بخش ویژه قیمت روز خودروها */}
        <Card className="p-5 border-2 border-brand-200 bg-gradient-to-r from-brand-50/50 via-surface to-paper">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-lg font-black text-ink">📊 مرجع قیمت روز خودروهای ایرانی</span>
                <Badge tone="good">بروزرسانی روزانه فعال</Badge>
              </div>
              <p className="text-xs text-muted leading-relaxed max-w-2xl">
                قیمت‌های زنده محصولات ایران خودرو، سایپا، خودروهای صفر و مدل‌های توقف تولید (پراید، پارس، ۴۰۵، ۲۰۶ و...) هر روز از مراجع معتبر بازار استخراج شده و مبنای محاسبه کارشناسی تمام فرصت‌های خرید قرار می‌گیرد.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <form action={refreshCarPricesAction}>
                <Button type="submit" variant="secondary" className="min-h-9 text-xs font-bold gap-1.5 border border-brand-300">
                  🔄 بروزرسانی فوری قیمت‌ها از baravard.com
                </Button>
              </form>
              <a
                href="/admin/prices"
                className="inline-flex items-center gap-2 rounded-xl bg-brand-600 hover:bg-brand-700 px-4 py-2 text-xs font-bold text-white shadow-sm transition-all shrink-0"
              >
                <span>مشاهده و ویرایش جدول قیمت‌ها (۳,۹۳۹ خودرو)</span>
                <span>←</span>
              </a>
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="mb-3 font-semibold">پرداخت‌های در انتظار تأیید</h2>
          {pending.length === 0 ? (
            <p className="text-sm text-muted">پرداخت در انتظاری وجود ندارد.</p>
          ) : (
            <ul className="divide-y divide-line text-sm">
              {pending.map((p) => (
                <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <span>
                    <strong>{byId.get(p.user_id)?.business_name ?? "—"}</strong> — {PLANS[p.plan].name}، {formatNumber(p.months)} ماهه، {formatToman(p.amount_toman)}
                    <span className="block text-xs text-muted">
                      ۴ رقم کارت / پیگیری: <span className="ltr-num font-bold text-ink">{p.reference}</span> • تاریخ ثبت: {formatDateTime(p.created_at)}
                      {p.note && ` • توضیح: ${p.note}`}
                    </span>
                  </span>
                  <form action={reviewPaymentAction} className="flex gap-2">
                    <input type="hidden" name="id" value={p.id} />
                    <Button name="decision" value="confirm" className="min-h-9">تأیید</Button>
                    <Button name="decision" value="reject" variant="danger" className="min-h-9">رد</Button>
                  </form>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-3 text-xs text-muted">پیش از تأیید، واریز را در حساب بانکی خود بررسی کنید.</p>
        </Card>

        <Card className="p-5">
          <h2 className="mb-3 font-semibold">مدیریت کاربران و نمایشگاه‌ها</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-start text-xs text-muted">
                <tr>
                  <th className="py-2 text-start">نمایشگاه و ایمیل</th>
                  <th className="text-start">شهر</th>
                  <th className="text-start">پلن فعلی</th>
                  <th className="text-start">انقضا</th>
                  <th className="text-start">تغییر پلن</th>
                  <th className="text-start">تمدید / لغو</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {users.map(({ profile, subscription }) => {
                  const a = resolveAccess(subscription);
                  return (
                    <tr key={profile.id}>
                      <td className="py-2.5">
                        <span className="font-medium">{profile.business_name || profile.full_name || "بدون نام"}</span>
                        <span className="block text-xs text-muted">{profile.email}</span>
                      </td>
                      <td>{profile.city || "—"}</td>
                      <td>
                        <Badge tone={a.hasAccess ? "good" : "bad"}>
                          {PLANS[a.plan].name}{a.hasAccess ? "" : " (پایان‌یافته)"}
                        </Badge>
                      </td>
                      <td>{formatDate(a.endsAt)}</td>
                      <td>
                        <form action={changePlanAction} className="flex items-center gap-1">
                          <input type="hidden" name="userId" value={profile.id} />
                          <select name="plan" defaultValue={a.plan} className="rounded-lg border border-line-strong bg-surface px-2 py-1 text-xs">
                            <option value="trial">آزمایشی</option>
                            <option value="basic">پایه</option>
                            <option value="pro">حرفه‌ای</option>
                            <option value="business">سازمانی</option>
                          </select>
                          <Button variant="secondary" className="min-h-8 px-2 text-xs">ثبت</Button>
                        </form>
                      </td>
                      <td>
                        <div className="flex gap-1.5">
                          <form action={grantAccessAction} className="flex gap-1">
                            <input type="hidden" name="userId" value={profile.id} />
                            <input type="number" name="days" defaultValue={14} min={1} max={365} aria-label="تعداد روز" className="w-14 rounded-lg border border-line-strong px-2 text-xs" />
                            <Button variant="secondary" className="min-h-8 px-2 text-xs">+ روز</Button>
                          </form>
                          <form action={cancelSubscriptionAction}>
                            <input type="hidden" name="userId" value={profile.id} />
                            <Button variant="danger" className="min-h-8 px-2 text-xs">لغو</Button>
                          </form>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>

        {confirmedPayments.length > 0 && (
          <Card className="p-5">
            <h2 className="mb-3 font-semibold">تاریخچه پرداخت‌های تأییدشده</h2>
            <ul className="divide-y divide-line text-sm">
              {confirmedPayments.slice(0, 10).map((p) => (
                <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 py-2.5">
                  <span>
                    <strong>{byId.get(p.user_id)?.business_name ?? byId.get(p.user_id)?.email ?? "کاربر"}</strong> — {PLANS[p.plan].name} ({formatNumber(p.months)} ماهه)
                    <span className="block text-xs text-muted">
                      مبلغ: {formatToman(p.amount_toman)} • پیگیری: <span className="ltr-num">{p.reference}</span> • تاریخ: {formatDateTime(p.created_at)}
                    </span>
                  </span>
                  <Badge tone="good">تأییدشده</Badge>
                </li>
              ))}
            </ul>
          </Card>
        )}

        <Card className="p-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-semibold">پردازش‌ها و منابع داده</h2>
            <div className="flex flex-wrap gap-2">
              <form action={runPipelineAction}><Button variant="secondary">⚡ اجرای پایش و شکار آگهی‌ها از دیوار</Button></form>
              <form action={deleteSampleListingsAction}><Button variant="danger">🗑 حذف تمام آگهی‌های نمونه</Button></form>
            </div>
          </div>
          <ul className="mb-3 space-y-1 text-sm text-muted">
            <li>حالت داده: <strong className="text-ink">{dataMode() === "supabase" ? "Supabase (پایگاه‌داده آنلاین)" : "توسعه (فایل محلی)"}</strong></li>
            <li>منبع آگهی فعال: <strong className="text-ink">سایت دیوار (پایش لحظه‌ای زنده)</strong></li>
            <li>سرویس تخمین قیمت: <strong className="text-ink">مرجع کارشناسی قیمت‌گذاری روز بازار</strong></li>
            <li>۳۰ روز اخیر: {formatNumber(requests)} درخواست تخمین، هزینهٔ تقریبی {formatToman(cost)}</li>
          </ul>
          {jobs.length > 0 && (
            <ul className="divide-y divide-line text-sm">
              {jobs.map((j) => (
                <li key={j.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                  <span>{j.job_type} <span className="text-xs text-muted">{formatDateTime(j.started_at)}</span>{j.error_message && <span className="block text-xs text-bad-600">{j.error_message}</span>}</span>
                  <Badge tone={j.status === "success" ? "good" : j.status === "failed" ? "bad" : "warn"}>{j.status === "success" ? "موفق" : j.status === "failed" ? "ناموفق" : "در حال اجرا"}</Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="p-5">
          <h2 className="mb-1 font-semibold">ورود آگهی از JSON</h2>
          <p className="mb-3 text-sm text-muted">تا زمانی که دسترسی مجاز به دیوار/شیپور ندارید، آگهی‌ها را دستی وارد کنید. فقط پیوند https دیوار و شیپور پذیرفته می‌شود.</p>
          <ImportForm />
        </Card>
      </div>
    </>
  );
}
