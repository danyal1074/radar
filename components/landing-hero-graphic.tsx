"use client";

import Image from "next/image";
import { MapPin, TrendingDown, Bell, Sparkles } from "lucide-react";

export function LandingHeroGraphic() {
  return (
    <div className="relative mx-auto flex w-full max-w-lg items-center justify-center py-6 sm:py-10">
      {/* موجهای راداری متحدالمرکز در پس‌زمینه */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none" aria-hidden="true">
        <div className="size-[280px] sm:size-[380px] rounded-full border border-blue-400/20 bg-blue-50/30 animate-pulse" />
        <div className="absolute size-[210px] sm:size-[280px] rounded-full border border-blue-400/30" />
        <div className="absolute size-[140px] sm:size-[190px] rounded-full border border-blue-400/40" />
        <div className="absolute size-[70px] sm:size-[100px] rounded-full border border-blue-500/50 bg-blue-500/5" />
      </div>

      {/* نشانگر موقعیت رادار (Location Pin) */}
      <div className="absolute top-10 sm:top-14 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center">
        <span className="relative flex size-3">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-75"></span>
          <span className="relative inline-flex size-3 rounded-full bg-blue-600"></span>
        </span>
        <div className="mt-1 rounded-full bg-blue-600 p-1.5 text-white shadow-lg shadow-blue-500/40">
          <MapPin className="size-4" />
        </div>
      </div>

      {/* کارت شناور ۱: آگهی جدید (سمت راست بالا) */}
      <div className="absolute top-4 sm:top-6 -right-2 sm:right-0 z-30 flex items-center gap-2.5 rounded-2xl bg-blue-600 px-3.5 py-2.5 text-white shadow-xl shadow-blue-600/30 animate-bounce duration-1000">
        <span className="relative flex size-2.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sky-200 opacity-75"></span>
          <span className="relative inline-flex size-2.5 rounded-full bg-white"></span>
        </span>
        <div className="text-right">
          <div className="flex items-center gap-1">
            <span className="text-[11px] font-black leading-tight">آگهی جدید</span>
            <Sparkles className="size-3 text-amber-300" />
          </div>
          <span className="text-[10px] text-blue-100 font-medium">پژو پارس — پوشش خودکار</span>
        </div>
      </div>

      {/* کارت شناور ۲: فرصت خرید زیر قیمت (سمت چپ بالا/وسط) */}
      <div className="absolute -top-2 sm:top-2 -left-2 sm:-left-4 z-30 flex items-center gap-2.5 rounded-2xl bg-white p-2.5 sm:p-3 shadow-2xl border border-slate-100 text-xs">
        <div className="size-10 sm:size-11 rounded-xl bg-slate-100 flex items-center justify-center overflow-hidden border border-slate-200/60 shrink-0">
          <Image
            src="/hero-radar-car.png"
            alt="پژو ۲۰۶"
            width={44}
            height={44}
            className="object-cover scale-125"
          />
        </div>
        <div className="text-right">
          <div className="flex items-center gap-1.5">
            <span className="font-black text-slate-800 text-[11px] sm:text-xs">پژو ۲۰۶ تیپ ۲</span>
            <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-50 px-1.5 py-0.5 text-[10px] font-black text-emerald-700 border border-emerald-200">
              <TrendingDown className="size-2.5" />
              <span>۱۲٪-</span>
            </span>
          </div>
          <span className="block text-[11px] sm:text-xs font-black text-blue-600 mt-0.5">۴۸۰,۰۰۰,۰۰۰ تومان</span>
        </div>
      </div>

      {/* تصویر اصلی خودرو در مرکز */}
      <div className="relative z-10 w-[280px] sm:w-[360px] pt-12 pb-4">
        <Image
          src="/hero-radar-car.png"
          alt="خودرو رادار"
          width={400}
          height={200}
          priority
          className="w-full h-auto drop-shadow-2xl transition-transform hover:scale-105 duration-300"
        />
        {/* سایه واقعی زیر خودرو */}
        <div className="mx-auto -mt-3 h-4 w-3/4 rounded-full bg-slate-900/15 blur-md" />
      </div>
    </div>
  );
}
