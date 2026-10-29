"use client";

import React from "react";
import {
  HardDrive,
  Users2,
  Star,
  Trash2,
  Cloud,
  ChevronDown,
  Building2,
  FolderOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface DriveUnitItem {
  id: number;
  slug: string;
  name: string;
  can_access: boolean;
  role: string | null;
}

export interface StorageStats {
  used_bytes: number;
  quota_bytes: number;
  used_percent: number;
}

interface DriveSidebarProps {
  currentSpace: string; // 'my' | unitId
  currentFilter: "all" | "starred" | "trash";
  units: DriveUnitItem[];
  storage: StorageStats;
  onSelectSpace: (space: string) => void;
  onSelectFilter: (filter: "all" | "starred" | "trash") => void;
}

function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}

export function DriveSidebar({
  currentSpace,
  currentFilter,
  units,
  storage,
  onSelectSpace,
  onSelectFilter,
}: DriveSidebarProps) {
  const [unitsExpanded, setUnitsExpanded] = React.useState(true);

  return (
    <aside className="w-full lg:w-64 shrink-0 flex flex-col justify-between p-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl shadow-xs">
      <div className="space-y-6">
        {/* Drive Brand Header */}
        <div className="flex items-center gap-2.5 px-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-xs">
            <Cloud className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-sm font-extrabold text-slate-900 dark:text-slate-100">BKSDA Drive</h2>
            <p className="text-[10px] font-semibold text-slate-400">Penyimpanan Awan Resmi</p>
          </div>
        </div>

        {/* Navigation Sections */}
        <nav className="space-y-1">
          {/* Drive Saya */}
          <button
            onClick={() => {
              onSelectSpace("my");
              onSelectFilter("all");
            }}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all text-left",
              currentSpace === "my" && currentFilter === "all"
                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 shadow-xs"
                : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800/60"
            )}
          >
            <HardDrive className="w-4 h-4" />
            <span>Drive Saya</span>
          </button>

          {/* Drive Bersama (Units Header) */}
          <div className="pt-2">
            <button
              onClick={() => setUnitsExpanded(!unitsExpanded)}
              className="w-full flex items-center justify-between px-3 py-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider hover:text-slate-600 dark:hover:text-slate-200"
            >
              <span className="flex items-center gap-1.5">
                <Users2 className="w-3.5 h-3.5" />
                Drive Bersama
              </span>
              <ChevronDown
                className={cn("w-3.5 h-3.5 transition-transform", !unitsExpanded && "-rotate-90")}
              />
            </button>

            {/* Units List */}
            {unitsExpanded && (
              <div className="mt-1 space-y-0.5 pl-2">
                {units.map((u) => {
                  const isSelected = currentSpace === String(u.id) && currentFilter === "all";
                  return (
                    <button
                      key={u.id}
                      onClick={() => {
                        onSelectSpace(String(u.id));
                        onSelectFilter("all");
                      }}
                      className={cn(
                        "w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-medium transition-all text-left truncate",
                        isSelected
                          ? "bg-emerald-50 text-emerald-700 font-bold dark:bg-emerald-950/40 dark:text-emerald-400"
                          : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800/60"
                      )}
                    >
                      <span className="flex items-center gap-2 truncate">
                        <Building2 className="w-3.5 h-3.5 shrink-0 opacity-70" />
                        <span className="truncate">{u.name}</span>
                      </span>
                      {u.role && (
                        <span className="text-[9px] px-1.5 py-0.2 rounded-sm bg-slate-100 dark:bg-slate-800 text-slate-500 uppercase font-semibold shrink-0">
                          {u.role}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Berbintang */}
          <button
            onClick={() => onSelectFilter("starred")}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all text-left",
              currentFilter === "starred"
                ? "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 shadow-xs"
                : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800/60"
            )}
          >
            <Star className="w-4 h-4 text-amber-500" />
            <span>Berbintang</span>
          </button>

          {/* Sampah */}
          <button
            onClick={() => onSelectFilter("trash")}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all text-left",
              currentFilter === "trash"
                ? "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 shadow-xs"
                : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800/60"
            )}
          >
            <Trash2 className="w-4 h-4" />
            <span>Sampah</span>
          </button>
        </nav>
      </div>

      {/* Storage Quota Card */}
      <div className="mt-8 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/60 dark:border-slate-800/60">
        <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
          <span>Kapasitas</span>
          <span>{storage.used_percent}%</span>
        </div>
        <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-500",
              storage.used_percent > 90
                ? "bg-rose-500"
                : storage.used_percent > 75
                ? "bg-amber-500"
                : "bg-emerald-500"
            )}
            style={{ width: `${Math.min(100, storage.used_percent)}%` }}
          />
        </div>
        <p className="text-[11px] text-slate-500 mt-2">
          Terpakai {formatBytes(storage.used_bytes)} dari {formatBytes(storage.quota_bytes)}
        </p>
      </div>
    </aside>
  );
}
