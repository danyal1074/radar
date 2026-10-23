"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Copy,
  ExternalLink,
  Flame,
  Key,
  Layers,
  MessageSquare,
  MessageSquareShare,
  Phone,
  Play,
  RefreshCw,
  Send,
  Shield,
  ShieldAlert,
  Sparkles,
  StopCircle,
} from "lucide-react";
import { Badge, Button, Card, PageHeader } from "@/components/ui";
import { formatTomanReadable } from "@/lib/money";
import type { Listing } from "@/lib/types";
import type { MarketingConfig, MarketingLogItem } from "@/lib/marketing/types";
import {
  saveMarketingConfigAction,
  requestDivarOtpAction,
  verifyDivarOtpAction,
  saveManualDivarTokenAction,
  requestSheypoorOtpAction,
  verifySheypoorOtpAction,
  sendSingleChatMessageAction,
} from "./actions";

interface MarketingClientProps {
  config: MarketingConfig;
  listings: Listing[];
  logs: MarketingLogItem[];
  divarSentToday: number;
  sheypoorSentToday: number;
}

export function MarketingClient({
  config: initialConfig,
  listings,
  logs: initialLogs,
  divarSentToday: initialDivarSent,
  sheypoorSentToday: initialSheypoorSent,
}: MarketingClientProps) {
  const [activeTab, setActiveTab] = useState<"listings" | "settings" | "logs">("listings");
  const [config, setConfig] = useState(initialConfig);
  const [logs, setLogs] = useState(initialLogs);
  const [divarSent, setDivarSent] = useState(initialDivarSent);
  const [sheypoorSent, setSheypoorSent] = useState(initialSheypoorSent);

  // States for Divar auth
  const [divarPhoneInput, setDivarPhoneInput] = useState(config.divarPhone || "");
  const [divarCodeInput, setDivarCodeInput] = useState("");
  const [divarOtpSent, setDivarOtpSent] = useState(false);
  const [manualDivarToken, setManualDivarToken] = useState("");

  // States for Sheypoor auth
  const [sheypoorPhoneInput, setSheypoorPhoneInput] = useState(config.sheypoorPhone || "");
  const [sheypoorCodeInput, setSheypoorCodeInput] = useState("");
  const [sheypoorOtpSent, setSheypoorOtpSent] = useState(false);

  // Settings form states
  const [adLinkInput, setAdLinkInput] = useState(config.adLink || "");
  const [sheypoorAdLinkInput, setSheypoorAdLinkInput] = useState(config.sheypoorAdLink || "");
  const [templateInput, setTemplateInput] = useState(config.template);
  const [dailyLimitInput, setDailyLimitInput] = useState(config.dailyLimit || 25);
  const [delaySecondsInput, setDelaySecondsInput] = useState(config.delaySeconds || 60);

  // Filter state for listings
  const [sourceFilter, setSourceFilter] = useState<"all" | "divar" | "sheypoor">("all");
  const [cityFilter, setCityFilter] = useState<string>("all");

  // Notifications / feedback
  const [notification, setNotification] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [sendingId, setSendingId] = useState<string | null>(null);

  // Automated batch campaign runner state
  const [isCampaignRunning, setIsCampaignRunning] = useState(false);
  const [campaignProgress, setCampaignProgress] = useState<{ current: number; total: number; message: string } | null>(
    null
  );

  const [isPending, startTransition] = useTransition();

  const showNotice = (type: "success" | "error", text: string) => {
    setNotification({ type, text });
    setTimeout(() => setNotification(null), 5000);
  };

  const alreadyMessagedSet = new Set(logs.filter((l) => l.status === "sent").map((l) => l.postToken));

  // تطبیق نام شهر با در نظر گرفتن نیم‌فاصله و فاصله استاندارد
  const isCityMatch = (listingCity?: string | null, filter?: string) => {
    if (!filter || filter === "all") return true;
    if (!listingCity) return false;
    const cleanL = listingCity.replace(/[\s\u200c]/g, "");
    const cleanF = filter.replace(/[\s\u200c]/g, "");
    return cleanL.includes(cleanF) || cleanF.includes(cleanL);
  };

  // Filter listings
  const filteredListings = listings.filter((l) => {
    if (sourceFilter !== "all" && l.source !== sourceFilter) return false;
    if (!isCityMatch(l.city, cityFilter)) return false;
    return true;
  });

  // ── Actions ──

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const fd = new FormData();
      fd.append("adLink", adLinkInput);
      fd.append("sheypoorAdLink", sheypoorAdLinkInput);
      fd.append("template", templateInput);
      fd.append("dailyLimit", String(dailyLimitInput));
      fd.append("delaySeconds", String(delaySecondsInput));

      const res = await saveMarketingConfigAction(fd);
      if (res.ok) {
        showNotice("success", res.message || "تنظیمات با موفقیت ذخیره شد.");
      } else {
        showNotice("error", "خطا در ذخیره تنظیمات.");
      }
    });
  };

  const handleSendDivarOtp = async () => {
    if (!divarPhoneInput) return showNotice("error", "شماره موبایل را وارد کنید.");
    startTransition(async () => {
      const fd = new FormData();
      fd.append("phone", divarPhoneInput);
      const res = await requestDivarOtpAction(fd);
      if (res.ok) {
        setDivarOtpSent(true);
        showNotice("success", res.message || "کد تایید پیامک شد.");
      } else {
        showNotice("error", res.message || "خطا در ارسال کد.");
      }
    });
  };

  const handleVerifyDivarOtp = async () => {
    if (!divarCodeInput) return showNotice("error", "کد تایید را وارد کنید.");
    startTransition(async () => {
      const fd = new FormData();
      fd.append("phone", divarPhoneInput);
      fd.append("code", divarCodeInput);
      const res = await verifyDivarOtpAction(fd);
      if (res.ok && res.token) {
        setConfig((prev) => ({ ...prev, divarPhone: divarPhoneInput, divarToken: res.token! }));
        setDivarOtpSent(false);
        setDivarCodeInput("");
        showNotice("success", "ورود به حساب دیوار موفقیت‌آمیز بود و توکن فعال شد!");
      } else {
        showNotice("error", res.message || "کد نامعتبر است.");
      }
    });
  };

  const handleSaveManualDivarToken = async () => {
    if (!manualDivarToken) return showNotice("error", "توکن را وارد کنید.");
    startTransition(async () => {
      const fd = new FormData();
      fd.append("phone", divarPhoneInput);
      fd.append("token", manualDivarToken);
      const res = await saveManualDivarTokenAction(fd);
      if (res.ok) {
        setConfig((prev) => ({ ...prev, divarToken: manualDivarToken }));
        setManualDivarToken("");
        showNotice("success", "توکن دستی دیوار با موفقیت ثبت شد.");
      }
    });
  };

  const handleSendSingle = async (listing: Listing) => {
    setSendingId(listing.id);
    try {
      const res = await sendSingleChatMessageAction(listing.id);
      if (res.ok) {
        showNotice("success", res.message || "پیام با موفقیت در چت ارسال شد.");
        if (listing.source === "divar") setDivarSent((p) => p + 1);
        else setSheypoorSent((p) => p + 1);

        // Update local logs
        setLogs((prev) => [
          {
            id: `mkt_${Date.now()}`,
            listingId: listing.id,
            source: listing.source === "sheypoor" ? "sheypoor" : "divar",
            postToken: listing.source_post_id,
            carTitle: listing.title,
            priceToman: listing.price_toman,
            city: listing.city || "مشهد",
            messageText: res.messageText || "",
            status: "sent",
            sentAt: new Date().toISOString(),
          },
          ...prev,
        ]);
      } else {
        showNotice("error", res.message || "ارسال پیام با خطا مواجه شد.");
      }
    } finally {
      setSendingId(null);
    }
  };

  const handleCopyAndOpenChat = (listing: Listing) => {
    const directUrl =
      listing.source === "divar"
        ? `https://divar.ir/v/-/${listing.source_post_id}?openChat=true`
        : `https://www.sheypoor.com/${listing.source_post_id}`;

    // Personalize text
    const priceReadable = formatTomanReadable(listing.price_toman);
    const text = templateInput
      .replace(/\{سلام\|درود\|وقت بخیر\}/g, "سلام")
      .replace(/\{بزرگوار\|دوست عزیز\|جناب\}/g, "دوست عزیز")
      .replace(/\{car_title\}/g, listing.title)
      .replace(/\{car_price\}/g, priceReadable)
      .replace(/\{city\}/g, listing.city || "مشهد")
      .replace(/\{ad_link\}/g, adLinkInput.trim());

    navigator.clipboard.writeText(text);
    showNotice("success", "متن پیام در کلیپ‌بورد کپی شد! در حال باز کردن صفحه چت...");
    window.open(directUrl, "_blank", "noopener,noreferrer");
  };

  // Automated Batch Campaign
  const handleStartBatchCampaign = async () => {
    const unmessaged = filteredListings.filter((l) => !alreadyMessagedSet.has(l.source_post_id));
    if (unmessaged.length === 0) {
      return showNotice("error", "هیچ آگهی جدیدی بدون پیام در این فیلتر وجود ندارد.");
    }

    const maxToSend = Math.min(unmessaged.length, Math.max(0, config.dailyLimit - divarSent));
    if (maxToSend <= 0) {
      return showNotice("error", "سقف ارسال مجاز روزانه امروز پر شده است.");
    }

    setIsCampaignRunning(true);
    showNotice("success", `کمپین ارسال آغاز شد. ارسال به ${maxToSend} خودرو با فاصله زمانی...`);

    for (let i = 0; i < maxToSend; i++) {
      const item = unmessaged[i];
      setCampaignProgress({
        current: i + 1,
        total: maxToSend,
        message: `در حال ارسال پیام به: ${item.title}...`,
      });

      await handleSendSingle(item);

      // Delay between sends (e.g. 45s) unless last item
      if (i < maxToSend - 1) {
        const waitMs = (config.delaySeconds || 45) * 1000;
        await new Promise((r) => setTimeout(r, waitMs));
      }
    }

    setIsCampaignRunning(false);
    setCampaignProgress(null);
    showNotice("success", "کمپین خودکار با موفقیت پایان یافت.");
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="تبلیغ و پیام‌رسان هوشمند چت"
        description="ارسال پیام و دعوت‌نامه به فروشندگان خودرو در دیوار و شیپور با ترفند معرفی لینک آگهی و سیستم ضد اسپم"
      />

      {/* اعلان‌های وضعیت */}
      {notification && (
        <div
          className={`flex items-center gap-2 rounded-xl p-3.5 text-xs font-semibold shadow-xs animate-in fade-in transition-all ${
            notification.type === "success"
              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
              : "bg-rose-50 text-rose-800 border border-rose-200"
          }`}
        >
          {notification.type === "success" ? (
            <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
          ) : (
            <AlertCircle className="size-4 shrink-0 text-rose-600" />
          )}
          <span>{notification.text}</span>
        </div>
      )}

      {/* کارت‌های خلاصه وضعیت روزانه */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card className="p-3.5 space-y-1">
          <div className="flex items-center justify-between text-xs text-muted">
            <span>چت دیوار امروز</span>
            <MessageSquare className="size-3.5 text-rose-600" />
          </div>
          <div className="text-xl font-black text-ink">
            {divarSent}{" "}
            <span className="text-xs font-normal text-muted">/ {config.dailyLimit} مجاز</span>
          </div>
          <div className="w-full bg-line rounded-full h-1.5 overflow-hidden mt-2">
            <div
              className="bg-rose-500 h-full rounded-full transition-all"
              style={{ width: `${Math.min(100, (divarSent / config.dailyLimit) * 100)}%` }}
            />
          </div>
        </Card>

        <Card className="p-3.5 space-y-1">
          <div className="flex items-center justify-between text-xs text-muted">
            <span>چت شیپور امروز</span>
            <MessageSquare className="size-3.5 text-blue-600" />
          </div>
          <div className="text-xl font-black text-ink">
            {sheypoorSent}{" "}
            <span className="text-xs font-normal text-muted">/ {config.dailyLimit} مجاز</span>
          </div>
          <div className="w-full bg-line rounded-full h-1.5 overflow-hidden mt-2">
            <div
              className="bg-blue-500 h-full rounded-full transition-all"
              style={{ width: `${Math.min(100, (sheypoorSent / config.dailyLimit) * 100)}%` }}
            />
          </div>
        </Card>

        <Card className="p-3.5 space-y-1">
          <div className="flex items-center justify-between text-xs text-muted">
            <span>وضعیت حساب دیوار</span>
            <Shield className="size-3.5 text-brand-600" />
          </div>
          <div className="text-sm font-bold text-ink flex items-center gap-1.5 pt-1">
            {config.divarToken ? (
              <>
                <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-emerald-700">متصل ({config.divarPhone || "اکانت"})</span>
              </>
            ) : (
              <>
                <span className="size-2 rounded-full bg-amber-500" />
                <span className="text-amber-700">نیاز به ورود</span>
              </>
            )}
          </div>
        </Card>

        <Card className="p-3.5 space-y-1">
          <div className="flex items-center justify-between text-xs text-muted">
            <span>کل پیام‌های ثبت‌شده</span>
            <Layers className="size-3.5 text-muted" />
          </div>
          <div className="text-xl font-black text-ink pt-1">{logs.length} پیام</div>
        </Card>
      </div>

      {/* تب‌های مدیریت */}
      <div className="flex border-b border-line gap-2 text-xs font-bold">
        <button
          type="button"
          onClick={() => setActiveTab("listings")}
          className={`flex items-center gap-2 pb-3 px-3 transition-colors border-b-2 ${
            activeTab === "listings"
              ? "border-brand-600 text-brand-700 font-black"
              : "border-transparent text-muted hover:text-ink"
          }`}
        >
          <Flame className="size-4" />
          <span>آگهی‌های آماده ارسال ({filteredListings.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("settings")}
          className={`flex items-center gap-2 pb-3 px-3 transition-colors border-b-2 ${
            activeTab === "settings"
              ? "border-brand-600 text-brand-700 font-black"
              : "border-transparent text-muted hover:text-ink"
          }`}
        >
          <Sparkles className="size-4" />
          <span>تنظیمات پیام و اتصال حساب‌ها</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("logs")}
          className={`flex items-center gap-2 pb-3 px-3 transition-colors border-b-2 ${
            activeTab === "logs"
              ? "border-brand-600 text-brand-700 font-black"
              : "border-transparent text-muted hover:text-ink"
          }`}
        >
          <Clock className="size-4" />
          <span>تاریخچه ارسال‌ها ({logs.length})</span>
        </button>
      </div>

      {/* ── تب ۱: لیست آگهی‌ها و ارسال پیام ── */}
      {activeTab === "listings" && (
        <div className="space-y-4">
          {/* نوار ابزار فیلتر و دکمه کمپین */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-surface-card p-3 rounded-xl border border-line">
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={sourceFilter}
                onChange={(e) => setSourceFilter(e.target.value as "all" | "divar" | "sheypoor")}
                className="rounded-lg border border-line bg-surface px-2.5 py-1.5 text-xs font-semibold"
              >
                <option value="all">همه منابع (دیوار و شیپور)</option>
                <option value="divar">فقط دیوار</option>
                <option value="sheypoor">فقط شیپور</option>
              </select>

              <select
                value={cityFilter}
                onChange={(e) => setCityFilter(e.target.value)}
                className="rounded-lg border border-line bg-surface px-2.5 py-1.5 text-xs font-semibold"
              >
                <option value="all">همه شهرها</option>
                <option value="مشهد">مشهد</option>
                <option value="تربت">تربت حیدریه و تربت جام</option>
                <option value="نیشابور">نیشابور</option>
                <option value="سبزوار">سبزوار</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              {!isCampaignRunning ? (
                <Button
                  type="button"
                  onClick={handleStartBatchCampaign}
                  disabled={!config.divarToken || divarSent >= config.dailyLimit}
                  className="gap-2 bg-brand-600 text-white hover:bg-brand-700 text-xs font-bold"
                >
                  <Play className="size-3.5 fill-white" />
                  شروع ارسال خودکار کمپین
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={() => setIsCampaignRunning(false)}
                  variant="secondary"
                  className="gap-2 text-rose-700 border-rose-300 text-xs font-bold"
                >
                  <StopCircle className="size-3.5" />
                  توقف کمپین
                </Button>
              )}
            </div>
          </div>

          {/* نوار وضعیت اجرای کمپین */}
          {campaignProgress && (
            <div className="bg-brand-50 border border-brand-200 rounded-xl p-3.5 flex items-center justify-between text-xs text-brand-900 animate-pulse">
              <div className="flex items-center gap-2">
                <RefreshCw className="size-4 animate-spin text-brand-600" />
                <span className="font-bold">{campaignProgress.message}</span>
              </div>
              <span className="font-mono bg-white px-2 py-0.5 rounded-md border border-brand-200">
                {campaignProgress.current} / {campaignProgress.total}
              </span>
            </div>
          )}

          {/* جدول یا لیست آگهی‌ها */}
          <div className="space-y-2.5">
            {filteredListings.slice(0, 50).map((listing) => {
              const isSent = alreadyMessagedSet.has(listing.source_post_id);
              const isCurrentlySending = sendingId === listing.id;

              return (
                <div
                  key={listing.id}
                  className={`flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl border bg-surface transition-all ${
                    isSent ? "border-emerald-200 bg-emerald-50/20 opacity-80" : "border-line hover:border-brand-300"
                  }`}
                >
                  {/* عکس و جزییات خودرو */}
                  <div className="flex items-center gap-3">
                    <div className="relative size-12 shrink-0 overflow-hidden rounded-lg bg-surface-card border border-line">
                      {listing.image_url ? (
                        <Image src={listing.image_url} alt={listing.title} fill className="object-cover" />
                      ) : (
                        <div className="flex size-full items-center justify-center text-[10px] text-muted">
                          بدون عکس
                        </div>
                      )}
                    </div>

                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-ink">{listing.title}</span>
                        <Badge tone={listing.source === "divar" ? "brand" : "neutral"} className="text-[10px] py-0 px-1.5">
                          {listing.source === "divar" ? "دیوار" : "شیپور"}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-muted">
                        <span>{listing.city || "مشهد"}</span>
                        <span>•</span>
                        <span className="font-bold text-brand-700">
                          {formatTomanReadable(listing.price_toman)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* دکمه‌های عملیاتی */}
                  <div className="flex items-center gap-2 mr-auto">
                    {isSent ? (
                      <span className="flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-100/70 px-2.5 py-1 rounded-lg">
                        <CheckCircle2 className="size-3.5" />
                        ارسال شد
                      </span>
                    ) : (
                      <>
                        {/* ارسال خودکار از طریق API */}
                        <button
                          type="button"
                          onClick={() => handleSendSingle(listing)}
                          disabled={isCurrentlySending || !config.divarToken}
                          title={!config.divarToken ? "ابتدا در تب تنظیمات به حساب دیوار متصل شوید" : "ارسال پیام خودکار"}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-xs font-bold transition-all shadow-2xs"
                        >
                          <Send className={`size-3.5 ${isCurrentlySending ? "animate-spin" : ""}`} />
                          <span>{isCurrentlySending ? "در حال ارسال..." : "ارسال با ربات"}</span>
                        </button>

                        {/* چت دستی با یک کلیک */}
                        <button
                          type="button"
                          onClick={() => handleCopyAndOpenChat(listing)}
                          title="کپی متن پیام و باز کردن صفحه چت آگهی در تب جدید"
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-line bg-surface hover:bg-surface-hover text-ink text-xs font-semibold transition-all"
                        >
                          <Copy className="size-3.5 text-muted" />
                          <span>چت مستقیم</span>
                          <ExternalLink className="size-3 text-muted" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── تب ۲: تنظیمات پیام و اتصال حساب‌ها ── */}
      {activeTab === "settings" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* ستون راست: اتصال حساب‌ها و احراز هویت */}
          <div className="space-y-4">
            <Card className="p-4 space-y-4">
              <div className="flex items-center gap-2 font-bold text-sm text-ink border-b border-line pb-2.5">
                <Phone className="size-4 text-rose-600" />
                <span>اتصال به حساب دیوار (جهت ارسال خودکار در چت)</span>
              </div>

              {config.divarToken ? (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-xs text-emerald-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="size-4 text-emerald-600" />
                    <span>حساب دیوار متصل است ({config.divarPhone})</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setConfig((p) => ({ ...p, divarToken: "" }))}
                    className="text-[11px] text-rose-700 hover:underline font-bold"
                  >
                    خروج از حساب
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs text-muted leading-relaxed">
                    شماره موبایل حساب دیوار خود را وارد کنید تا کد تایید پیامک شود و سیستم به صورت خودکار توکن را دریافت کند.
                  </p>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="۰۹۱۲۳۴۵۶۷۸۹"
                      value={divarPhoneInput}
                      onChange={(e) => setDivarPhoneInput(e.target.value)}
                      disabled={divarOtpSent}
                      className="flex-1 rounded-lg border border-line bg-surface px-3 py-2 text-xs font-mono"
                    />
                    {!divarOtpSent ? (
                      <Button
                        type="button"
                        onClick={handleSendDivarOtp}
                        disabled={isPending}
                        className="text-xs bg-rose-600 hover:bg-rose-700 text-white"
                      >
                        دریافت کد
                      </Button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setDivarOtpSent(false)}
                        className="text-xs text-muted hover:underline px-2"
                      >
                        تغییر شماره
                      </button>
                    )}
                  </div>

                  {divarOtpSent && (
                    <div className="flex gap-2 animate-in fade-in">
                      <input
                        type="text"
                        placeholder="کد ۴ یا ۶ رقمی پیامک‌شده"
                        value={divarCodeInput}
                        onChange={(e) => setDivarCodeInput(e.target.value)}
                        className="flex-1 rounded-lg border border-line bg-surface px-3 py-2 text-xs font-mono"
                      />
                      <Button
                        type="button"
                        onClick={handleVerifyDivarOtp}
                        disabled={isPending}
                        className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                      >
                        تایید و ورود
                      </Button>
                    </div>
                  )}

                  {/* الصاق دستی توکن در صورت تمایل */}
                  <div className="pt-2 border-t border-line/60">
                    <details className="text-xs text-muted cursor-pointer">
                      <summary className="font-semibold hover:text-ink">ورود دستی با Token دیوار (اختیاری)</summary>
                      <div className="flex gap-2 pt-2">
                        <input
                          type="text"
                          placeholder="ey..."
                          value={manualDivarToken}
                          onChange={(e) => setManualDivarToken(e.target.value)}
                          className="flex-1 rounded-lg border border-line bg-surface px-3 py-1.5 text-xs font-mono"
                        />
                        <button
                          type="button"
                          onClick={handleSaveManualDivarToken}
                          className="px-3 py-1.5 rounded-lg bg-surface border border-line text-ink text-xs font-bold"
                        >
                          ثبت
                        </button>
                      </div>
                    </details>
                  </div>
                </div>
              )}
            </Card>

            {/* کارت لینک آگهی معرف */}
            <Card className="p-4 space-y-3">
              <div className="flex items-center gap-2 font-bold text-sm text-ink border-b border-line pb-2.5">
                <ExternalLink className="size-4 text-brand-600" />
                <span>لینک آگهی معرفی شما در دیوار</span>
              </div>
              <p className="text-xs text-muted leading-relaxed">
                ابتدا یک آگهی خدمات کارشناسی یا معرفی رادار در دیوار ثبت کنید. سپس لینک آن آگهی را در اینجا قرار دهید تا در پیام‌های ارسالی به فروشندگان به عنوان منبع اعتماد ارسال شود.
              </p>
              <input
                type="text"
                placeholder="https://divar.ir/v/gZ-XXXXX"
                value={adLinkInput}
                onChange={(e) => setAdLinkInput(e.target.value)}
                className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-xs font-mono text-left dir-ltr"
              />
            </Card>

            {/* سقف ایمنی و فاصله ارسال */}
            <Card className="p-4 space-y-3">
              <div className="flex items-center gap-2 font-bold text-sm text-ink border-b border-line pb-2.5">
                <ShieldAlert className="size-4 text-amber-600" />
                <span>تنظیمات ضد اسپم و ایمنی (Anti-Ban)</span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-muted mb-1 font-semibold">سقف پیام روزانه:</label>
                  <input
                    type="number"
                    value={dailyLimitInput}
                    onChange={(e) => setDailyLimitInput(Number(e.target.value))}
                    className="w-full rounded-lg border border-line bg-surface px-3 py-1.5 font-mono"
                  />
                  <span className="text-[10px] text-muted">حداکثر ۳۰ پیام برای ایمنی سیم‌کارت</span>
                </div>
                <div>
                  <label className="block text-muted mb-1 font-semibold">فاصله بین پیام‌ها (ثانیه):</label>
                  <input
                    type="number"
                    value={delaySecondsInput}
                    onChange={(e) => setDelaySecondsInput(Number(e.target.value))}
                    className="w-full rounded-lg border border-line bg-surface px-3 py-1.5 font-mono"
                  />
                  <span className="text-[10px] text-muted">پیشنهادی: ۶۰ الی ۹۰ ثانیه</span>
                </div>
              </div>
            </Card>
          </div>

          {/* ستون چپ: ویرایشگر قالب پیام و پیش‌نمایش چت دیوار */}
          <div className="space-y-4">
            <Card className="p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-line pb-2.5">
                <span className="font-bold text-sm text-ink flex items-center gap-2">
                  <MessageSquareShare className="size-4 text-brand-600" />
                  قالب متن پیام
                </span>
                <span className="text-[11px] text-muted">پشتیبانی از کلمات متغیر (Spintax)</span>
              </div>

              {/* متغیرهای آماده */}
              <div className="flex flex-wrap gap-1.5 text-[11px]">
                <span className="bg-surface px-2 py-0.5 rounded border border-line text-brand-700 font-mono">
                  &#123;car_title&#125;
                </span>
                <span className="bg-surface px-2 py-0.5 rounded border border-line text-brand-700 font-mono">
                  &#123;car_price&#125;
                </span>
                <span className="bg-surface px-2 py-0.5 rounded border border-line text-brand-700 font-mono">
                  &#123;city&#125;
                </span>
                <span className="bg-surface px-2 py-0.5 rounded border border-line text-brand-700 font-mono">
                  &#123;ad_link&#125;
                </span>
                <span className="bg-surface px-2 py-0.5 rounded border border-line text-emerald-700 font-mono">
                  &#123;سلام|درود|وقت بخیر&#125;
                </span>
              </div>

              <textarea
                rows={9}
                value={templateInput}
                onChange={(e) => setTemplateInput(e.target.value)}
                className="w-full rounded-lg border border-line bg-surface p-3 text-xs leading-relaxed font-sans"
              />

              <Button
                type="button"
                onClick={handleSaveSettings}
                disabled={isPending}
                className="w-full bg-brand-600 text-white hover:bg-brand-700 text-xs font-bold"
              >
                ذخیره کلیه تنظیمات
              </Button>
            </Card>

            {/* پیش‌نمایش حباب چت دیوار */}
            <div className="bg-[#f5f5f7] rounded-2xl p-4 border border-line space-y-2">
              <span className="text-[11px] font-bold text-muted block mb-1">
                پیش‌نمایش حباب پیام در چت دیوار فروشنده:
              </span>
              <div className="max-w-[85%] bg-white text-ink p-3.5 rounded-2xl rounded-tr-none shadow-xs text-xs leading-relaxed space-y-1.5 border border-black/5">
                <p className="whitespace-pre-line text-neutral-800">
                  {templateInput
                    .replace(/\{سلام\|درود\|وقت بخیر\}/g, "سلام")
                    .replace(/\{بزرگوار\|دوست عزیز\|جناب\}/g, "دوست عزیز")
                    .replace(/\{car_title\}/g, "پژو پارس مدل ۱۴۰۰")
                    .replace(/\{car_price\}/g, "۵۸۰ میلیون تومان")
                    .replace(/\{city\}/g, "مشهد")
                    .replace(/\{ad_link\}/g, adLinkInput || "https://divar.ir/v/gZ-Sample")}
                </p>
                <div className="text-[10px] text-muted text-left font-mono pt-1">۱۰:۴۲ ✓✓</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── تب ۳: تاریخچه و لاگ ارسال‌ها ── */}
      {activeTab === "logs" && (
        <Card className="overflow-hidden">
          <div className="p-3.5 border-b border-line flex items-center justify-between text-xs font-bold text-ink">
            <span>تاریخچه آخرین پیام‌های ارسالی ({logs.length} مورد)</span>
            <span className="text-muted font-normal text-[11px]">مرتب‌شده از جدیدترین</span>
          </div>

          {logs.length === 0 ? (
            <div className="p-8 text-center text-xs text-muted">هنوز پیامی ارسال نشده است.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-surface-card border-b border-line text-muted font-semibold">
                  <tr>
                    <th className="p-3">زمان</th>
                    <th className="p-3">منبع</th>
                    <th className="p-3">عنوان خودرو</th>
                    <th className="p-3">قیمت</th>
                    <th className="p-3">وضعیت</th>
                    <th className="p-3">متن پیام</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-surface-card/50 transition-colors">
                      <td className="p-3 font-mono text-[11px] text-muted whitespace-nowrap">
                        {new Date(log.sentAt).toLocaleTimeString("fa-IR", { hour: "2-digit", minute: "2-digit" })}
                      </td>
                      <td className="p-3">
                        <Badge tone={log.source === "divar" ? "brand" : "neutral"} className="text-[10px]">
                          {log.source === "divar" ? "دیوار" : "شیپور"}
                        </Badge>
                      </td>
                      <td className="p-3 font-bold text-ink max-w-[180px] truncate">{log.carTitle}</td>
                      <td className="p-3 text-brand-700 whitespace-nowrap">
                        {formatTomanReadable(log.priceToman)}
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        {log.status === "sent" ? (
                          <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-[11px] font-bold">
                            <CheckCircle2 className="size-3" /> موفق
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-rose-700 bg-rose-50 px-2 py-0.5 rounded text-[11px]">
                            {log.errorMessage || "ناموفق"}
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-muted max-w-[260px] truncate" title={log.messageText}>
                        {log.messageText}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
