"use client";

import clsx from "clsx";
import Link from "next/link";
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";
const variants: Record<Variant, string> = {
  primary: "bg-brand-600 text-white hover:bg-brand-700 disabled:bg-line-strong disabled:text-muted",
  secondary: "bg-surface text-ink border border-line-strong hover:bg-paper disabled:text-muted disabled:bg-paper",
  ghost: "text-brand-700 hover:bg-brand-50",
  danger: "bg-surface text-bad-600 border border-line-strong hover:bg-bad-50",
};
const base =
  "inline-flex min-h-10 items-center justify-center gap-2 rounded-lg px-4 text-sm font-medium transition-colors disabled:cursor-not-allowed";

export function Button({ variant = "primary", className, ...p }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return <button {...p} className={clsx(base, variants[variant], className)} />;
}

export function LinkButton({ href, variant = "primary", className, children, external }: { href: string; variant?: Variant; className?: string; children: ReactNode; external?: boolean }) {
  const cls = clsx(base, variants[variant], className);
  if (external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer nofollow" className={cls}>
        {children}
      </a>
    );
  }
  return (
    <Link href={href} className={cls}>
      {children}
    </Link>
  );
}

export function Card({ className, ...p }: React.HTMLAttributes<HTMLDivElement>) {
  return <div {...p} className={clsx("rounded-xl border border-line bg-surface", className)} />;
}

type Tone = "neutral" | "brand" | "good" | "warn" | "bad";
const tones: Record<Tone, string> = {
  neutral: "bg-paper text-muted border-line",
  brand: "bg-brand-50 text-brand-700 border-brand-100",
  good: "bg-good-50 text-good-700 border-good-50",
  warn: "bg-warn-50 text-warn-700 border-warn-50",
  bad: "bg-bad-50 text-bad-600 border-bad-50",
};
export function Badge({ tone = "neutral", children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return (
    <span className={clsx("inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium", tones[tone], className)}>
      {children}
    </span>
  );
}

export function SampleBadge({ children = "داده نمونه" }: { children?: ReactNode }) {
  return <Badge tone="warn">{children}</Badge>;
}

const field =
  "w-full rounded-lg border border-line-strong bg-surface px-3 py-2 text-sm placeholder:text-muted/70 focus:border-brand-600 disabled:bg-paper";

export function Field({ label, error, hint, children }: { label: string; error?: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium">{label}</span>
      {children}
      {hint && !error && <span className="block text-xs text-muted">{hint}</span>}
      {error && (
        <span role="alert" className="block text-xs text-bad-600">
          {error}
        </span>
      )}
    </label>
  );
}

export function Input(p: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...p} className={clsx(field, p.className)} />;
}
export function Select(p: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...p} className={clsx(field, "pe-8", p.className)} />;
}
export function Textarea(p: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...p} className={clsx(field, "min-h-24", p.className)} />;
}

export function EmptyState({ title, body, action }: { title: string; body: string; action?: ReactNode }) {
  return (
    <Card className="px-6 py-12 text-center">
      <h3 className="text-base font-semibold">{title}</h3>
      <p className="mx-auto mt-1 max-w-md text-sm text-muted">{body}</p>
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </Card>
  );
}

export function Alert({ tone = "warn", children }: { tone?: "warn" | "bad" | "brand" | "good"; children: ReactNode }) {
  return (
    <div role={tone === "bad" ? "alert" : "status"} className={clsx("rounded-lg border px-4 py-3 text-sm", tones[tone])}>
      {children}
    </div>
  );
}

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-xl font-bold sm:text-2xl">{title}</h1>
        {description && <p className="mt-1 max-w-2xl text-sm text-muted">{description}</p>}
      </div>
      {actions}
    </div>
  );
}
