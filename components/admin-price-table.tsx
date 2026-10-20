"use client";

import { useState } from "react";
import clsx from "clsx";
import { Check, Edit2, RotateCw, Search, Sparkles } from "lucide-react";
import { Badge, Button, Card } from "@/components/ui";
import type { DailyCarPrice } from "@/lib/daily-prices/types";
import { updateCarPriceAction, refreshCarPricesAction } from "@/app/(admin)/admin/actions";

export function AdminPriceTable({ initialPrices }: { initialPrices: DailyCarPrice[] }) {
  const [search, setSearch] = useState("");
  const [selectedBrand, setSelectedBrand] = useState<string>("all");
  const [onlyDiscontinued, setOnlyDiscontinued] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPriceMillions, setEditPriceMillions] = useState<number>(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Filter prices
  const filtered = initialPrices.filter((p) => {
    if (onlyDiscontinued && !p.isDiscontinued) return false;
    if (selectedBrand !== "all" && p.brand !== selectedBrand) return false;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      const match =
        p.name.toLowerCase().includes(q) ||
        p.brand.toLowerCase().includes(q) ||
        p.year.toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });

  const brands = ["all", "ایران خودرو", "سایپا", "مدیران خودرو", "کرمان موتور", "سایر"];

  return (
    <div className="space-y-4">
      {/* فیلترها و دکمه‌های کنترل */}
      <Card className="p-4 space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* جعبه جستجو */}
          <div className="relative flex-1">
            <Search className="absolute right-3 top-2.5 size-4 text-muted pointer-events-none" />
            <input
              type="text"
              placeholder="جستجو در نام خودرو (مثلاً پارس، پراید، ۲۰۶، دنا، کوییک)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-line bg-surface pr-9 pl-3 py-2 text-sm text-ink focus:border-brand-500 focus:outline-none"
            />
          </div>

          {/* دکمه بروزرسانی آنلاین */}
          <form
            action={async () => {
              setIsRefreshing(true);
              try {
                await refreshCarPricesAction();
              } finally {
                setIsRefreshing(false);
              }
            }}
          >
            <Button
              type="submit"
              disabled={isRefreshing}
              className="w-full md:w-auto min-h-10 text-xs font-bold gap-2 bg-brand-600 hover:bg-brand-700 text-white shadow-sm"
            >
              <RotateCw className={clsx("size-4", isRefreshing && "animate-spin")} />
              <span>{isRefreshing ? "در حال دریافت قیمت‌ها..." : "🔄 بروزرسانی آنلاین از بازار (baravard.com)"}</span>
            </Button>
          </form>
        </div>

        {/* فیلتر برند و وضعیت تولید */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-line/60">
          <div className="flex flex-wrap gap-1.5 text-xs">
            {brands.map((b) => (
              <button
                key={b}
                type="button"
                onClick={() => setSelectedBrand(b)}
                className={clsx(
                  "px-3 py-1.5 rounded-lg font-semibold transition-colors",
                  selectedBrand === b
                    ? "bg-brand-600 text-white"
                    : "bg-paper text-muted hover:text-ink hover:bg-surface border border-line",
                )}
              >
                {b === "all" ? "همه برندها" : b}
              </button>
            ))}
          </div>

          <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-amber-700 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-200">
            <input
              type="checkbox"
              checked={onlyDiscontinued}
              onChange={(e) => setOnlyDiscontinued(e.target.checked)}
              className="rounded text-brand-600 focus:ring-0"
            />
            <span>فقط خودروهای توقف تولید (پارس، پراید، ۴۰۵ و...)</span>
          </label>
        </div>
      </Card>

      {/* جدول قیمت‌ها */}
      <Card className="overflow-hidden p-0 border border-line shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs md:text-sm">
            <thead className="bg-paper text-ink border-b border-line">
              <tr>
                <th className="p-3.5 font-bold">نام خودرو و تیپ</th>
                <th className="p-3.5 font-bold">برند / سازنده</th>
                <th className="p-3.5 font-bold">سال / وضعیت</th>
                <th className="p-3.5 font-bold">قیمت روز بازار (کارشناسی)</th>
                <th className="p-3.5 font-bold text-center">وضعیت منبع</th>
                <th className="p-3.5 font-bold text-center">عملیات ادمین</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line/60">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-muted">
                    هیچ خودرویی با فیلترهای انتخابی یافت نشد.
                  </td>
                </tr>
              ) : (
                filtered.map((item) => {
                  const isEditing = editingId === item.id;
                  const priceFormatted = new Intl.NumberFormat("fa-IR").format(item.priceToman);
                  const priceInMillions = Math.round(item.priceToman / 1_000_000);

                  return (
                    <tr key={item.id} className="hover:bg-paper/40 transition-colors">
                      {/* نام خودرو */}
                      <td className="p-3.5 font-bold text-ink">
                        <span>{item.name}</span>
                        {item.isEditedByAdmin && (
                          <span className="mr-2 inline-flex items-center text-[10px] bg-purple-50 text-purple-700 border border-purple-200 px-1.5 py-0.5 rounded">
                            ویرایش دستی ادمین
                          </span>
                        )}
                      </td>

                      {/* برند */}
                      <td className="p-3.5 text-muted font-medium">{item.brand}</td>

                      {/* سال / وضعیت */}
                      <td className="p-3.5">
                        <span
                          className={clsx(
                            "inline-block px-2.5 py-0.5 rounded-md text-[11px] font-semibold border",
                            item.isDiscontinued
                              ? "bg-amber-50 text-amber-800 border-amber-200"
                              : "bg-emerald-50 text-emerald-800 border-emerald-200",
                          )}
                        >
                          {item.year}
                        </span>
                      </td>

                      {/* قیمت روز */}
                      <td className="p-3.5">
                        {isEditing ? (
                          <div className="flex items-center gap-1.5">
                            <input
                              type="number"
                              min={10}
                              max={100_000}
                              value={editPriceMillions}
                              onChange={(e) => setEditPriceMillions(Number(e.target.value))}
                              className="w-24 rounded-lg border border-brand-500 px-2 py-1 text-xs font-bold text-ink"
                              autoFocus
                            />
                            <span className="text-[11px] text-muted">میلیون تومان</span>
                          </div>
                        ) : (
                          <div className="flex items-baseline gap-1">
                            <span className="text-base font-black text-brand-800">
                              {priceFormatted}
                            </span>
                            <span className="text-[11px] text-muted">تومان</span>
                          </div>
                        )}
                      </td>

                      {/* منبع */}
                      <td className="p-3.5 text-center">
                        {item.source === "manual" ? (
                          <span className="inline-block px-2 py-0.5 rounded text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                            ✍️ دستی ادمین
                          </span>
                        ) : item.source === "baravard.com" ? (
                          <span className="inline-block px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-50 text-emerald-900 border border-emerald-300">
                            🎯 baravard.com (استعلام زنده برآورد)
                          </span>
                        ) : item.source === "z4car.com" ? (
                          <span className="inline-block px-2 py-0.5 rounded text-[11px] font-bold bg-amber-50 text-amber-900 border border-amber-300">
                            🌐 z4car.com (استعلام زنده)
                          </span>
                        ) : item.source === "bama.ir" ? (
                          <span className="inline-block px-2 py-0.5 rounded text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                            🌐 bama.ir (بازار آزاد)
                          </span>
                        ) : item.source === "iranjib.ir" ? (
                          <span className="inline-block px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                            🌐 iranjib.ir
                          </span>
                        ) : (
                          <span className="inline-block px-2 py-0.5 rounded text-[11px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
                            🌐 car.ir (پایش زنده)
                          </span>
                        )}
                      </td>

                      {/* عملیات */}
                      <td className="p-3.5 text-center">
                        {isEditing ? (
                          <div className="flex items-center justify-center gap-1.5">
                            <form
                              action={async () => {
                                const fd = new FormData();
                                fd.append("id", item.id);
                                fd.append("priceToman", String(editPriceMillions * 1_000_000));
                                await updateCarPriceAction(fd);
                                setEditingId(null);
                              }}
                            >
                              <Button type="submit" className="min-h-7 px-2.5 text-xs font-bold">
                                ذخیره
                              </Button>
                            </form>
                            <Button
                              type="button"
                              variant="secondary"
                              onClick={() => setEditingId(null)}
                              className="min-h-7 px-2 text-xs"
                            >
                              انصراف
                            </Button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingId(item.id);
                              setEditPriceMillions(priceInMillions);
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-brand-700 bg-brand-50 hover:bg-brand-100 border border-brand-200 transition-colors"
                          >
                            <Edit2 className="size-3" />
                            <span>تغییر قیمت</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <p className="text-xs text-muted text-center">
        💡 تمام تخمین‌ها و قیمت‌های کارشناسی در بخش رادار و فرصت‌های خرید بلافاصله بر اساس قیمت‌های فوق محاسبه می‌شوند.
      </p>
    </div>
  );
}
