"use client";

import { useState } from "react";
import { ChevronDown, HelpCircle } from "lucide-react";

interface FAQItem {
  q: string;
  a: string;
}

const FAQS: FAQItem[] = [
  {
    q: "رادار چگونه آگهی‌های خودرو را پایش می‌کند؟",
    a: "سامانه رادار به صورت خودکار و شبانه‌روزی آگهی‌های منتشرشده در دیوار و شیپور را بررسی می‌کند. الگوریتم هوشمند سامانه فیلترهای شما (مدل، سال، شاسی پلمپ، بدون رنگ و عبارات فروش فوری) را تطبیق داده و آگهی‌های منتخب را بلافاصله برای شما ارسال می‌کند.",
  },
  {
    q: "آیا استفاده از رادار رایگان است؟",
    a: "بله، برای تمام کاربران جدید یک دوره آزمایشی رایگان ۱۴ روزه بدون نیاز به وارد کردن اطلاعات بانکی فعال می‌شود. شما می‌توانید تمام امکانات سامانه را بدون محدودیت در این مدت آزمایش کنید.",
  },
  {
    q: "هشدارها از چه طریقی ارسال می‌شوند؟",
    a: "هشدارها به صورت آنی همراه با تصویر خودرو، خلاصه مشخصات و دکمه لینک مستقیم در پیام‌رسان بله و تلگرام ارسال می‌شوند. همچنین می‌توانید آگهی‌ها را مستقیماً داخل پنل کاربری مشاهده نمایید.",
  },
  {
    q: "آیا امکان تغییر فیلترها و خودروها وجود دارد؟",
    a: "بله، در هر لحظه می‌توانید از بخش «هشدارهای من» خودروها، سقف قیمت، شروط شاسی و فروش فوری را با یک لمس تغییر دهید یا هشدارهای جدیدی اضافه کنید.",
  },
  {
    q: "اگر دوره آزمایشی تمام شود چه اتفاقی می‌افتد؟",
    a: "پس از پایان ۱۴ روز، حساب شما مسدود نمی‌شود اما ارسال هشدارهای خودکار متوقف می‌گردد تا در صورت تمایل با انتخاب یکی از پلن‌های اشتراک ماهانه (پایه، حرفه‌ای یا سازمانی) آن را تمدید فرمایید.",
  },
  {
    q: "در صورت بروز مشکل چگونه پشتیبانی بگیرم؟",
    a: "تیم پشتیبانی به صورت مستقیم از طریق تماس تلفنی با شماره ۰۹۹۹۹۲۱۲۲۰۹ (حقدادی) یا پیام در پیام‌رسان‌های بله و تلگرام پاسخگوی شماست.",
  },
];

export function LandingFAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggle = (idx: number) => {
    setOpenIndex(openIndex === idx ? null : idx);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {FAQS.map((faq, idx) => {
        const isOpen = openIndex === idx;
        return (
          <div
            key={idx}
            className={`rounded-2xl border transition-all duration-200 overflow-hidden bg-white ${
              isOpen ? "border-blue-300 shadow-md ring-1 ring-blue-100" : "border-slate-200 hover:border-slate-300 shadow-xs"
            }`}
          >
            <button
              onClick={() => toggle(idx)}
              className="flex w-full items-center justify-between p-4 sm:p-5 text-right font-bold text-slate-800 hover:text-blue-600 transition-colors gap-3"
            >
              <div className="flex items-center gap-2.5">
                <HelpCircle className={`size-4.5 shrink-0 transition-colors ${isOpen ? "text-blue-600" : "text-slate-400"}`} />
                <span className="text-sm sm:text-base leading-snug">{faq.q}</span>
              </div>
              <ChevronDown
                className={`size-4.5 shrink-0 text-slate-400 transition-transform duration-200 ${
                  isOpen ? "rotate-180 text-blue-600" : ""
                }`}
              />
            </button>
            {isOpen && (
              <div className="px-5 pb-5 pt-1 text-xs sm:text-sm leading-relaxed text-slate-600 border-t border-slate-100 bg-slate-50/50">
                {faq.a}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
