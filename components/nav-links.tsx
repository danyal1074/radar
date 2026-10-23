"use client";

import clsx from "clsx";
import {
  Bell,
  Bookmark,
  Calculator,
  Coins,
  CreditCard,
  LayoutDashboard,
  Radar,
  Settings2,
  ShieldCheck,
  Target,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const ICONS = {
  dashboard: LayoutDashboard,
  listings: Radar,
  opportunities: Target,
  calculator: Calculator,
  saved: Bookmark,
  notifications: Bell,
  alerts: Settings2,
  billing: CreditCard,
  admin: ShieldCheck,
  prices: Coins,
};

export interface NavItem {
  href: string;
  label: string;
  icon: keyof typeof ICONS;
  badge?: number;
  quiet?: boolean;
}

export function NavLinks({ items }: { items: NavItem[] }) {
  const path = usePathname();
  return (
    <nav aria-label="منوی اصلی" className="flex gap-1 overflow-x-auto lg:flex-col lg:overflow-visible">
      {items.map((it, index) => {
        const Icon = ICONS[it.icon];
        const active = path === it.href || (it.href !== "/dashboard" && path.startsWith(it.href + "/"));
        const showDivider = it.quiet && !items[index - 1]?.quiet;
        return (
          <div key={it.href} className="contents lg:block">
            {showDivider && <div className="my-2 hidden border-t border-line lg:block" />}
            <Link
              href={it.href}
              aria-current={active ? "page" : undefined}
              className={clsx(
                "relative flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                active ? "bg-brand-50 text-brand-700" : "text-muted hover:bg-paper hover:text-ink",
                it.quiet && "text-[13px]",
              )}
            >
              <Icon className="size-4" aria-hidden />
              {it.label}
              {!!it.badge && (
                <span className="ms-auto min-w-5 rounded-full bg-brand-600 px-1.5 text-center text-xs text-white">
                  {new Intl.NumberFormat("fa-IR").format(it.badge)}
                </span>
              )}
            </Link>
          </div>
        );
      })}
    </nav>
  );
}
