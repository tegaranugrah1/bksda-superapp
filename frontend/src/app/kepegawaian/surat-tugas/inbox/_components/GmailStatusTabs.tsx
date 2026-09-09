"use client";

import React from "react";
import { Inbox, Clock, CheckCircle2, FileEdit, XCircle, Trash2 } from "lucide-react";
import type { StatusCounts } from "../_lib/types";

interface GmailStatusTabsProps {
  activeTab: string; // 'all' | 'pending' | 'approved' | 'draft' | 'rejected' | 'trashed'
  onTabChange: (tab: string) => void;
  counts?: StatusCounts;
}

export function GmailStatusTabs({ activeTab, onTabChange, counts }: GmailStatusTabsProps) {
  const tabs = [
    {
      id: "all",
      label: "Kotak Masuk",
      icon: Inbox,
      count: counts?.all,
      badgeColor: "bg-slate-100 text-slate-700 dark:bg-zinc-800 dark:text-zinc-300",
      activeColor: "border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400",
    },
    {
      id: "pending",
      label: "Menunggu Persetujuan",
      icon: Clock,
      count: counts?.pending,
      badgeColor: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
      activeColor: "border-amber-600 text-amber-600 dark:text-amber-400 dark:border-amber-400",
    },
    {
      id: "approved",
      label: "Diterbitkan",
      icon: CheckCircle2,
      count: counts?.approved,
      badgeColor: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
      activeColor: "border-emerald-600 text-emerald-600 dark:text-emerald-400 dark:border-emerald-400",
    },
    {
      id: "draft",
      label: "Draf",
      icon: FileEdit,
      count: counts?.draft,
      badgeColor: "bg-slate-100 text-slate-700 dark:bg-zinc-800 dark:text-zinc-300",
      activeColor: "border-slate-600 text-slate-700 dark:text-zinc-200 dark:border-zinc-400",
    },
    {
      id: "rejected",
      label: "Ditolak",
      icon: XCircle,
      count: counts?.rejected,
      badgeColor: "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300",
      activeColor: "border-rose-600 text-rose-600 dark:text-rose-400 dark:border-rose-400",
    },
    {
      id: "trashed",
      label: "Sampah",
      icon: Trash2,
      count: counts?.trashed,
      badgeColor: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
      activeColor: "border-zinc-600 text-zinc-700 dark:text-zinc-200 dark:border-zinc-400",
    },
  ];

  return (
    <div className="flex items-center overflow-x-auto border-b border-slate-200 dark:border-zinc-800 scrollbar-none px-2 bg-white/60 dark:bg-zinc-900/60">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`flex items-center gap-2 px-5 py-3 border-b-2 text-xs font-bold transition-all whitespace-nowrap shrink-0 group ${
              isActive
                ? `${tab.activeColor} bg-slate-50/50 dark:bg-zinc-800/30`
                : "border-transparent text-slate-500 hover:text-slate-800 dark:text-zinc-400 dark:hover:text-zinc-200 hover:bg-slate-50/30 dark:hover:bg-zinc-800/20"
            }`}
          >
            <Icon
              className={`w-4 h-4 transition-transform group-hover:scale-110 ${
                isActive ? "text-current" : "text-slate-400 dark:text-zinc-500"
              }`}
            />
            <span>{tab.label}</span>
            {tab.count !== undefined && tab.count > 0 && (
              <span
                className={`ml-1 px-2 py-0.5 rounded-full text-[10px] font-black ${
                  isActive ? tab.badgeColor : "bg-slate-100 text-slate-600 dark:bg-zinc-800 dark:text-zinc-400"
                }`}
              >
                {tab.count.toLocaleString("id-ID")}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
