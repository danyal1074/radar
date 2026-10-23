"use client";

import Image from "next/image";
import { MapPin } from "lucide-react";

export function LandingHeroGraphic() {
  return (
    <div className="float-card relative mx-auto w-full max-w-lg">
      <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center" aria-hidden="true">
        <div className="size-52 rounded-full border border-blue-400/50 sm:size-64" />
        <div className="absolute size-36 rounded-full border border-blue-500/40 sm:size-44" />
      </div>

      <Image
        src="/hero-car-sharp.jpg"
        alt="پژو ۲۰۶ روی رادار آگهی"
        width={1280}
        height={720}
        unoptimized
        priority
        className="relative z-10 h-auto w-full"
      />

      <div className="absolute top-[18%] left-1/2 z-30 -translate-x-1/2 -translate-y-1/2">
        <span className="mx-auto block size-2.5 rounded-full bg-blue-600 ring-4 ring-blue-200/80" />
        <span className="mt-1 grid size-7 place-items-center rounded-full bg-blue-600 text-white">
          <MapPin className="size-3.5" aria-hidden />
        </span>
      </div>

      <div className="absolute top-3 left-1 z-30 w-40 rounded-2xl border border-slate-200 bg-white p-2.5 text-right shadow-md sm:left-0 sm:w-44">
        <p className="text-[11px] font-black whitespace-nowrap text-slate-900">پژو ۲۰۶ تیپ ۲</p>
        <p className="mt-0.5 text-sm font-black text-slate-900">۴۸۰ میلیون</p>
        <p className="text-[11px] font-bold text-emerald-700">سود ۶۰ میلیون · ۱۱٪</p>
      </div>

      <div className="absolute top-6 right-1 z-30 rounded-2xl bg-blue-600 px-3 py-2 text-right text-white shadow-md sm:right-0">
        <p className="text-[11px] font-black">آگهی جدید</p>
        <p className="text-[10px] text-blue-100">پژو ۲۰۶ — پوشش خودکار</p>
      </div>
    </div>
  );
}
