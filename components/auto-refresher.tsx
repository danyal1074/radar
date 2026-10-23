"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Bell, BellOff, Check, Pause, Play, RefreshCw, Volume2, VolumeX, Zap } from "lucide-react";

interface AutoRefresherProps {
  intervalSeconds?: number;
  totalCount?: number;
  className?: string;
}

/**
 * Web Audio API gentle notification chime (no external audio assets required)
 */
function playChimeSound() {
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    
    // Create dual-tone soft chime
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = "sine";
    osc1.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc1.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15); // A5

    osc2.type = "sine";
    osc2.frequency.setValueAtTime(880, ctx.currentTime); // A5
    osc2.frequency.exponentialRampToValueAtTime(1174.66, ctx.currentTime + 0.2); // D6

    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    osc1.start();
    osc2.start();
    osc1.stop(ctx.currentTime + 0.5);
    osc2.stop(ctx.currentTime + 0.5);
  } catch {
    // Audio autoplay restrictions or unsupported
  }
}

export function AutoRefresher({
  intervalSeconds = 30,
  totalCount,
  className = "",
}: AutoRefresherProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [countdown, setCountdown] = useState(intervalSeconds);
  const [isPaused, setIsPaused] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<string>("");
  const [newItemsBadge, setNewItemsBadge] = useState<number | null>(null);

  const prevCountRef = useRef<number | undefined>(totalCount);

  // Set initial time on client mount
  useEffect(() => {
    setLastRefreshedAt(
      new Date().toLocaleTimeString("fa-IR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
    );
  }, []);

  // Detect when new listings arrive
  useEffect(() => {
    if (prevCountRef.current !== undefined && totalCount !== undefined && totalCount > prevCountRef.current) {
      const added = totalCount - prevCountRef.current;
      setNewItemsBadge(added);
      if (soundEnabled) {
        playChimeSound();
      }
      const timer = setTimeout(() => setNewItemsBadge(null), 5000);
      return () => clearTimeout(timer);
    }
    prevCountRef.current = totalCount;
  }, [totalCount, soundEnabled]);

  const triggerRefresh = () => {
    startTransition(() => {
      router.refresh();
      setLastRefreshedAt(
        new Date().toLocaleTimeString("fa-IR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
      );
      setCountdown(intervalSeconds);
    });
  };

  // Auto-refresh countdown interval
  useEffect(() => {
    if (isPaused) return;

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          triggerRefresh();
          return intervalSeconds;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isPaused, intervalSeconds]);

  return (
    <div
      className={`flex flex-wrap items-center justify-between gap-2.5 rounded-xl border border-line/90 bg-surface-card/90 px-3.5 py-2 text-xs shadow-xs backdrop-blur-xs transition-all ${className}`}
    >
      {/* سمت راست: نشانگر وضعیت زنده */}
      <div className="flex items-center gap-2.5">
        <span className="relative flex h-2.5 w-2.5 shrink-0">
          {!isPaused ? (
            <>
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500"></span>
            </>
          ) : (
            <span className="inline-flex h-2.5 w-2.5 rounded-full bg-amber-500"></span>
          )}
        </span>

        <div className="flex items-center gap-1.5">
          <span className="font-bold text-ink">
            {isPaused ? "رادار متوقف است" : "رادار زنده فعال"}
          </span>
          {!isPaused && (
            <span className="hidden sm:inline text-muted font-normal">
              (بروزرسانی خودکار هر {intervalSeconds} ثانیه)
            </span>
          )}
        </div>

        {newItemsBadge !== null && (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-800 animate-bounce">
            <Zap className="size-3" />
            {newItemsBadge} آگهی جدید دریافت شد!
          </span>
        )}
      </div>

      {/* سمت چپ: کنترل‌ها و دکمه بروزرسانی فوری */}
      <div className="flex items-center gap-2 mr-auto">
        {lastRefreshedAt && !isPending && (
          <span className="text-[11px] text-muted hidden md:inline">
            آخرین بررسی: {lastRefreshedAt}
          </span>
        )}

        {!isPaused && (
          <span className="inline-flex items-center rounded-md bg-surface px-2 py-1 text-[11px] font-mono text-muted border border-line">
            {countdown}s
          </span>
        )}

        {/* دکمه توقف / ادامه */}
        <button
          type="button"
          onClick={() => setIsPaused((p) => !p)}
          title={isPaused ? "شروع مجدد رادار خودکار" : "توقف موقت رادار خودکار"}
          className="flex items-center justify-center size-7 rounded-lg border border-line bg-surface text-muted hover:text-ink hover:bg-surface-hover transition-colors"
        >
          {isPaused ? <Play className="size-3.5 text-emerald-600 fill-emerald-600" /> : <Pause className="size-3.5" />}
        </button>

        {/* کلید صدای هشدار */}
        <button
          type="button"
          onClick={() => {
            const next = !soundEnabled;
            setSoundEnabled(next);
            if (next) playChimeSound();
          }}
          title={soundEnabled ? "صدای آگهی جدید: روشن (کلیک برای خاموش)" : "صدای آگهی جدید: خاموش (کلیک برای فعال‌سازی)"}
          className={`flex items-center justify-center size-7 rounded-lg border transition-colors ${
            soundEnabled
              ? "border-emerald-300 bg-emerald-50 text-emerald-700"
              : "border-line bg-surface text-muted hover:text-ink hover:bg-surface-hover"
          }`}
        >
          {soundEnabled ? <Volume2 className="size-3.5" /> : <VolumeX className="size-3.5" />}
        </button>

        {/* دکمه بروزرسانی فوری دستی */}
        <button
          type="button"
          onClick={triggerRefresh}
          disabled={isPending}
          className="flex items-center gap-1.5 rounded-lg border border-brand-200 bg-brand-50/80 px-2.5 py-1 text-xs font-semibold text-brand-700 hover:bg-brand-100/90 active:scale-95 transition-all disabled:opacity-60"
        >
          <RefreshCw className={`size-3.5 ${isPending ? "animate-spin text-brand-600" : ""}`} />
          <span>{isPending ? "در حال دریافت..." : "بروزرسانی فوری"}</span>
        </button>
      </div>
    </div>
  );
}
