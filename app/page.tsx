import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowLeft,
  Bell,
  Calculator,
  Camera,
  Car,
  Check,
  CheckCircle2,
  ChevronLeft,
  Clock,
  Compass,
  Eye,
  Flame,
  HelpCircle,
  Layers,
  MessageSquare,
  PhoneCall,
  Radar,
  Radio,
  Search,
  ShieldCheck,
  Sparkles,
  TrendingDown,
  TrendingUp,
  UserCheck,
  Users,
  Zap,
} from "lucide-react";
import { getSessionUser } from "@/lib/auth";
import { formatNumber } from "@/lib/money";
import { PLANS, TRIAL_DAYS } from "@/lib/plans";
import { LandingHeader } from "@/components/landing-header";
import { LandingHeroGraphic } from "@/components/landing-hero-graphic";
import { LandingFAQ } from "@/components/landing-faq";

export const dynamic = "force-dynamic";

export default async function Home() {
  // If user is already authenticated, redirect to /dashboard
  if (await getSessionUser()) redirect("/dashboard");

  return (
    <div className="min-h-dvh bg-[#F7F9FC] text-[#172033] selection:bg-blue-600 selection:text-white font-sans">
      {/* ── ۱. هدر سایت ── */}
      <LandingHeader />

      <main className="space-y-20 sm:space-y-28 pb-20">
        {/* ── ۲. بخش Hero ── */}
        <section className="relative overflow-hidden pt-8 sm:pt-14 pb-4">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-8 items-center">
              {/* ستون راست (متن و دکمه‌های اقدام) */}
              <div className="lg:col-span-7 text-right space-y-6">
                <div className="inline-flex items-center gap-2 rounded-full border border-blue-200/80 bg-blue-50/80 px-3.5 py-1.5 text-xs font-bold text-blue-800 shadow-xs">
                  <Radio className="size-3.5 text-blue-600 animate-pulse" />
                  <span>سامانه هوشمند رصد آگهی خودرو</span>
                </div>

                <h1 className="text-3xl font-black leading-tight sm:text-5xl lg:text-[3.25rem] tracking-tight text-slate-900">
                  فرصت‌های خرید خودرو را
                  <br className="hidden sm:inline" />
                  {" "}قبل از بقیه ببینید و{" "}
                  <span className="text-amber-500 font-black">شکار کنید!</span>
                </h1>

                <p className="max-w-2xl text-sm sm:text-base leading-relaxed text-slate-600 font-medium">
                  با رادار، آگهی‌های خودرو را در منابع پشتیبانی‌شده پایش کنید، فرصت‌های مناسب خرید را سریع‌تر شناسایی کنید و تغییرات قیمت را از دست ندهید.
                </p>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
                  <Link
                    href="/register"
                    className="inline-flex items-center justify-center gap-2.5 rounded-xl bg-blue-600 px-6 py-3.5 text-sm sm:text-base font-bold text-white shadow-lg shadow-blue-500/25 hover:bg-blue-700 transition-all active:scale-95"
                  >
                    <span>شروع رایگان {formatNumber(TRIAL_DAYS)} روزه</span>
                    <ArrowLeft className="size-4.5" />
                  </Link>

                  <a
                    href="#features"
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-3.5 text-sm sm:text-base font-bold text-slate-700 hover:bg-slate-50 hover:text-blue-600 transition-all shadow-xs"
                  >
                    <Eye className="size-4.5 text-slate-500" />
                    <span>مشاهده امکانات</span>
                  </a>
                </div>

                <div className="flex items-center gap-4 text-xs font-semibold text-slate-500 pt-1">
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="size-4 text-emerald-600" />
                    <span>بدون نیاز به کارت بانکی</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="size-4 text-emerald-600" />
                    <span>فعال‌سازی فوری در ۳۰ ثانیه</span>
                  </span>
                </div>
              </div>

              {/* ستون چپ (عنصر گرافیکی رادار و خودرو) */}
              <div className="lg:col-span-5">
                <LandingHeroGraphic />
              </div>
            </div>
          </div>
        </section>

        {/* ── ۳. نوار امکانات کلیدی (۴ قسمتی) ── */}
        <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="flex items-center gap-3.5 rounded-2xl border border-slate-200/80 bg-white p-4.5 shadow-xs hover:border-blue-300 hover:shadow-md transition-all">
              <div className="grid size-12 place-items-center rounded-xl bg-blue-50 text-blue-600 shrink-0">
                <MessageSquare className="size-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">پشتیبانی انواع پیام‌رسان</h3>
                <p className="text-xs text-slate-500 mt-0.5">تلگرام، ایتا، بله و...</p>
              </div>
            </div>

            <div className="flex items-center gap-3.5 rounded-2xl border border-slate-200/80 bg-white p-4.5 shadow-xs hover:border-blue-300 hover:shadow-md transition-all">
              <div className="grid size-12 place-items-center rounded-xl bg-blue-50 text-blue-600 shrink-0">
                <ShieldCheck className="size-6 text-blue-600" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">مقایسه قیمت</h3>
                <p className="text-xs text-slate-500 mt-0.5">بررسی قیمت و ارزش واقعی خودرو</p>
              </div>
            </div>

            <div className="flex items-center gap-3.5 rounded-2xl border border-slate-200/80 bg-white p-4.5 shadow-xs hover:border-blue-300 hover:shadow-md transition-all">
              <div className="grid size-12 place-items-center rounded-xl bg-blue-50 text-blue-600 shrink-0">
                <Sparkles className="size-6 text-amber-500" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">پیشنهاد هوشمند</h3>
                <p className="text-xs text-slate-500 mt-0.5">تشخیص فرصت‌های واقعی خرید</p>
              </div>
            </div>

            <div className="flex items-center gap-3.5 rounded-2xl border border-slate-200/80 bg-white p-4.5 shadow-xs hover:border-blue-300 hover:shadow-md transition-all">
              <div className="grid size-12 place-items-center rounded-xl bg-blue-50 text-blue-600 shrink-0">
                <Clock className="size-6 text-blue-600" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">هشدار لحظه‌ای</h3>
                <p className="text-xs text-slate-500 mt-0.5">دریافت سریع آگهی‌های جدید</p>
              </div>
            </div>
          </div>
        </section>

        {/* ── ۴. بخش آمار و ارزش محصول (پس‌زمینه سرمه‌ای تیره #0B1F49) ── */}
        <section className="relative overflow-hidden bg-[#0B1F49] text-white py-14 sm:py-16 shadow-xl">
          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#155EEF_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-5 text-right space-y-2">
                <span className="text-xs font-bold text-amber-400">به انتخاب نمایشگاه‌داران و معامله‌گران خودرو</span>
                <h2 className="text-2xl sm:text-3xl font-black text-white leading-tight">
                  رادار، همراه مطمئن شما در بازار خودرو
                </h2>
                <div className="w-16 h-1 bg-amber-500 rounded-full mt-3" />
              </div>

              <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-3 gap-6 text-center">
                <div className="rounded-2xl bg-white/5 border border-white/10 p-5 backdrop-blur-xs">
                  <div className="mx-auto grid size-12 place-items-center rounded-xl bg-blue-500/20 text-blue-400 mb-3">
                    <Users className="size-6" />
                  </div>
                  <div className="text-3xl font-black text-white">۳۵۰+</div>
                  <div className="text-xs font-bold text-slate-300 mt-1">کاربر فعال</div>
                  <div className="text-[11px] text-slate-400">نمایشگاه‌ها و معامله‌گران</div>
                </div>

                <div className="rounded-2xl bg-white/5 border border-white/10 p-5 backdrop-blur-xs">
                  <div className="mx-auto grid size-12 place-items-center rounded-xl bg-amber-500/20 text-amber-400 mb-3">
                    <Zap className="size-6" />
                  </div>
                  <div className="text-3xl font-black text-amber-400">۶۰ &gt; ثانیه</div>
                  <div className="text-xs font-bold text-slate-300 mt-1">میانگین زمان ارسال هشدار</div>
                  <div className="text-[11px] text-slate-400">به کاربران در ربات بله</div>
                </div>

                <div className="rounded-2xl bg-white/5 border border-white/10 p-5 backdrop-blur-xs">
                  <div className="mx-auto grid size-12 place-items-center rounded-xl bg-emerald-500/20 text-emerald-400 mb-3">
                    <Radar className="size-6" />
                  </div>
                  <div className="text-3xl font-black text-white">۱۲,۵۰۰+</div>
                  <div className="text-xs font-bold text-slate-300 mt-1">آگهی بررسی‌شده در هفته</div>
                  <div className="text-[11px] text-slate-400">از دیوار و شیپور</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── ۵. بخش مخاطبان هدف ── */}
        <section id="audiences" className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="text-center space-y-2">
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900">
              رادار برای چه کسانی مناسب است؟
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 font-medium max-w-xl mx-auto">
              رادار خرید خودرو برای همه فعالان بازار خودرو در تربت‌حیدریه طراحی شده است.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs hover:border-blue-300 hover:shadow-md transition-all text-right space-y-3">
              <div className="grid size-12 place-items-center rounded-xl bg-blue-50 text-blue-600">
                <Car className="size-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900">نمایشگاه‌داران خودرو</h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                شناسایی سریع‌تر خودروهای مناسب خرید و افزایش فرصت‌های معامله با حاشیه سود مطمئن.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs hover:border-blue-300 hover:shadow-md transition-all text-right space-y-3">
              <div className="grid size-12 place-items-center rounded-xl bg-amber-50 text-amber-600">
                <Sparkles className="size-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900">معامله‌گران و دلال‌ها</h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                پایش آگهی‌ها و مقایسه قیمت‌ها برای پیدا کردن فرصت‌های مناسب در کف قیمت بازار.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs hover:border-blue-300 hover:shadow-md transition-all text-right space-y-3">
              <div className="grid size-12 place-items-center rounded-xl bg-emerald-50 text-emerald-600">
                <UserCheck className="size-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900">خریداران شخصی</h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                دنبال‌کردن خودروهای موردنظر و اطلاع فوری از تغییرات قیمت و موارد سالم و بی‌رنگ.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs hover:border-blue-300 hover:shadow-md transition-all text-right space-y-3">
              <div className="grid size-12 place-items-center rounded-xl bg-purple-50 text-purple-600">
                <Layers className="size-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900">سایر فعالان بازار</h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                از سرمایه‌گذاران تا کارشناسان جهت بررسی آگهی‌ها و شناخت بهتر نبض بازار خودرو.
              </p>
            </div>
          </div>
        </section>

        {/* ── ۶. بخش امکانات سامانه ── */}
        <section id="features" className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="text-center space-y-2">
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900">
              قابلیت‌های سامانه
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 font-medium max-w-xl mx-auto">
              همه ابزارهای لازم برای یک خرید هوشمندانه، در کنار هم.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs hover:border-blue-300 hover:shadow-md transition-all text-right space-y-3">
              <div className="grid size-11 place-items-center rounded-xl bg-blue-50 text-blue-600">
                <Radar className="size-5.5" />
              </div>
              <h3 className="text-base font-bold text-slate-900">پایش آگهی‌های جدید</h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                رصد خودکار و شبانه‌روزی دیوار و شیپور به محض انتشار آگهی جدید در شهر.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs hover:border-blue-300 hover:shadow-md transition-all text-right space-y-3">
              <div className="grid size-11 place-items-center rounded-xl bg-emerald-50 text-emerald-600">
                <ShieldCheck className="size-5.5" />
              </div>
              <h3 className="text-base font-bold text-slate-900">فیلتر شاسی پلمپ و بی‌رنگ</h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                بررسی متن آگهی و حذف هوشمند خودروهای تصادفی، ضربه‌دار و دور رنگ.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs hover:border-blue-300 hover:shadow-md transition-all text-right space-y-3">
              <div className="grid size-11 place-items-center rounded-xl bg-amber-50 text-amber-600">
                <Sparkles className="size-5.5" />
              </div>
              <h3 className="text-base font-bold text-slate-900">آگهی‌های زیر قیمت</h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                مقایسه هوشمند قیمت آگهی با قیمت روز کارشناسی و تشخیص فرصت سودآور.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs hover:border-blue-300 hover:shadow-md transition-all text-right space-y-3">
              <div className="grid size-11 place-items-center rounded-xl bg-red-50 text-red-600">
                <Flame className="size-5.5" />
              </div>
              <h3 className="text-base font-bold text-slate-900">تشخیص پول‌لازم‌ها و فروش فوری</h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                تحلیل عبارات فروش فوری، پاس چک و مهاجرت برای شکار قیمت‌های استثنایی.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs hover:border-blue-300 hover:shadow-md transition-all text-right space-y-3">
              <div className="grid size-11 place-items-center rounded-xl bg-indigo-50 text-indigo-600">
                <TrendingDown className="size-5.5" />
              </div>
              <h3 className="text-base font-bold text-slate-900">تشخیص کاهش قیمت</h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                اطلاع آنی در صورت ارزان‌تر شدن قیمت آگهی توسط فروشنده برای چانه‌زنی بهتر.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs hover:border-blue-300 hover:shadow-md transition-all text-right space-y-3">
              <div className="grid size-11 place-items-center rounded-xl bg-sky-50 text-sky-600">
                <Camera className="size-5.5" />
              </div>
              <h3 className="text-base font-bold text-slate-900">ارسال عکس در پیام‌رسان</h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                تماشای رخ و وضعیت ظاهری خودرو در بله و تلگرام همراه با دکمه تماس مستقیم.
              </p>
            </div>
          </div>
        </section>

        {/* ── ۷. بخش قیمت‌گذاری و مقایسه پلن‌ها ── */}
        <section id="pricing" className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center space-y-2">
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900">
              پلن مناسب خودتان را انتخاب کنید
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 font-medium max-w-xl mx-auto">
              با توجه به نیاز خود، پلن مناسب را انتخاب کنید. {formatNumber(TRIAL_DAYS)} روز اول برای تمام کاربران رایگان است.
            </p>
          </div>

          {/* ۳ کارت قیمت‌گذاری */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
            {/* پلن پایه */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-7 shadow-xs flex flex-col justify-between text-right">
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">پلن پایه</h3>
                  <p className="text-xs text-slate-500 mt-1">مناسب خریداران شخصی و پیگیری خودروهای دلخواه</p>
                </div>
                <div className="py-2 border-y border-slate-100">
                  <span className="text-3xl font-black text-slate-900">۲۹۰,۰۰۰</span>
                  <span className="text-xs font-bold text-slate-500 mr-1.5">تومان / ماهانه</span>
                </div>
                <ul className="space-y-2.5 text-xs sm:text-sm text-slate-600">
                  <li className="flex items-center gap-2">
                    <Check className="size-4 text-emerald-600 shrink-0" />
                    <span>۵ قانون هشدار فعال همزمان</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="size-4 text-emerald-600 shrink-0" />
                    <span>۱۰۰ آگهی ذخیره‌شده</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="size-4 text-emerald-600 shrink-0" />
                    <span>اعلان متنی به ربات بله و تلگرام</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="size-4 text-emerald-600 shrink-0" />
                    <span>مقایسه با قیمت کارشناسی روز</span>
                  </li>
                </ul>
              </div>
              <div className="pt-6">
                <Link
                  href="/register"
                  className="w-full inline-flex items-center justify-center rounded-xl border border-slate-300 py-3 text-xs sm:text-sm font-bold text-slate-700 hover:bg-slate-50 hover:text-blue-600 transition-colors shadow-xs"
                >
                  انتخاب پلن پایه
                </Link>
              </div>
            </div>

            {/* پلن حرفه‌ای (برجسته) */}
            <div className="rounded-2xl border-2 border-blue-600 bg-white p-6 sm:p-7 shadow-xl shadow-blue-500/10 flex flex-col justify-between text-right relative scale-102">
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-blue-600 px-3.5 py-1 text-[11px] font-black text-white shadow-md">
                ⭐ محبوب‌ترین انتخاب نمایشگاه‌داران
              </div>
              <div className="space-y-4 pt-1">
                <div>
                  <h3 className="text-lg font-bold text-blue-900">پلن حرفه‌ای (شکارچی)</h3>
                  <p className="text-xs text-slate-500 mt-1">مناسب برای نمایشگاه‌داران فعال و معامله‌گران بازار</p>
                </div>
                <div className="py-2 border-y border-slate-100">
                  <span className="text-3xl font-black text-blue-600">۷۹۰,۰۰۰</span>
                  <span className="text-xs font-bold text-slate-500 mr-1.5">تومان / ماهانه</span>
                </div>
                <ul className="space-y-2.5 text-xs sm:text-sm text-slate-700 font-medium">
                  <li className="flex items-center gap-2 font-bold text-blue-950">
                    <Check className="size-4 text-blue-600 shrink-0" />
                    <span>۲۰ قانون هشدار فعال (رصد کامل بازار)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="size-4 text-blue-600 shrink-0" />
                    <span>۵۰۰ آگهی ذخیره‌شده</span>
                  </li>
                  <li className="flex items-center gap-2 font-bold text-amber-600">
                    <Check className="size-4 text-amber-500 shrink-0" />
                    <span>سرعت آنی VIP بدون تاخیر (ثانیه اول)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="size-4 text-blue-600 shrink-0" />
                    <span>ارسال عکس خودرو در بله و تلگرام</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="size-4 text-blue-600 shrink-0" />
                    <span>رادار فروش فوری و پول‌لازم 🔥</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="size-4 text-blue-600 shrink-0" />
                    <span>فیلتر شاسی پلمپ و بدون رنگ 🛡️</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="size-4 text-blue-600 shrink-0" />
                    <span>ماشین‌حساب هوشمند سود و کارشناسی</span>
                  </li>
                </ul>
              </div>
              <div className="pt-6">
                <Link
                  href="/register"
                  className="w-full inline-flex items-center justify-center rounded-xl bg-blue-600 py-3 text-xs sm:text-sm font-bold text-white hover:bg-blue-700 shadow-md shadow-blue-500/25 transition-all"
                >
                  شروع رایگان ۱۴ روزه
                </Link>
              </div>
            </div>

            {/* پلن سازمانی */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-7 shadow-xs flex flex-col justify-between text-right">
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">پلن سازمانی و گالری</h3>
                  <p className="text-xs text-slate-500 mt-1">برای اتوگالری‌های چندشعبه، هلدینگ‌ها و سرمایه‌گذاران</p>
                </div>
                <div className="py-2 border-y border-slate-100">
                  <span className="text-3xl font-black text-slate-900">۱,۹۹۰,۰۰۰</span>
                  <span className="text-xs font-bold text-slate-500 mr-1.5">تومان / ماهانه</span>
                </div>
                <ul className="space-y-2.5 text-xs sm:text-sm text-slate-600">
                  <li className="flex items-center gap-2">
                    <Check className="size-4 text-emerald-600 shrink-0" />
                    <span>۱۰۰ قانون هشدار فعال همزمان</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="size-4 text-emerald-600 shrink-0" />
                    <span>۵٬۰۰۰ آگهی ذخیره‌شده</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="size-4 text-emerald-600 shrink-0" />
                    <span>اتصال چند شماره بله و تلگرام همکاران</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="size-4 text-emerald-600 shrink-0" />
                    <span>پشتیبانی اختصاصی مستقیم تلفنی</span>
                  </li>
                </ul>
              </div>
              <div className="pt-6">
                <a
                  href="tel:09999212209"
                  className="w-full inline-flex items-center justify-center rounded-xl border border-slate-300 py-3 text-xs sm:text-sm font-bold text-slate-700 hover:bg-slate-50 hover:text-blue-600 transition-colors shadow-xs"
                >
                  مشاوره و انتخاب پلن
                </a>
              </div>
            </div>
          </div>

          {/* ── ۸. جدول مقایسه پلن‌ها ── */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs overflow-x-auto text-right">
            <h3 className="text-base font-bold text-slate-900 mb-4">جدول مقایسه امکانات پلن‌ها</h3>
            <table className="w-full min-w-[500px] text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-600 font-bold">
                  <th className="py-3 px-2 text-right">ویژگی‌ها</th>
                  <th className="py-3 px-2 text-center">پایه</th>
                  <th className="py-3 px-2 text-center text-blue-600">حرفه‌ای ⭐</th>
                  <th className="py-3 px-2 text-center">سازمانی</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                <tr>
                  <td className="py-3 px-2 font-medium">تعداد قوانین هشدار فعال</td>
                  <td className="py-3 px-2 text-center">۵ عدد</td>
                  <td className="py-3 px-2 text-center font-bold text-blue-700">۲۰ عدد</td>
                  <td className="py-3 px-2 text-center font-bold">۱۰۰ عدد</td>
                </tr>
                <tr>
                  <td className="py-3 px-2 font-medium">تعداد آگهی ذخیره‌شده</td>
                  <td className="py-3 px-2 text-center">۱۰۰ عدد</td>
                  <td className="py-3 px-2 text-center font-bold text-blue-700">۵۰۰ عدد</td>
                  <td className="py-3 px-2 text-center font-bold">۵٬۰۰۰ عدد</td>
                </tr>
                <tr>
                  <td className="py-3 px-2 font-medium">سرعت ارسال آگهی</td>
                  <td className="py-3 px-2 text-center text-slate-500">استاندارد</td>
                  <td className="py-3 px-2 text-center font-bold text-amber-600">آنی VIP (۰ ثانیه)</td>
                  <td className="py-3 px-2 text-center font-bold text-amber-600">آنی VIP (۰ ثانیه)</td>
                </tr>
                <tr>
                  <td className="py-3 px-2 font-medium">ارسال عکس خودرو در پیام‌رسان</td>
                  <td className="py-3 px-2 text-center text-slate-400">—</td>
                  <td className="py-3 px-2 text-center text-emerald-600 font-bold">✓</td>
                  <td className="py-3 px-2 text-center text-emerald-600 font-bold">✓</td>
                </tr>
                <tr>
                  <td className="py-3 px-2 font-medium">رادار آگهی‌های پول‌لازم و فروش فوری</td>
                  <td className="py-3 px-2 text-center text-slate-400">—</td>
                  <td className="py-3 px-2 text-center text-emerald-600 font-bold">✓</td>
                  <td className="py-3 px-2 text-center text-emerald-600 font-bold">✓</td>
                </tr>
                <tr>
                  <td className="py-3 px-2 font-medium">فیلتر شاسی سالم و بدون رنگ</td>
                  <td className="py-3 px-2 text-center text-slate-400">—</td>
                  <td className="py-3 px-2 text-center text-emerald-600 font-bold">✓</td>
                  <td className="py-3 px-2 text-center text-emerald-600 font-bold">✓</td>
                </tr>
                <tr>
                  <td className="py-3 px-2 font-medium">ماشین‌حساب کارشناسی و سود</td>
                  <td className="py-3 px-2 text-center text-slate-400">—</td>
                  <td className="py-3 px-2 text-center text-emerald-600 font-bold">✓</td>
                  <td className="py-3 px-2 text-center text-emerald-600 font-bold">✓</td>
                </tr>
                <tr>
                  <td className="py-3 px-2 font-medium">پشتیبانی چند شماره همکار</td>
                  <td className="py-3 px-2 text-center text-slate-400">—</td>
                  <td className="py-3 px-2 text-center text-slate-400">—</td>
                  <td className="py-3 px-2 text-center text-emerald-600 font-bold">✓ (تا ۵ شماره)</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* ── ۹. بخش شروع سریع (۳ مرحله) ── */}
        <section id="how-it-works" className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="text-center space-y-2">
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900">
              شروع کار در سه مرحله ساده
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 font-medium max-w-xl mx-auto">
              در کمتر از چند دقیقه، رادار را فعال کنید.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-right">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-3 relative overflow-hidden">
              <span className="text-4xl font-black text-blue-100 absolute left-4 top-4 select-none">۰۱</span>
              <div className="grid size-11 place-items-center rounded-xl bg-blue-50 text-blue-600">
                <UserCheck className="size-5.5" />
              </div>
              <h3 className="text-base font-bold text-slate-900">۱. ثبت‌نام و ورود</h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                تنها با شماره موبایل ثبت‌نام کنید و در همان ثانیه دوره آزمایشی رایگان برای شما فعال می‌شود.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-3 relative overflow-hidden">
              <span className="text-4xl font-black text-blue-100 absolute left-4 top-4 select-none">۰۲</span>
              <div className="grid size-11 place-items-center rounded-xl bg-blue-50 text-blue-600">
                <Compass className="size-5.5" />
              </div>
              <h3 className="text-base font-bold text-slate-900">۲. خودروهای موردنظر را انتخاب کنید</h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                مدل خودرو، سقف بودجه یا شروط فروش فوری و شاسی سالم را به سادگی مشخص فرمایید.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-3 relative overflow-hidden">
              <span className="text-4xl font-black text-blue-100 absolute left-4 top-4 select-none">۰۳</span>
              <div className="grid size-11 place-items-center rounded-xl bg-blue-50 text-blue-600">
                <Bell className="size-5.5" />
              </div>
              <h3 className="text-base font-bold text-slate-900">۳. هشدارها را دریافت کنید</h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                به محض ثبت آگهی در دیوار یا شیپور، پیام هشدار با عکس خودرو روی بله یا تلگرام شما ارسال می‌شود.
              </p>
            </div>
          </div>
        </section>

        {/* ── ۱۰. بخش سؤالات متداول ── */}
        <section id="faq" className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="text-center space-y-2">
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900">
              سؤالات متداول
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 font-medium max-w-xl mx-auto">
              پاسخ به پرتکرارترین سؤالات شما درباره نحوه عملکرد رادار خودرو.
            </p>
          </div>

          <LandingFAQ />
        </section>

        {/* ── ۱۱. بخش دعوت نهایی به اقدام (Final CTA Banner) ── */}
        <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="relative overflow-hidden rounded-3xl bg-[#0B1F49] text-white p-8 sm:p-14 text-center space-y-6 shadow-2xl">
            <div className="relative z-10 max-w-2xl mx-auto space-y-4">
              <h2 className="text-3xl sm:text-4xl font-black text-white leading-tight">
                فرصت‌های خوب، منتظر نمی‌مانند!
              </h2>
              <p className="text-sm sm:text-base text-slate-300 font-medium leading-relaxed">
                با رادار، بازار خودرو را هوشمندانه‌تر دنبال کنید و فرصت‌های مناسب خرید را سریع‌تر شناسایی کنید.
              </p>
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                <Link
                  href="/register"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-amber-500 px-7 py-3.5 text-sm sm:text-base font-black text-slate-950 shadow-lg shadow-amber-500/25 hover:bg-amber-400 transition-all active:scale-95"
                >
                  <Sparkles className="size-4.5" />
                  <span>همین حالا شروع کنید (۱۴ روز رایگان)</span>
                </Link>
                <a
                  href="tel:09999212209"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/10 px-5 py-3.5 text-sm sm:text-base font-bold text-white hover:bg-white/20 transition-all"
                >
                  <PhoneCall className="size-4 text-slate-300" />
                  <span>مشاوره و راهنمایی</span>
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ── ۱۲. فوتر سایت ── */}
      <footer className="border-t border-slate-200 bg-white text-slate-600 py-12 text-right">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="space-y-3 md:col-span-1">
              <div className="flex items-center gap-2 font-black text-slate-900 text-lg">
                <div className="relative size-9 shrink-0 overflow-hidden rounded-xl bg-blue-50/60 p-1 border border-blue-100 shadow-xs">
                  <Image
                    src="/logo.png"
                    alt="لوگوی رادار شکار خودرو"
                    width={36}
                    height={36}
                    className="size-full object-contain"
                  />
                </div>
                <span>رادار خرید خودرو</span>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                سامانه هوشمند رصد و شکار فرصت‌های خرید خودرو در دیوار و شیپور با تحلیل هوشمند قیمت و ارسال لحظه‌ای به پیام‌رسان بله و تلگرام.
              </p>
            </div>

            <div>
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">دسترسی سریع</h4>
              <ul className="space-y-2 text-xs font-medium">
                <li><a href="#" className="hover:text-blue-600 transition-colors">صفحه اصلی</a></li>
                <li><a href="#features" className="hover:text-blue-600 transition-colors">امکانات سامانه</a></li>
                <li><a href="#pricing" className="hover:text-blue-600 transition-colors">تعرفه‌ها و پلن‌ها</a></li>
                <li><a href="#how-it-works" className="hover:text-blue-600 transition-colors">راهنمای شروع</a></li>
              </ul>
            </div>

            <div>
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">بخش‌های سامانه</h4>
              <ul className="space-y-2 text-xs font-medium">
                <li><Link href="/login" className="hover:text-blue-600 transition-colors">ورود به پنل کاربری</Link></li>
                <li><Link href="/register" className="hover:text-blue-600 transition-colors">شروع دوره آزمایشی رایگان</Link></li>
                <li><Link href="/calculator" className="hover:text-blue-600 transition-colors">ماشین‌حساب قیمت بازار</Link></li>
                <li><a href="#faq" className="hover:text-blue-600 transition-colors">سؤالات متداول</a></li>
              </ul>
            </div>

            <div>
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">ارتباط و پشتیبانی</h4>
              <p className="text-xs text-slate-600 leading-relaxed mb-3">
                جهت هرگونه راهنمایی، فعال‌سازی اشتراک یا سوالات فنی با شماره پشتیبانی تماس حاصل فرمایید.
              </p>
              <a
                href="tel:09999212209"
                className="inline-flex items-center gap-2 rounded-xl bg-slate-100 hover:bg-slate-200 px-3.5 py-2 text-xs font-bold text-slate-900 transition-colors"
              >
                <PhoneCall className="size-3.5 text-blue-600" />
                <span>۰۹۹۹۹۲۱۲۲۰۹ (حقدادی)</span>
              </a>
            </div>
          </div>

          <div className="pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-3">
            <p>© ۲۰۲۶ تمامی حقوق برای سامانه رادار خرید خودرو محفوظ است.</p>
            <p>طراحی شده به صورت اختصاصی جهت استفاده در بازار خودرو تربت‌حیدریه</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
