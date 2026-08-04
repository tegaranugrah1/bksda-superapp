"use client";

import React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export function StatCard({
  icon,
  label,
  value,
  color,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: string;
  sub: string;
}) {
  const colors: Record<string, { iconBg: string; text: string }> = {
    blue: { iconBg: "bg-blue-100 dark:bg-blue-500/10", text: "text-blue-600" },
    emerald: { iconBg: "bg-emerald-100 dark:bg-emerald-500/10", text: "text-emerald-600" },
    amber: { iconBg: "bg-amber-100 dark:bg-amber-500/10", text: "text-amber-600" },
    red: { iconBg: "bg-red-100 dark:bg-red-500/10", text: "text-red-600" },
  };
  const c = colors[color] || colors.blue;
  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 hover:shadow-sm transition-shadow">
      <div className="flex items-center gap-2 mb-2">
        <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", c.iconBg, c.text)}>{icon}</div>
        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide">{label}</span>
      </div>
      <p className="text-xl font-bold text-zinc-900 dark:text-white">{value}</p>
      <p className="text-[10px] text-zinc-400 mt-0.5">{sub}</p>
    </div>
  );
}

export function LegendItem({
  color,
  label,
  count,
  pct,
}: {
  color: string;
  label: string;
  count: number;
  pct: number;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className={cn("w-3 h-3 rounded-full shrink-0", color)} />
      <span className="text-xs text-zinc-600 dark:text-zinc-400 flex-1">{label}</span>
      <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">{count}</span>
      <span className="text-[10px] text-zinc-400 w-8 text-right">{pct}%</span>
    </div>
  );
}

export function QuickLink({
  href,
  label,
  icon,
}: {
  href: string;
  label: string;
  icon: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2 p-2.5 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-700 rounded-lg hover:border-emerald-300 dark:hover:border-emerald-500/30 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition-all group"
    >
      <div className="text-zinc-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
        {icon}
      </div>
      <span className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-300 group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">
        {label}
      </span>
    </Link>
  );
}
