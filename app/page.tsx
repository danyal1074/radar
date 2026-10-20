import {
  ArrowLeft,
  BellRing,
  Calculator,
  Camera,
  CheckCircle2,
  Coins,
  Copy,
  Flame,
  Gauge,
  HelpCircle,
  ListChecks,
  PhoneCall,
  Radar,
  ShieldCheck,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { PlanComparisonTable } from "@/components/plan-comparison-table";
import { PricingCards } from "@/components/pricing-cards";
import { Logo } from "@/components/shell";
import { Card, LinkButton } from "@/components/ui";
import { getSessionUser } from "@/lib/auth";
import { formatNumber } from "@/lib/money";
import { TRIAL_DAYS } from "@/lib/plans";

export const dynamic = "force-dynamic";

const AUDIENCES = [
  {
    icon: Users,
    title: "نمایشگاه‌داران و اتوگالری‌ها",
    subtitle: "شارژ مداوم نمایشگاه با ماشین‌های آس و تک",
    desc: "قبل از رقبا ماشین‌های به قیمت و تمیز تربت‌حیدریه را بخرید. با ۱ کلیک بنر نمایشگاهی با شماره گالری خودتان بسازید و در کانال و استوری منتشر کنید.",
    benefit: "حفظ مشتریان گالری با معرفی مداوم ماشین‌های درجه یک",
    color: "bg-blue-50 text-blue-700 border-blue-200",
  },
  {
    icon: Flame,
    title: "کاسبان و شکارچیان بازار (معامله‌گران)",
    subtitle: "شکار در ثانیه ۱ قبل از اشغال شدن خط فروشنده",
    desc: "آگهی‌های «پول لازم، فروش فوری و پاس چک» بلافاصله روی بله و تلگرام شما می‌آید. تماس اول را شما بگیرید و معامله پرسود را ببندید.",
    benefit: "حداقل ۱۵ تا ۳۵ میلیون تومان سود خالص در هر شکار",
    color: "bg-amber-50 text-amber-700 border-amber-200",
  },
  {
    icon: ShieldCheck,
    title: "خریداران مصرف‌کننده شخصی",
    subtitle: "خرید ماشین سالم و مطمئن، زیر قیمت نمایشگاه",
    desc: "دیگر نیازی به ساعت‌ها جستجوی گیج‌کننده در دیوار نیست! فیلتر شاسی پلمپ و بدون رنگ را فعال کنید و یک خودروی سالم را با تخفیف واقعی بخرید.",
    benefit: "صرفه‌جویی ۱۰ تا ۴۰ میلیون تومانی در خرید خودروی خانوادگی",
    color: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  {
    icon: TrendingUp,
    title: "سرمایه‌گذاران بازار خودرو",
    subtitle: "رصد نبض بازار و خرید در کف قیمت",
    desc: "تشخیص دقیق خودروهای نقدشونده با ماشین‌حساب تخصصی سود و استهلاک. اطلاع فوری از تخفیف‌ها و کاهش قیمت‌های فروشندگان منصف.",
    benefit: "کاهش ریسک افت قیمت و گردش سریع سرمایه",
    color: "bg-purple-50 text-purple-700 border-purple-200",
  },
];

const CORE_FEATURES = [
  {
    icon: Zap,
    title: "⚡ سرعت ماورایی (۰ ثانیه تاخیر VIP)",
    desc: "پایش مداوم بازار تربت‌حیدریه بدون وقفه. به محض اینکه آگهی در دیوار منتشر شود، سریع‌تر از هر کس دیگری روی گوشی شماست.",
  },
  {
    icon: Camera,
    title: "📸 ارسال عکس خودرو در بله و تلگرام",
    desc: "بدون نیاز به باز کردن مرورگر یا سایت، رخ، تمیزی و سلامت ظاهری خودرو را مستقیماً با دکمه شیشه‌ای تماس در پیام‌رسان ببینید.",
  },
  {
    icon: Flame,
    title: "🔥 رادار آگهی‌های «پول‌لازم و فروش فوری»",
    desc: "هوش مصنوعی سامانه متن آگهی‌ها را تحلیل کرده و فروشندگان مضطر (پاس چک، مسافرت، پول لازم) را فوراً شناسایی و به شما نشان می‌دهد.",
  },
  {
    icon: ShieldCheck,
    title: "🛡️ فیلتر شاسی پلمپ و بدون رنگ",
    desc: "فقط خودروهای بدون ضربه و شاسی سالم را شکار کنید. خودروهای تصادفی یا نامطمئن به راحتی با یک کلیک فیلتر می‌شوند.",
  },
  {
    icon: TrendingDown,
    title: "📉 ردیاب کاهش قیمت فروشنده",
    desc: "وقتی فروشنده‌ای قیمت آگهی خود را چند میلیون تومان پایین بیاورد، فوراً پیام می‌گیرید تا بهترین تخفیف پای معامله را بگیرید.",
  },
  {
    icon: Copy,
    title: "📋 تولید بنر آماده استوری و کانال گالری",
    desc: "با یک کلیک، متن جذاب آگهی را بدون اطلاعات فروشنده قبلی و با شماره تماس و نام گالری خودتان کپی کنید و در اینستاگرام یا کانال بگذارید.",
  },
  {
    icon: Calculator,
    title: "🧮 ماشین‌حساب هوشمند سود و کارشناسی",
    desc: "محاسبه دقیق ارزش منصفانه در بازار تربت، خواب سرمایه، هزینه سرپا کردن خودرو و پیش‌بینی سود خالص حاصل از معامله.",
  },
  {
    icon: ListChecks,
    title: "🚫 حذف هوشمند آگهی‌های فیک، حواله و فضایی",
    desc: "آگهی‌های کلاهبرداری، پیش‌فروش، حواله و قیمت‌های غیرواقعی خودکار حذف می‌شوند تا وقت باارزش شما تلف نشود.",
  },
];

const FAQS = [
  {
    q: "آیا واقعاً می‌توان با این سامانه سود بالا کرد؟",
    a: "بله، در بازار پرنوسان خودروی تربت‌حیدریه، روزانه افرادی هستند که به دلیل پاس کردن چک، بدهی یا مهاجرت، خودروی خود را ۱۵ تا ۴۰ میلیون تومان زیر قیمت واقعی آگهی می‌کنند. این خودروها معمولاً ظرف ۳ الی ۱۰ دقیقه به فروش می‌رسند. رادار خودرو در ثانیه اول شما را باخبر می‌کند تا قبل از اشغال شدن تلفن، معامله را قطعی کنید.",
  },
  {
    q: "سرعت ارسال هشدارها چقدر است؟",
    a: "سیستم رادار هر ۶۰ ثانیه کل بازار تربت را اسکن می‌کند و به محض ثبت آگهی، نوتیفیکیشن ربات بله و تلگرام به همراه عکس و دکمه تماس ارسال می‌شود.",
  },
  {
    q: "اتصال به ربات بله و تلگرام چگونه انجام می‌شود؟",
    a: "خیلی راحت! پس از ثبت‌نام، یک کد عددی ساده به شما داده می‌شود. کافیست آن کد را به ربات ارسال کنید تا اتصال در ۱ ثانیه برقرار شود.",
  },
  {
    q: "آیا برای شروع باید هزینه‌ای پرداخت کنم؟",
    a: "خیر! برای شروع می‌توانید از دوره تست رایگان استفاده کنید، قدرت و سرعت سامانه را بررسی کنید و پس از اطمینان اشتراک خود را فعال نمایید.",
  },
  {
    q: "شماره پشتیبانی سامانه چیست؟",
    a: "جهت مشاوره، ثبت اشتراک و هرگونه راهنمایی با شماره 09999212209 (حقدادی) تماس بگیرید یا در تلگرام و بله پیام دهید.",
  },
];

export default async function Home() {
  if (await getSessionUser()) redirect("/dashboard");

  return (
    <div className="min-h-dvh bg-gradient-to-b from-paper via-surface to-paper text-ink selection:bg-brand-500 selection:text-white">
      {/* هدر سایت */}
      <header className="sticky top-0 z-30 border-b border-line/80 bg-surface/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5">
          <Logo />
          <div className="flex items-center gap-3">
            <a
              href="tel:09999212209"
              className="hidden sm:flex items-center gap-1.5 text-xs font-bold text-muted hover:text-brand-700 transition-colors bg-paper px-3 py-1.5 rounded-lg border border-line"
            >
              <PhoneCall className="size-3.5 text-brand-600" />
              <span>پشتیبانی: ۰۹۹۹۹۲۱۲۲۰۹ (حقدادی)</span>
            </a>
            <LinkButton href="/login" variant="secondary" className="text-xs sm:text-sm">
              ورود به سامانه
            </LinkButton>
            <LinkButton href="/register" className="text-xs sm:text-sm font-bold shadow-md shadow-brand-500/20">
              شروع رایگان
            </LinkButton>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-20 px-4 pb-24 pt-8 sm:pt-14">
        {/* بخش اصلی (Hero Section) */}
        <section className="text-center space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50/80 px-4 py-1.5 text-xs font-bold text-brand-800 shadow-sm">
            <Sparkles className="size-4 text-amber-500" />
            <span>سامانه هوشمند دیده‌بانی و شکار خودرو — ویژه بازار تربت‌حیدریه</span>
          </div>

          <h1 className="text-3xl font-black leading-tight tracking-tight sm:text-5xl lg:text-6xl text-ink">
            فرصت‌های خرید خودرو را
            <br />
            <span className="bg-gradient-to-l from-brand-600 to-amber-600 bg-clip-text text-transparent">
              قبل از بقیه ببینید و شکار کنید!
            </span>
          </h1>

          <p className="mx-auto max-w-3xl text-sm sm:text-base leading-relaxed text-muted">
            اولین نفری باشید که خودروهای زیر قیمت، بدون رنگ، شاسی پلمپ و فروش فوری‌های بازار تربت‌حیدریه را پیدا می‌کند.
            دریافت آنی آگهی‌های دیوار و شیپور با عکس واقعی خودرو روی پیام‌رسان بله و تلگرام، قبل از اینکه خط فروشنده اشغال شود!
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Link
              href="/register"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-6 py-3.5 text-sm sm:text-base font-black text-white shadow-lg shadow-brand-500/30 hover:bg-brand-700 transition-all active:scale-95"
            >
              <span>شروع {formatNumber(TRIAL_DAYS)} روز تست رایگان سامانه</span>
              <ArrowLeft className="size-4" />
            </Link>
            <a
              href="#pricing"
              className="w-full sm:w-auto inline-flex items-center justify-center rounded-xl border border-line bg-surface px-6 py-3.5 text-sm sm:text-base font-bold text-ink hover:bg-paper transition-all"
            >
              مشاهده پلن‌ها و امکانات
            </a>
          </div>

          {/* شاخص‌های اعتماد و سرعت */}
          <div className="pt-6 grid grid-cols-2 md:grid-cols-4 gap-3 text-right">
            <div className="rounded-xl border border-line bg-surface p-3.5 shadow-sm">
              <span className="block text-xl font-black text-brand-700">⚡ ۰ ثانیه</span>
              <span className="text-xs text-muted">سرعت ارسال آگهی VIP</span>
            </div>
            <div className="rounded-xl border border-line bg-surface p-3.5 shadow-sm">
              <span className="block text-xl font-black text-emerald-600">📸 با عکس خودرو</span>
              <span className="text-xs text-muted">در ربات بله و تلگرام</span>
            </div>
            <div className="rounded-xl border border-line bg-surface p-3.5 shadow-sm">
              <span className="block text-xl font-black text-amber-600">🔥 رادار فوری</span>
              <span className="text-xs text-muted">تشخیص پول‌لازم و پاس چک</span>
            </div>
            <div className="rounded-xl border border-line bg-surface p-3.5 shadow-sm">
              <span className="block text-xl font-black text-indigo-600">🛡️ شاسی پلمپ</span>
              <span className="text-xs text-muted">فیلتر ماشین‌های سالم و بی‌رنگ</span>
            </div>
          </div>
        </section>

        {/* بخش محاسبه سود واقعی (ROI Calculation) */}
        <section className="rounded-3xl border-2 border-brand-200 bg-gradient-to-br from-brand-900 via-brand-950 to-slate-900 p-6 sm:p-10 text-white shadow-2xl relative overflow-hidden">
          <div className="absolute -left-12 -bottom-12 size-60 rounded-full bg-brand-500/10 blur-3xl pointer-events-none" />
          <div className="relative z-10 space-y-6">
            <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
              <Coins className="size-5" />
              <span>چقدر می‌توانید با این سامانه سود کنید؟</span>
            </div>

            <h2 className="text-2xl sm:text-4xl font-black leading-snug">
              یک حساب سرانگشتی اما کاملاً واقعی از سودآوری شما!
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
              <div className="rounded-2xl bg-white/10 p-5 backdrop-blur-sm border border-white/15">
                <span className="text-xs text-slate-300">هزینه اشتراک ماهانه (پلن شکارچی):</span>
                <p className="mt-2 text-2xl font-black text-amber-300">۷۹۰ هزار تومان</p>
                <p className="mt-2 text-xs text-slate-300 leading-relaxed">
                  کمتر از هزینه چند لیتر بنزین و بسیار ارزان‌تر از حقوق یک شاگرد یا دیده‌بان شخصی!
                </p>
              </div>

              <div className="rounded-2xl bg-white/10 p-5 backdrop-blur-sm border border-white/15">
                <span className="text-xs text-slate-300">اگر در ماه فقط ۱ ماشین زیر قیمت بخرید:</span>
                <p className="mt-2 text-2xl font-black text-emerald-400">۱۵ تا ۳۵ میلیون تومان</p>
                <p className="mt-2 text-xs text-slate-300 leading-relaxed">
                  فروشنده‌ای که پاس چک دارد و ماشینش را ۱۰ تا ۲۰ میلیون زیر قیمت بازار آگهی کرده است.
                </p>
              </div>

              <div className="rounded-2xl bg-gradient-to-br from-amber-500/20 to-brand-500/30 p-5 backdrop-blur-sm border border-amber-400/40">
                <span className="text-xs text-amber-200">سود خالص و بازگشت سرمایه شما:</span>
                <p className="mt-2 text-2xl font-black text-white">بیش از ۲۰ تا ۴۰ برابر!</p>
                <p className="mt-2 text-xs text-slate-200 leading-relaxed">
                  با سود اولین معامله، نه تنها هزینه اشتراک جبران می‌شود بلکه درآمد قابل‌توجهی کسب می‌کنید.
                </p>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-slate-300 text-center pt-2">
              💡 <span className="font-bold text-white">نتیجه‌گیری:</span> برای نمایشگاه‌دار و خریدار خودرو، این سامانه هزینه نیست؛ بلکه پرسودترین سرمایه‌گذاری ماهانه شماست!
            </p>
          </div>
        </section>

        {/* این سامانه برای چه کسانی مفید و سودآور است؟ */}
        <section className="space-y-8">
          <div className="text-center space-y-2">
            <span className="text-xs font-bold text-brand-700 tracking-wider">جامعه هدف</span>
            <h2 className="text-2xl sm:text-3xl font-black text-ink">این سامانه برای چه کسانی مناسب است؟</h2>
            <p className="text-sm text-muted max-w-2xl mx-auto">
              طراحی شده متناسب با نیازهای بومی خریداران، گالری‌ها و کاسبان بازار خودرو در تربت‌حیدریه
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {AUDIENCES.map((item, idx) => {
              const Icon = item.icon;
              return (
                <div
                  key={idx}
                  className="rounded-2xl border border-line bg-surface p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <span className={`grid size-11 place-items-center rounded-xl border ${item.color}`}>
                        <Icon className="size-5" />
                      </span>
                      <div>
                        <h3 className="font-bold text-base text-ink">{item.title}</h3>
                        <p className="text-xs text-muted">{item.subtitle}</p>
                      </div>
                    </div>
                    <p className="text-sm text-ink/80 leading-relaxed">{item.desc}</p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-line/60 flex items-center gap-2 text-xs font-bold text-emerald-800 bg-emerald-50/60 p-2.5 rounded-xl border border-emerald-200/60">
                    <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
                    <span>مزیت مستقیم: {item.benefit}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* کاربردها و امکانات فنی سامانه */}
        <section className="space-y-8">
          <div className="text-center space-y-2">
            <span className="text-xs font-bold text-brand-700 tracking-wider">سلاح‌های مخفی شما در بازار</span>
            <h2 className="text-2xl sm:text-3xl font-black text-ink">امکاناتی که شما را از تمام رقبا جلو می‌اندازد</h2>
            <p className="text-sm text-muted max-w-2xl mx-auto">
              هر ابزاری که یک معامله‌گر حرفه‌ای خودرو نیاز دارد، در یک پلتفرم یکپارچه
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {CORE_FEATURES.map((feature, idx) => {
              const Icon = feature.icon;
              return (
                <Card key={idx} className="p-5 flex flex-col justify-between hover:border-brand-300 transition-all">
                  <div className="space-y-2.5">
                    <div className="grid size-10 place-items-center rounded-xl bg-brand-50 text-brand-700 mb-2">
                      <Icon className="size-5" />
                    </div>
                    <h3 className="font-bold text-sm text-ink">{feature.title}</h3>
                    <p className="text-xs text-muted leading-relaxed">{feature.desc}</p>
                  </div>
                </Card>
              );
            })}
          </div>
        </section>

        {/* جدول قیمت‌ها و پلن‌ها */}
        <section id="pricing" className="space-y-10 scroll-mt-20">
          <div className="text-center space-y-2">
            <span className="text-xs font-bold text-brand-700 tracking-wider">شفاف و متناسب با رشد کار شما</span>
            <h2 className="text-2xl sm:text-3xl font-black text-ink">پلن‌های اشتراک سامانه رادار خودرو</h2>
            <p className="text-sm text-muted max-w-2xl mx-auto">
              برای شروع می‌توانید از پلن پایه استفاده کنید و وقتی سرعت سودآوری سامانه را چشیدید، با پلن حرفه‌ای شکارچی بازار همیشه یک گام جلوتر باشید!
            </p>
          </div>

          {/* کارت‌های ۳ پلن با دکمه ثبت نام */}
          <PricingCards showActionButtons={true} />

          {/* جدول مقایسه کامل جزئیات پلن‌ها */}
          <div className="space-y-4 pt-6">
            <div className="text-center space-y-1">
              <h3 className="text-lg sm:text-xl font-bold text-ink">جدول مقایسه دقیق امکانات پلن‌ها</h3>
              <p className="text-xs text-muted">تمام امکانات را در یک نگاه بررسی کنید و بهترین گزینه را انتخاب نمایید</p>
            </div>
            <PlanComparisonTable />
          </div>
        </section>

        {/* نحوه شروع در ۳ قدم ساده */}
        <section className="rounded-3xl border border-line bg-surface p-6 sm:p-10 shadow-sm space-y-6">
          <div className="text-center space-y-2">
            <h2 className="text-xl sm:text-2xl font-black text-ink">شروع کار در ۳ قدم بسیار ساده</h2>
            <p className="text-xs sm:text-sm text-muted">بدون نیاز به دانش فنی، در کمتر از ۱ دقیقه متصل شوید</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
            <div className="rounded-2xl bg-paper p-5 border border-line text-center space-y-2">
              <div className="mx-auto grid size-10 place-items-center rounded-full bg-brand-600 text-white font-black text-sm">
                ۱
              </div>
              <h3 className="font-bold text-sm">ثبت‌نام سریع</h3>
              <p className="text-xs text-muted leading-relaxed">
                تنها با نام کاربری و شماره تماس، ثبت‌نام خود را در کمتر از ۳۰ ثانیه انجام دهید.
              </p>
            </div>

            <div className="rounded-2xl bg-paper p-5 border border-line text-center space-y-2">
              <div className="mx-auto grid size-10 place-items-center rounded-full bg-brand-600 text-white font-black text-sm">
                ۲
              </div>
              <h3 className="font-bold text-sm">اتصال به ربات بله یا تلگرام</h3>
              <p className="text-xs text-muted leading-relaxed">
                کد عددی ۶ رقمی اختصاصی خود را در ربات پیام دهید تا سیستم به اکانت شما وصل شود.
              </p>
            </div>

            <div className="rounded-2xl bg-paper p-5 border border-line text-center space-y-2">
              <div className="mx-auto grid size-10 place-items-center rounded-full bg-brand-600 text-white font-black text-sm">
                ۳
              </div>
              <h3 className="font-bold text-sm">تنظیم هشدار و دریافت شکارها</h3>
              <p className="text-xs text-muted leading-relaxed">
                خودروهای مدنظرتان را ثبت کنید و به محض انتشار آگهی، اعلان با عکس دریافت نمایید.
              </p>
            </div>
          </div>
        </section>

        {/* بخش سوالات متداول (FAQ) */}
        <section className="space-y-6">
          <div className="text-center space-y-2">
            <span className="text-xs font-bold text-brand-700 tracking-wider">راهنمای خریداران</span>
            <h2 className="text-xl sm:text-2xl font-black text-ink">سوالات متداول شما</h2>
          </div>

          <div className="grid gap-3 max-w-3xl mx-auto">
            {FAQS.map((faq, idx) => (
              <details
                key={idx}
                className="group rounded-2xl border border-line bg-surface p-4 transition-all open:border-brand-300 open:shadow-sm"
              >
                <summary className="flex cursor-pointer items-center justify-between font-bold text-sm text-ink">
                  <span>{faq.q}</span>
                  <span className="text-brand-600 transition-transform group-open:rotate-180">▼</span>
                </summary>
                <p className="mt-3 text-xs sm:text-sm text-muted leading-relaxed border-t border-line/60 pt-3">
                  {faq.a}
                </p>
              </details>
            ))}
          </div>
        </section>

        {/* بخش پشتیبانی و تماس با مدیریت */}
        <section className="rounded-3xl border-2 border-brand-500 bg-gradient-to-r from-brand-50 via-paper to-amber-50/50 p-6 sm:p-10 text-center space-y-4 shadow-sm">
          <h2 className="text-xl sm:text-2xl font-black text-ink">نیاز به راهنمایی یا مشاوره اختصاصی دارید؟</h2>
          <p className="text-xs sm:text-sm text-muted max-w-xl mx-auto">
            مدیریت سامانه آماده پاسخگویی به سوالات شما و ارائه مشاوره برای بهترین استراتژی خرید و فروش در تربت‌حیدریه است.
          </p>
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <a
              href="tel:09999212209"
              className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-6 py-3 text-sm font-black text-white hover:bg-brand-700 shadow-md shadow-brand-500/20"
            >
              <PhoneCall className="size-4" />
              <span>تماس مستقیم: ۰۹۹۹۹۲۱۲۲۰۹ (حقدادی)</span>
            </a>
            <LinkButton href="/register" variant="secondary" className="text-sm font-bold">
              ثبت‌نام و شروع تست رایگان
            </LinkButton>
          </div>
        </section>
      </main>

      {/* فوتر */}
      <footer className="border-t border-line bg-surface py-8 text-center text-xs text-muted space-y-2">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 flex-col sm:flex-row gap-4">
          <Logo />
          <div>
            سامانه تخصصی رادار خودرو تربت‌حیدریه — پشتیبانی: ۰۹۹۹۹۲۱۲۲۰۹ (حقدادی)
          </div>
          <div className="flex gap-4">
            <Link href="/login" className="hover:text-brand-600">ورود</Link>
            <Link href="/register" className="hover:text-brand-600">ثبت‌نام</Link>
            <a href="#pricing" className="hover:text-brand-600">تعرفه‌ها</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
