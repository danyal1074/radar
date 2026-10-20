"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

export function CopyBannerButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback if clipboard API is restricted
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-line-strong bg-surface px-3 text-sm text-ink/80 hover:bg-paper hover:text-ink transition"
      title="کپی متن بنر آماده و شیک برای کانال تلگرام یا استوری اینستاگرام"
    >
      {copied ? <Check className="size-4 text-emerald-600" /> : <Copy className="size-4 text-muted" />}
      {copied ? "بنر کپی شد! ✅" : "کپی بنر نمایشگاه"}
    </button>
  );
}
