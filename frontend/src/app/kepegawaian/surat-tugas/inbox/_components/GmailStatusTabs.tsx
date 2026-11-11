"use client";

import { useId } from "react";
import { Inbox, Clock, CheckCircle2, FileEdit, XCircle, Trash2 } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { getStatusStyle } from "../_lib/status-helpers";
import type { StatusCounts } from "../_lib/types";

const tabs = [
  { id: "all", label: "Kotak Masuk", icon: Inbox },
  { id: "pending", label: "Menunggu Persetujuan", icon: Clock },
  { id: "approved", label: "Diterbitkan", icon: CheckCircle2 },
  { id: "draft", label: "Draf", icon: FileEdit },
  { id: "rejected", label: "Ditolak", icon: XCircle },
  { id: "trashed", label: "Sampah", icon: Trash2 },
] as const;

interface GmailStatusTabsProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  counts?: StatusCounts;
}

export function GmailStatusTabs({ activeTab, onTabChange, counts }: GmailStatusTabsProps) {
  const indicatorId = useId();
  const reducedMotion = useReducedMotion();

  return (
    <div
      role="tablist"
      aria-label="Status surat tugas"
      className="st-status-tabs flex items-center overflow-x-auto border-b border-[var(--ds-border-subtle)] px-1.5 py-1"
    >
      {tabs.map(({ id, label, icon: Icon }, index) => {
        const active = activeTab === id;
        const count = counts?.[id];
        return (
          <button
            key={id}
            type="button"
            role="tab"
            id={`st-status-${id}`}
            aria-selected={active}
            aria-controls="st-inbox-panel"
            tabIndex={active ? 0 : -1}
            onClick={() => onTabChange(id)}
            onKeyDown={(event) => {
              const key = event.key;
              if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(key)) return;
              event.preventDefault();
              let next = index;
              if (key === "Home") next = 0;
              if (key === "End") next = tabs.length - 1;
              if (key === "ArrowLeft") next = (index + tabs.length - 1) % tabs.length;
              if (key === "ArrowRight") next = (index + 1) % tabs.length;
              const nextId = tabs[next].id;
              onTabChange(nextId);
              const button = document.getElementById(`st-status-${nextId}`);
              button?.focus({ preventScroll: true });
              button?.scrollIntoView({ block: "nearest", inline: "nearest" });
            }}
            className="relative flex shrink-0 items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2.5 text-xs font-semibold text-[var(--ds-fg-muted)] hover:bg-[var(--ds-surface-muted)] aria-selected:text-[var(--ds-accent-fg)]"
          >
            <Icon aria-hidden="true" className="size-4" />
            {label}
            {count !== undefined && count > 0 && (
              <span className={`rounded-full border px-1.5 py-0.5 text-xs tabular-nums ${getStatusStyle(id)}`}>
                {count.toLocaleString("id-ID")}
              </span>
            )}
            {active && (
              <motion.span
                aria-hidden="true"
                layoutId={indicatorId}
                className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-[var(--ds-accent-fg)]"
                transition={reducedMotion ? { duration: 0 } : { type: "spring", stiffness: 420, damping: 32 }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
