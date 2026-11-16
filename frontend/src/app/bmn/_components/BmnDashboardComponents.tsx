"use client";

import React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

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
    zinc: { iconBg: "bg-[var(--ds-surface-muted)]", text: "text-[var(--ds-fg-muted)]" },
    blue: { iconBg: "bg-[var(--ds-status-info-bg)]", text: "text-[var(--ds-status-info-fg)]" },
    emerald: { iconBg: "bg-[var(--ds-accent-soft)]", text: "text-[var(--ds-accent-fg)]" },
    amber: { iconBg: "bg-[var(--ds-status-warning-bg)]", text: "text-[var(--ds-status-warning-fg)]" },
    red: { iconBg: "bg-[var(--ds-status-danger-bg)]", text: "text-[var(--ds-status-danger-fg)]" },
  };
  const c = colors[color] || colors.zinc;
  return (
    <motion.div
      whileHover={{ y: -3 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
      className="bg-[var(--ds-surface)] border border-slate-200/80 dark:border-zinc-800 rounded-3xl p-4 shadow-xs hover:border-slate-300 dark:hover:border-zinc-700 transition-colors"
    >
      <div className="flex items-center gap-2 mb-2">
        <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", c.iconBg, c.text)}>{icon}</div>
        <span className="text-xs font-bold text-[var(--ds-fg-muted)] uppercase tracking-wide">{label}</span>
      </div>
      <p className="text-xl font-bold text-[var(--ds-fg)] tabular-nums">{value}</p>
      <p className="text-xs text-[var(--ds-fg-muted)] mt-1">{sub}</p>
    </motion.div>
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
      <span className="text-xs text-[var(--ds-fg-muted)] flex-1">{label}</span>
      <span className="text-xs font-bold text-[var(--ds-fg)] tabular-nums">{count}</span>
      <span className="text-xs text-[var(--ds-fg-muted)] w-8 text-right tabular-nums">{pct}%</span>
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
    <motion.div
      whileHover={{ y: -1.5, scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      transition={{ duration: 0.15 }}
      className="h-full"
    >
      <Link
        href={href}
        className="flex items-center gap-2 p-3 h-full bg-[var(--ds-surface-muted)] border border-slate-200/80 dark:border-zinc-800 rounded-lg hover:border-[var(--ds-accent-soft-border)] hover:bg-[var(--ds-accent-soft)] transition-colors group"
      >
        <div className="text-[var(--ds-fg-muted)] group-hover:text-[var(--ds-accent-fg)] transition-colors">
          {icon}
        </div>
        <span className="text-xs font-semibold text-[var(--ds-fg-secondary)] group-hover:text-[var(--ds-accent-fg)] transition-colors">
          {label}
        </span>
      </Link>
    </motion.div>
  );
}
