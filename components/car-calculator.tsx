"use client";

import { useMemo, useState, useEffect } from "react";
import {
  BadgePercent,
  Calculator,
  CheckCircle2,
  Coins,
  DollarSign,
  HelpCircle,
  RotateCcw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { Card } from "./ui";
import type { DailyCarPrice } from "@/lib/daily-prices/types";

const PAINT_CONDITIONS = [
  { id: "none", label: "بی‌رنگ و شاسی پلمپ (درجه یک)", factor: 1.0 },
  { id: "one", label: "یک لکه رنگ جزئی (گلگیر یا در)", factor: 0.95 },
  { id: "two_three", label: "دو الی سه لکه رنگ", factor: 0.90 },
  { id: "around", label: "دور رنگ (شاسی سالم)", factor: 0.82 },
  { id: "chassis", label: "شاسی ضربه یا سرشاسی خوردگی", factor: 0.78 },
  { id: "full", label: "تمام رنگ یا تعویض اتاق", factor: 0.68 },
];

interface ModelGroup {
  name: string;
  brand: string;
  years: number[];
  pricesByYear: Record<number, number>;
  source: string;
}

export function CarCalculator({ dailyPrices = [] }: { dailyPrices?: DailyCarPrice[] }) {
  // 1. Group all dailyPrices by car model
  const modelGroups = useMemo<ModelGroup[]>(() => {
    if (!dailyPrices || dailyPrices.length === 0) return [];

    const map = new Map<string, ModelGroup>();

    for (const item of dailyPrices) {
      const name = item.name.trim();
      const numMatch = item.year.match(/\d{4}/);
      const year = numMatch ? parseInt(numMatch[0], 10) : 1398;

      if (!map.has(name)) {
        map.set(name, {
          name,
          brand: item.brand,
          years: [],
          pricesByYear: {},
          source: item.source,
        });
      }

      const g = map.get(name)!;
      if (!g.years.includes(year)) {
        g.years.push(year);
      }
      g.pricesByYear[year] = item.priceToman;
    }

    // Sort years descending for each model
    for (const g of map.values()) {
      g.years.sort((a, b) => b - a);
    }

    // Sort models by brand and name
    return Array.from(map.values()).sort((a, b) => {
      if (a.brand !== b.brand) return a.brand.localeCompare(b.brand, "fa");
      return a.name.localeCompare(b.name, "fa");
    });
  }, [dailyPrices]);

  // Brands list
  const brands = useMemo(() => {
    const set = new Set<string>();
    for (const m of modelGroups) {
      if (m.brand) set.add(m.brand);
    }
    return ["همه برندها", ...Array.from(set)];
  }, [modelGroups]);

  // Form states
  const [selectedBrand, setSelectedBrand] = useState("همه برندها");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedModelName, setSelectedModelName] = useState<string>("پراید 132 SE");
  const [year, setYear] = useState<number>(1398);
  const [mileageKm, setMileageKm] = useState<number>(75000);
  const [paintId, setPaintId] = useState("none");
  const [buyingPriceMillion, setBuyingPriceMillion] = useState<number>(850);

  // Filtered models for selector
  const filteredModels = useMemo(() => {
    return modelGroups.filter((m) => {
      if (selectedBrand !== "همه برندها" && m.brand !== selectedBrand) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        return m.name.toLowerCase().includes(q) || m.brand.toLowerCase().includes(q);
      }
      return true;
    });
  }, [modelGroups, selectedBrand, searchQuery]);

  // Selected group
  const activeGroup = useMemo(() => {
    return (
      modelGroups.find((m) => m.name === selectedModelName) ||
      modelGroups.find((m) => m.name.includes("132")) ||
      modelGroups[0] || {
        name: "پراید 132 SE",
        brand: "سایپا",
        years: [1398, 1397, 1396, 1395, 1394, 1393, 1392],
        pricesByYear: {
          1398: 980_000_000,
          1397: 946_666_667,
          1396: 913_333_333,
          1395: 880_000_000,
          1394: 846_666_667,
          1393: 813_333_333,
          1392: 780_000_000,
        },
        source: "baravard.com",
      }
    );
  }, [modelGroups, selectedModelName]);

  // Keep year in sync when model changes
  useEffect(() => {
    if (activeGroup && activeGroup.years.length > 0) {
      if (!activeGroup.years.includes(year)) {
        setYear(activeGroup.years[0]);
      }
    }
  }, [activeGroup, year]);

  // Calculate liveBasePrice directly from Baravard
  const liveBasePrice = useMemo(() => {
    if (activeGroup.pricesByYear[year]) {
      return activeGroup.pricesByYear[year];
    }
    // Interpolate or pick nearest
    const available = activeGroup.years;
    if (available.length > 0) {
      const nearest = available.reduce((prev, curr) =>
        Math.abs(curr - year) < Math.abs(prev - year) ? curr : prev
      );
      return activeGroup.pricesByYear[nearest] || 550_000_000;
    }
    return 550_000_000;
  }, [activeGroup, year]);

  // Automatically update buying price hint when base price changes drastically
  useEffect(() => {
    const suggestedBuying = Math.round((liveBasePrice * 0.9) / 1_000_000);
    if (suggestedBuying > 0 && Math.abs(buyingPriceMillion - suggestedBuying) > 200) {
      setBuyingPriceMillion(suggestedBuying);
    }
  }, [liveBasePrice]);

  const paintCondition =
    PAINT_CONDITIONS.find((p) => p.id === paintId) || PAINT_CONDITIONS[0];

  // 2. محاسبه افت کارکرد و کارشناسی وضعیت بدنه
  const calculation = useMemo(() => {
    // استاندارد کارکرد: سالانه ۲۰ هزار کیلومتر
    const age = Math.max(0, 1404 - year);
    const expectedKm = Math.max(10000, age * 20000);
    const diffKm = mileageKm - expectedKm;

    // هر ۱۰ هزار تا بیشتر/کمتر: حدود ۰.۷ درصد قیمت پایه
    const kmRatio = Math.max(-0.08, Math.min(0.12, (diffKm / 10000) * 0.007));
    const priceAfterMileage = Math.round(liveBasePrice * (1 - kmRatio));

    // اعمال ضریب رنگ و بدنه
    const fairMarketPrice = Math.round(priceAfterMileage * paintCondition.factor);

    // بررسی معامله پیشنهادی
    const buyingPriceToman = buyingPriceMillion * 1_000_000;
    const grossProfit = fairMarketPrice - buyingPriceToman;
    const profitPercent =
      buyingPriceToman > 0 ? Math.round((grossProfit / buyingPriceToman) * 100) : 0;

    // کسر خواب پول و آماده‌سازی (۲ درصد)
    const prepCost = Math.round(buyingPriceToman * 0.02);
    const netProfit = grossProfit - prepCost;

    let dealGrade: { label: string; tone: "good" | "warn" | "bad"; desc: string } = {
      label: "معامله منصفانه (عرف بازار)",
      tone: "warn",
      desc: "قیمت پیشنهادی نزدیک به نرخ روز بازار است و سود متعارف حاصل می‌شود.",
    };

    if (profitPercent >= 8 && netProfit >= 25_000_000) {
      dealGrade = {
        label: "🔥 شکار عالی (زیر قیمت بازار و سود بالا)",
        tone: "good",
        desc: "این خودرو به شدت زیر قیمت کارشناسی برآورد است و ارزش خرید فوری دارد!",
      };
    } else if (profitPercent <= -5) {
      dealGrade = {
        label: "⚠️ قیمت بالاتر از عرف بازار (پرریسک)",
        tone: "bad",
        desc: "فروشنده قیمت بالایی پیشنهاد داده است؛ معامله با این قیمت سودآور نیست.",
      };
    }

    return {
      fairMarketPrice,
      buyingPriceToman,
      netProfit,
      profitPercent,
      dealGrade,
    };
  }, [liveBasePrice, paintCondition, year, mileageKm, buyingPriceMillion]);

  return (
    <Card className="p-6 overflow-hidden border-brand-200 bg-surface shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-line pb-4">
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-xl bg-brand-600 text-white shadow-sm">
            <Calculator className="size-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-ink">ماشین‌حساب هوشمند سود و کارشناسی خودرو</h2>
            <p className="text-xs text-muted">
              محاسبه قیمت کارشناسی منصفانه بر مبنای نرخ‌های رسمی baravard.com و تخمین حاشیه سود خالص
            </p>
          </div>
        </div>

        {/* برچسب اتصال به قیمت‌های زنده روز */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold">
          <CheckCircle2 className="size-3.5 text-emerald-600" />
          <span>متصل به جدول نرخ‌های روز برآورد ({dailyPrices.length} رکورد)</span>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* ستون ورودی‌ها */}
        <div className="space-y-4 lg:col-span-7">
          {/* فیلتر و جستجوی خودرو */}
          <div className="space-y-2 rounded-xl border border-line bg-paper/50 p-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-ink">انتخاب خودرو از پایگاه قیمت‌های روز بازار</label>
              <span className="text-[11px] text-muted font-medium">
                سازنده: <strong className="text-brand-800">{activeGroup.brand}</strong>
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <select
                value={selectedBrand}
                onChange={(e) => setSelectedBrand(e.target.value)}
                className="w-full rounded-lg border border-line bg-surface px-2.5 py-1.5 text-xs font-medium focus:border-brand-500 focus:outline-none"
              >
                {brands.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>

              <div className="relative">
                <Search className="absolute right-2.5 top-2 size-3.5 text-muted pointer-events-none" />
                <input
                  type="text"
                  placeholder="جستجوی مدل (مثلاً 132، پارس، 206)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-lg border border-line bg-surface pr-8 pl-2 py-1.5 text-xs text-ink focus:border-brand-500 focus:outline-none"
                />
              </div>
            </div>

            {/* لیست مدل‌ها */}
            <div>
              <select
                value={activeGroup.name}
                onChange={(e) => setSelectedModelName(e.target.value)}
                className="w-full rounded-xl border border-brand-300 bg-surface px-3 py-2 text-sm font-bold text-ink focus:border-brand-600 focus:outline-none"
              >
                {filteredModels.map((m) => (
                  <option key={m.name} value={m.name}>
                    {m.name} ({m.brand}) — بازه سال: {m.years[m.years.length - 1]} تا {m.years[0]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* سال ساخت و کارکرد */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-ink">سال ساخت</label>
                <span className="text-[10px] text-muted">
                  بازه تولید: {activeGroup.years[activeGroup.years.length - 1]} تا {activeGroup.years[0]}
                </span>
              </div>
              <select
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                className="w-full rounded-xl border border-line bg-paper px-3 py-2 text-sm font-bold text-ink focus:border-brand-500 focus:outline-none"
              >
                {activeGroup.years.map((y) => (
                  <option key={y} value={y}>
                    مدل {y}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink mb-1.5">کارکرد (کیلومتر)</label>
              <input
                type="number"
                value={mileageKm}
                step={5000}
                onChange={(e) => setMileageKm(Math.max(0, Number(e.target.value)))}
                className="w-full rounded-xl border border-line bg-paper px-3 py-2 text-sm focus:border-brand-500 focus:outline-none ltr-num"
                placeholder="مثلاً ۶۰,۰۰۰"
              />
            </div>
          </div>

          {/* نوار نمایش قیمت استعلام‌شده روز از برآورد */}
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3.5 flex items-center justify-between text-xs shadow-sm">
            <div className="flex items-center gap-2.5">
              <div className="size-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold">
                🎯
              </div>
              <div>
                <span className="font-bold text-emerald-950 block">
                  قیمت روز بازار {activeGroup.name} (مدل {year}):
                </span>
                <span className="text-[11px] text-emerald-800 font-medium">
                  مرجع کارشناسی: <strong>baravard.com</strong> (استعلام زنده برآورد)
                </span>
              </div>
            </div>
            <div className="text-base font-black text-emerald-900 ltr-num">
              {new Intl.NumberFormat("fa-IR").format(liveBasePrice)} تومان
            </div>
          </div>

          {/* وضعیت بدنه و رنگ */}
          <div>
            <label className="block text-xs font-semibold text-ink mb-1.5">وضعیت رنگ و بدنه</label>
            <select
              value={paintId}
              onChange={(e) => setPaintId(e.target.value)}
              className="w-full rounded-xl border border-line bg-paper px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
            >
              {PAINT_CONDITIONS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>

          {/* قیمت پیشنهادی خرید */}
          <div>
            <label className="block text-xs font-semibold text-ink mb-1.5">
              قیمت پیشنهادی خرید فروشنده (میلیون تومان)
            </label>
            <div className="relative">
              <input
                type="number"
                value={buyingPriceMillion}
                step={5}
                onChange={(e) => setBuyingPriceMillion(Number(e.target.value))}
                className="w-full rounded-xl border border-brand-300 bg-brand-50/20 px-3 py-2.5 text-base font-bold text-brand-900 focus:border-brand-600 focus:outline-none ltr-num"
                placeholder="مثلاً ۵۳۰"
              />
              <span className="absolute left-3 top-3 text-xs text-muted">میلیون تومان</span>
            </div>
          </div>
        </div>

        {/* ستون نتایج و تحلیل */}
        <div className="flex flex-col justify-between rounded-2xl border border-line bg-paper/70 p-5 lg:col-span-5">
          <div className="space-y-4">
            <div>
              <span className="text-xs text-muted font-medium">قیمت کارشناسی منصفانه بازار:</span>
              <div className="mt-1 flex items-baseline gap-1">
                <span className="text-3xl font-black tracking-tight text-ink">
                  {new Intl.NumberFormat("fa-IR").format(calculation.fairMarketPrice)}
                </span>
                <span className="text-xs font-medium text-muted">تومان</span>
              </div>
              <span className="text-[11px] text-emerald-700 font-semibold mt-1 block">
                مبنا: نرخ رسمی baravard.com با احتساب ضریب رنگ ({paintCondition.factor * 100}٪) و کیلومتر
              </span>
            </div>

            <div className="rounded-xl border border-line bg-surface p-3.5 space-y-2.5 text-xs">
              <div className="flex justify-between items-center text-muted">
                <span>قیمت خرید شما:</span>
                <span className="font-semibold text-ink">
                  {new Intl.NumberFormat("fa-IR").format(calculation.buyingPriceToman)} تومان
                </span>
              </div>

              <div className="flex justify-between items-center text-muted">
                <span>پیش‌بینی سود خالص:</span>
                <span
                  className={`font-black ${calculation.netProfit >= 0 ? "text-emerald-600" : "text-rose-600"}`}
                >
                  {calculation.netProfit >= 0 ? "+" : ""}
                  {new Intl.NumberFormat("fa-IR").format(calculation.netProfit)} تومان
                </span>
              </div>

              <div className="flex justify-between items-center text-muted">
                <span>درصد بازده سرمایه:</span>
                <span
                  className={`font-black ${calculation.profitPercent >= 0 ? "text-emerald-600" : "text-rose-600"}`}
                >
                  {calculation.profitPercent}%
                </span>
              </div>
            </div>

            <div
              className={`rounded-xl p-3.5 text-xs border ${
                calculation.dealGrade.tone === "good"
                  ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                  : calculation.dealGrade.tone === "warn"
                  ? "bg-amber-50 text-amber-800 border-amber-200"
                  : "bg-rose-50 text-rose-800 border-rose-200"
              }`}
            >
              <div className="font-bold flex items-center gap-1.5 mb-1">
                {calculation.dealGrade.tone === "good" ? <Sparkles className="size-4" /> : null}
                {calculation.dealGrade.label}
              </div>
              <p className="leading-relaxed">{calculation.dealGrade.desc}</p>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-line text-[11px] text-muted flex items-center gap-1">
            <HelpCircle className="size-3.5 shrink-0" />
            <span>
              قیمت منصفانه بر اساس استعلام زنده برآورد برای {activeGroup.name} با کسر افت رنگ و کارکرد محاسبه شده است.
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
}
