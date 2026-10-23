import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowLeft,
  Bell,
  Camera,
  Car,
  Check,
  Clock,
  Compass,
  Eye,
  Flame,
  MessageSquare,
  PhoneCall,
  Radar,
  Radio,
  ShieldCheck,
  Sparkles,
  TrendingDown,
  UserCheck,
} from "lucide-react";
import { getSessionUser } from "@/lib/auth";
import { formatNumber } from "@/lib/money";
import { PLANS, TRIAL_DAYS } from "@/lib/plans";
import { LandingHeader } from "@/components/landing-header";
import { LandingHeroGraphic } from "@/components/landing-hero-graphic";
import { LandingFAQ } from "@/components/landing-faq";

export const dynamic = "force-dynamic";

const basic = PLANS.basic;
const pro = PLANS.pro;

export default async function Home() {
  if (await getSessionUser()) redirect("/dashboard");

  return (
    <div className="min-h-dvh bg-[#F7F9FC] text-[#172033] selection:bg-blue-600 selection:text-white">
      <LandingHeader />

      <main className="space-y-20 pb-20 sm:space-y-28">
        <section className="relative overflow-hidden pt-8 pb-4 sm:pt-14">
          <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 sm:px-6 lg:grid-cols-12 lg:px-8">
            <div className="rise-in space-y-6 text-right lg:col-span-7">
              <div className="inline-flex items-center gap-2 rounded-full border border-blue-200/80 bg-blue-50/80 px-3.5 py-1.5 text-xs font-bold text-blue-800">
                <Radio className="size-3.5 text-blue-600" />
                <span>پایش زنده مشهد و تربت‌حیدریه</span>
              </div>
              <h1 className="text-3xl font-black leading-tight tracking-tight text-slate-900 sm:text-5xl">
                فرصت خرید را
                <br className="hidden sm:inline" /> قبل از بقیه ببینید
              </h1>
              <p className="max-w-2xl text-sm leading-relaxed font-medium text-slate-600 sm:text-base">
                رادار آگهی‌های دیوار و شیپور را هر دقیقه می‌خواند، قیمت را با ارزش روز مقایسه می‌کند و اگر زیر بازار باشد، همان‌جا در پنل و پیام‌رسان خبر می‌دهد.
              </p>
              <div className="flex flex-col items-stretch gap-3 pt-2 sm:flex-row sm:items-center">
                <Link
                  href="/register"
                  className="inline-flex items-center justify-center gap-2.5 rounded-xl bg-blue-600 px-6 py-3.5 text-sm font-bold text-white transition-colors hover:bg-blue-700 sm:text-base"
                >
                  <span>شروع رایگان {formatNumber(TRIAL_DAYS)} روزه</span>
                  <ArrowLeft className="size-4" />
                </Link>
                <a
                  href="#pricing"
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-3.5 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50 sm:text-base"
                >
                  <Eye className="size-4 text-slate-500" />
                  <span>دیدن قیمت‌ها</span>
                </a>
              </div>
            </div>
            <div className="rise-in lg:col-span-5" style={{ animationDelay: "120ms" }}>
              <LandingHeroGraphic />
            </div>
          </div>
        </section>

        <section className="mx-auto grid max-w-7xl gap-4 px-4 sm:grid-cols-2 sm:px-6 lg:grid-cols-4 lg:px-8">
          {[
            { icon: MessageSquare, title: "بله و تلگرام", body: "هشدار با عکس خودرو" },
            { icon: ShieldCheck, title: "مقایسه قیمت", body: "فروشنده کنار ارزش بازار" },
            { icon: Sparkles, title: "فرصت خرید", body: "آگهی زیر قیمت، جدا از بقیه" },
            { icon: Clock, title: "هر ۶۰ ثانیه", body: "پایش تازه مشهد و تربت" },
          ].map((item, i) => (
            <div
              key={item.title}
              className="rise-in flex items-center gap-3.5 rounded-2xl border border-slate-200 bg-white p-4 transition-colors hover:border-blue-300"
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <div className="grid size-12 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-600">
                <item.icon className="size-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">{item.title}</h3>
                <p className="mt-0.5 text-xs text-slate-500">{item.body}</p>
              </div>
            </div>
          ))}
        </section>

        <section className="bg-[#0B1F49] py-14 text-white sm:py-16">
          <div className="mx-auto grid max-w-7xl items-center gap-8 px-4 sm:px-6 lg:grid-cols-12 lg:px-8">
            <div className="space-y-2 text-right lg:col-span-5">
              <p className="text-xs font-bold text-amber-300">دوره آزمایش فعلی</p>
              <h2 className="text-2xl font-black leading-tight sm:text-3xl">دو شهر، یک نگاه، قیمت خوانا</h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-3 lg:col-span-7">
              {[
                ["۶۰", "ثانیه", "فاصله هر دور پایش"],
                ["۲", "شهر", "مشهد و تربت‌حیدریه"],
                [formatNumber(TRIAL_DAYS), "روز", "آزمایش رایگان"],
              ].map(([value, unit, label]) => (
                <div key={label} className="rounded-2xl border border-white/10 bg-white/5 p-5 text-center">
                  <div className="text-3xl font-black">
                    {value}
                    <span className="me-1 text-base font-bold text-slate-300">{unit}</span>
                  </div>
                  <p className="mt-1 text-xs text-slate-300">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="audiences" className="mx-auto max-w-7xl space-y-8 px-4 sm:px-6 lg:px-8">
          <div className="space-y-2 text-center">
            <h2 className="text-2xl font-black text-slate-900 sm:text-3xl">برای کسی که هر روز آگهی می‌خواند</h2>
            <p className="mx-auto max-w-xl text-sm text-slate-500">نمایشگاه، معامله‌گر، یا خریدار یک خودروی مشخص.</p>
          </div>
          <div className="grid gap-5 sm:grid-cols-3">
            {[
              { icon: Car, title: "نمایشگاه‌دار", body: "خودروهای زیر قیمت را جدا می‌بینید و قبل از تماس، سود تقریبی جلوی چشم‌تان است." },
              { icon: TrendingDown, title: "معامله‌گر", body: "کاهش قیمت فروشنده و آگهی تازه، بدون ورق زدن دیوار." },
              { icon: UserCheck, title: "خریدار شخصی", body: "یک مدل، یک سقف بودجه، و خبر وقتی همان خودرو پیدا شد." },
            ].map((item) => (
              <div key={item.title} className="rounded-2xl border border-slate-200 bg-white p-6 text-right transition-transform hover:-translate-y-0.5">
                <div className="grid size-12 place-items-center rounded-xl bg-blue-50 text-blue-600">
                  <item.icon className="size-6" />
                </div>
                <h3 className="mt-3 text-base font-bold">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{item.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="features" className="mx-auto max-w-7xl space-y-8 px-4 sm:px-6 lg:px-8">
          <div className="space-y-2 text-center">
            <h2 className="text-2xl font-black text-slate-900 sm:text-3xl">داخل پنل چه می‌بینید</h2>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { icon: Radar, title: "رادار آگهی‌ها", body: "لیست زنده دیوار و شیپور، با بروزرسانی پس‌زمینه هر ۳۰ ثانیه." },
              { icon: ShieldCheck, title: "فیلتر متن آگهی", body: "فروش فوری، بی‌رنگ و شاسی سالم را می‌توانید در قانون هشدار بگذارید." },
              { icon: Sparkles, title: "زیر قیمت بازار", body: "قیمت فروشنده درشت است و ارزش بازار زیر آن، کوچک و خاکستری." },
              { icon: Flame, title: "فروش فوری", body: "عبارت‌هایی مثل پول‌لازم و فروش فوری در هشدار جدا می‌شوند." },
              { icon: TrendingDown, title: "کاهش قیمت", body: "اگر فروشنده ارزان‌تر کند، همان آگهی دوباره خبر می‌شود." },
              { icon: Camera, title: "عکس در پیام‌رسان", body: "بله و تلگرام عکس خودرو را می‌فرستند؛ اگر عکس نیاید، متن می‌ماند." },
            ].map((item) => (
              <div key={item.title} className="rounded-2xl border border-slate-200 bg-white p-6 text-right">
                <div className="grid size-11 place-items-center rounded-xl bg-blue-50 text-blue-600">
                  <item.icon className="size-5" />
                </div>
                <h3 className="mt-3 font-bold">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{item.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="pricing" className="mx-auto max-w-7xl space-y-10 px-4 sm:px-6 lg:px-8">
          <div className="space-y-2 text-center">
            <h2 className="text-2xl font-black text-slate-900 sm:text-3xl">قیمت، همان عدد پنل</h2>
            <p className="text-sm text-slate-500">{formatNumber(TRIAL_DAYS)} روز اول رایگان است. بعد از آن مبلغ روی سرور از همین جدول حساب می‌شود.</p>
          </div>
          <div className="grid items-stretch gap-6 md:grid-cols-3">
            <PlanCard
              name={basic.name}
              blurb="یک شهر از مشهد یا تربت‌حیدریه"
              price={`${formatNumber(basic.priceToman)} تومان`}
              period="در ماه"
              items={[
                `پایش ${formatNumber(basic.allowedCitiesCount)} شهر`,
                `${formatNumber(basic.maxActiveRules)} قانون هشدار`,
                `${formatNumber(basic.maxSavedListings)} آگهی ذخیره‌شده`,
                "مقایسه با قیمت روز",
              ]}
              href="/register"
              cta="شروع با پلن پایه"
            />
            <PlanCard
              name={pro.name}
              blurb="هر دو شهر فعال، امتیاز فرصت و عکس در پیام‌رسان"
              price={`${formatNumber(pro.priceToman)} تومان`}
              period="در ماه"
              highlighted
              items={[
                "مشهد و تربت‌حیدریه",
                `${formatNumber(pro.maxActiveRules)} قانون هشدار`,
                `${formatNumber(pro.maxSavedListings)} آگهی ذخیره‌شده`,
                "امتیاز فرصت خرید",
                "عکس خودرو در بله و تلگرام",
              ]}
              href="/register"
              cta={`شروع ${formatNumber(TRIAL_DAYS)} روز رایگان`}
            />
            <PlanCard
              name="سازمانی"
              blurb="برای گالری چندنفره. فعال‌سازی با تماس."
              price="تماس"
              period=""
              items={["چند کاربر", "سقف قانون و ذخیره بالاتر", "پشتیبانی تلفنی"]}
              href="tel:09999212209"
              cta="تماس برای فعال‌سازی"
            />
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white p-5 text-right">
            <h3 className="mb-4 font-bold">مقایسه سقف‌ها</h3>
            <table className="w-full min-w-[520px] text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="px-2 py-3 text-right font-bold">مورد</th>
                  <th className="px-2 py-3 text-center font-bold">پایه</th>
                  <th className="px-2 py-3 text-center font-bold text-blue-700">حرفه‌ای</th>
                  <th className="px-2 py-3 text-center font-bold">سازمانی</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr>
                  <td className="px-2 py-3">قانون فعال</td>
                  <td className="px-2 py-3 text-center">{formatNumber(basic.maxActiveRules)}</td>
                  <td className="px-2 py-3 text-center font-bold text-blue-700">{formatNumber(pro.maxActiveRules)}</td>
                  <td className="px-2 py-3 text-center">{formatNumber(PLANS.business.maxActiveRules)}</td>
                </tr>
                <tr>
                  <td className="px-2 py-3">آگهی ذخیره‌شده</td>
                  <td className="px-2 py-3 text-center">{formatNumber(basic.maxSavedListings)}</td>
                  <td className="px-2 py-3 text-center font-bold text-blue-700">{formatNumber(pro.maxSavedListings)}</td>
                  <td className="px-2 py-3 text-center">{formatNumber(PLANS.business.maxSavedListings)}</td>
                </tr>
                <tr>
                  <td className="px-2 py-3">شهر در این دوره</td>
                  <td className="px-2 py-3 text-center">۱ از ۲</td>
                  <td className="px-2 py-3 text-center font-bold text-blue-700">هر دو</td>
                  <td className="px-2 py-3 text-center">هر دو</td>
                </tr>
                <tr>
                  <td className="px-2 py-3">قیمت ماهانه</td>
                  <td className="px-2 py-3 text-center">{formatNumber(basic.priceToman)}</td>
                  <td className="px-2 py-3 text-center font-bold text-blue-700">{formatNumber(pro.priceToman)}</td>
                  <td className="px-2 py-3 text-center">توافقی</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section id="how-it-works" className="mx-auto max-w-7xl space-y-8 px-4 sm:px-6 lg:px-8">
          <div className="space-y-2 text-center">
            <h2 className="text-2xl font-black text-slate-900 sm:text-3xl">سه قدم</h2>
          </div>
          <div className="grid gap-6 text-right md:grid-cols-3">
            {[
              { icon: UserCheck, n: "۱", title: "ثبت‌نام با موبایل", body: "دوره آزمایشی همان لحظه باز می‌شود." },
              { icon: Compass, n: "۲", title: "قانون هشدار", body: "مدل، بودجه، شهر و شرط فروش فوری را مشخص کنید." },
              { icon: Bell, n: "۳", title: "خبر در پیام‌رسان", body: "آگهی تازه با عکس به بله یا تلگرام می‌رسد و در پنل هم می‌ماند." },
            ].map((step) => (
              <div key={step.n} className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6">
                <span className="absolute top-4 left-4 text-4xl font-black text-blue-100">{step.n}</span>
                <div className="grid size-11 place-items-center rounded-xl bg-blue-50 text-blue-600">
                  <step.icon className="size-5" />
                </div>
                <h3 className="mt-3 font-bold">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{step.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="faq" className="mx-auto max-w-7xl space-y-8 px-4 sm:px-6 lg:px-8">
          <div className="space-y-2 text-center">
            <h2 className="text-2xl font-black text-slate-900 sm:text-3xl">سؤال‌های معمول</h2>
          </div>
          <LandingFAQ />
        </section>

        <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-3xl bg-[#0B1F49] px-6 py-12 text-center text-white sm:px-14">
            <h2 className="text-3xl font-black">آگهی خوب صبر نمی‌کند</h2>
            <p className="mx-auto mt-3 max-w-xl text-sm text-slate-300">چهارده روز رایگان، بدون کارت. اگر به درد نخورد، هشدار خودش بعد از آزمایش قطع می‌شود.</p>
            <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link href="/register" className="inline-flex items-center gap-2 rounded-xl bg-amber-400 px-7 py-3.5 text-sm font-black text-slate-950 hover:bg-amber-300">
                شروع رایگان
                <ArrowLeft className="size-4" />
              </Link>
              <a href="tel:09999212209" className="inline-flex items-center gap-2 rounded-xl border border-white/20 px-5 py-3.5 text-sm font-bold">
                <PhoneCall className="size-4" />
                مشاوره
              </a>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white py-12 text-right text-slate-600">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 sm:px-6 md:grid-cols-4 lg:px-8">
          <div className="space-y-3">
            <div className="flex items-center gap-2 font-black text-slate-900">
              <Image src="/logo.png" alt="" width={36} height={36} className="size-9 rounded-xl border border-blue-100 bg-blue-50 object-contain p-1" />
              رادار خرید خودرو
            </div>
            <p className="text-xs leading-relaxed text-slate-500">پایش آگهی خودرو در مشهد و تربت‌حیدریه، مقایسه قیمت و هشدار در بله و تلگرام.</p>
          </div>
          <div>
            <h4 className="mb-3 text-xs font-bold text-slate-900">دسترسی</h4>
            <ul className="space-y-2 text-xs">
              <li><a href="#features" className="hover:text-blue-600">امکانات</a></li>
              <li><a href="#pricing" className="hover:text-blue-600">قیمت‌ها</a></li>
              <li><a href="#how-it-works" className="hover:text-blue-600">شروع</a></li>
              <li><a href="#faq" className="hover:text-blue-600">سؤال‌ها</a></li>
            </ul>
          </div>
          <div>
            <h4 className="mb-3 text-xs font-bold text-slate-900">ورود</h4>
            <ul className="space-y-2 text-xs">
              <li><Link href="/login" className="hover:text-blue-600">ورود به پنل</Link></li>
              <li><Link href="/register" className="hover:text-blue-600">ثبت‌نام</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="mb-3 text-xs font-bold text-slate-900">پشتیبانی</h4>
            <a href="tel:09999212209" className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-3.5 py-2 text-xs font-bold text-slate-900">
              <PhoneCall className="size-3.5 text-blue-600" />
              ۰۹۹۹۹۲۱۲۲۰۹
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

function PlanCard({
  name,
  blurb,
  price,
  period,
  items,
  href,
  cta,
  highlighted,
}: {
  name: string;
  blurb: string;
  price: string;
  period: string;
  items: string[];
  href: string;
  cta: string;
  highlighted?: boolean;
}) {
  const className = highlighted
    ? "rounded-2xl border-2 border-blue-600 bg-white p-6 text-right shadow-lg"
    : "rounded-2xl border border-slate-200 bg-white p-6 text-right";
  const button = highlighted
    ? "mt-6 inline-flex w-full items-center justify-center rounded-xl bg-blue-600 py-3 text-sm font-bold text-white hover:bg-blue-700"
    : "mt-6 inline-flex w-full items-center justify-center rounded-xl border border-slate-300 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50";
  return (
    <div className={className}>
      {highlighted && <p className="mb-2 text-[11px] font-bold text-blue-700">پیشنهاد رادار</p>}
      <h3 className="text-lg font-bold">{name}</h3>
      <p className="mt-1 text-xs text-slate-500">{blurb}</p>
      <p className="mt-4 border-y border-slate-100 py-3">
        <span className="text-3xl font-black">{price}</span>
        {period && <span className="me-1 text-xs font-bold text-slate-500">{period}</span>}
      </p>
      <ul className="mt-4 space-y-2 text-sm text-slate-700">
        {items.map((item) => (
          <li key={item} className="flex items-center gap-2">
            <Check className="size-4 shrink-0 text-emerald-600" />
            {item}
          </li>
        ))}
      </ul>
      {href.startsWith("tel:") ? (
        <a href={href} className={button}>{cta}</a>
      ) : (
        <Link href={href} className={button}>{cta}</Link>
      )}
    </div>
  );
}
