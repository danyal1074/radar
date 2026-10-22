import { Bot, CheckCircle2, MessageSquare, Send } from "lucide-react";
import { Badge, Card } from "./ui";

export function BotLinkCard({
  code,
  isBaleLinked,
  isTelegramLinked,
  isRubikaLinked,
}: {
  code: string;
  isBaleLinked: boolean;
  isTelegramLinked: boolean;
  isRubikaLinked?: boolean;
}) {
  return (
    <Card className="mb-6 overflow-hidden border-brand-200 bg-gradient-to-br from-surface to-paper p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-3">
        <div className="flex items-center gap-2">
          <div className="flex size-9 items-center justify-center rounded-xl bg-brand-600 text-white shadow-sm">
            <Bot className="size-5" />
          </div>
          <div>
            <h3 className="font-bold text-ink">اتصال ربات پیام‌رسان‌ها (بله، روبیکا، تلگرام)</h3>
            <p className="text-xs text-muted">
              هشدارهای سفارشی و فرصت‌های خرید لحظه‌ای به ربات پیام‌رسان شما ارسال می‌شود
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={isBaleLinked ? "good" : "neutral"} className="gap-1">
            {isBaleLinked ? <CheckCircle2 className="size-3" /> : null}
            بله: {isBaleLinked ? "متصل" : "غیرمتصل"}
          </Badge>
          <Badge tone={isRubikaLinked ? "good" : "neutral"} className="gap-1">
            {isRubikaLinked ? <CheckCircle2 className="size-3" /> : null}
            روبیکا: {isRubikaLinked ? "متصل" : "غیرمتصل"}
          </Badge>
          <Badge tone={isTelegramLinked ? "good" : "neutral"} className="gap-1">
            {isTelegramLinked ? <CheckCircle2 className="size-3" /> : null}
            تلگرام: {isTelegramLinked ? "متصل" : "غیرمتصل"}
          </Badge>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-12 items-center">
        <div className="md:col-span-4 rounded-xl border border-dashed border-brand-300 bg-brand-50/50 p-4 text-center">
          <p className="text-xs font-medium text-brand-900">کد اختصاصی اتصال شما</p>
          <div className="mt-1 font-mono text-2xl font-black tracking-wider text-brand-700 ltr-num select-all">
            {code}
          </div>
          <p className="mt-1 text-[11px] text-muted">این کد مخصوص حساب شماست</p>
        </div>

        <div className="md:col-span-8 space-y-2 text-xs text-ink/80 leading-relaxed">
          <p className="font-semibold text-ink text-sm">نحوه اتصال ربات در چند ثانیه:</p>
          <div className="flex items-start gap-2">
            <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-brand-100 font-bold text-brand-700 text-[11px]">
              ۱
            </span>
            <p>
              وارد ربات در <strong>بله</strong> (<code className="font-mono text-brand-700">@radarcar_bot</code>)، <strong>روبیکا</strong> (<code className="font-mono text-brand-700">@radarcarbot</code>) یا <strong>تلگرام</strong> شوید.
            </p>
          </div>
          <div className="flex items-start gap-2">
            <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-brand-100 font-bold text-brand-700 text-[11px]">
              ۲
            </span>
            <p>
              تنها کافیست <strong>کد عددی فوق</strong> را کپی کرده و به ربات بفرستید:{" "}
              <strong className="rounded bg-paper px-2.5 py-1 font-mono text-base font-bold text-brand-700 border border-brand-300 ltr-num inline-block select-all">
                {code}
              </strong>
              <span className="block mt-1 text-[11px] text-muted">
                (نیازی به تایپ دستور یا هیچ کلمه اضافه‌ای نیست؛ فقط ارسال عدد کافیست)
              </span>
            </p>
          </div>
          <div className="flex items-start gap-2">
            <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-brand-100 font-bold text-brand-700 text-[11px]">
              ۳
            </span>
            <p>
              ربات بلافاصله اتصال حساب شما را تایید کرده و از آن پس تمام آگهی‌های مطابق فیلتر شما را بلافاصله ارسال می‌کند.
            </p>
          </div>

          <div className="mt-3 flex flex-wrap gap-2 pt-1">
            <a
              href={`https://ble.ir/radarcar_bot`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 transition"
            >
              <MessageSquare className="size-3.5" />
              ربات بله (@radarcar_bot)
            </a>
            <a
              href={`https://rubika.ir/radarcarbot`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg bg-purple-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-purple-700 transition"
            >
              <Bot className="size-3.5" />
              ربات روبیکا (@radarcarbot)
            </a>
            <a
              href={`https://t.me/radarcar_bot?start=${code}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-sky-700 transition"
            >
              <Send className="size-3.5" />
              ربات تلگرام
            </a>
            <a
              href={`https://eitaa.com/radarcarr`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-amber-700 transition"
            >
              <MessageSquare className="size-3.5" />
              کانال رسمی ایتا (@radarcarr)
            </a>
          </div>
        </div>
      </div>
    </Card>
  );
}
