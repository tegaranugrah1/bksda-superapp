"use client";

import { useKepegawaianTabs } from "../_lib/useKepegawaianTabs";

import { KepegawaianTabContent } from "../_components/KepegawaianTabContent";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Settings, FileText, Banknote, Calendar, Briefcase, Coins, MapPin } from "lucide-react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { LocationManagementTab } from "@/app/bmn/settings/_tabs/LocationManagementTab";
import { StTemplatesTab } from "./st-templates/_components/StTemplatesTab";
import { ExpenseTemplatesTab } from "./st-templates/_components/ExpenseTemplatesTab";
import { LeaveTypesTab } from "./st-templates/_components/LeaveTypesTab";
import { TaskTypesTab } from "./st-templates/_components/TaskTypesTab";
import { MealAllowanceHolidaysTab } from "./_components/MealAllowanceHolidaysTab";

function KepegawaianSettingsContent() {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === "super_admin";
  const reducedMotion = useReducedMotion();
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab");

  const [activeTab, setActiveTab] = useState<
    "st_templates" | "task_types" | "expense_templates" | "leave_types" | "uang_makan" | "locations"
  >("st_templates");

  const tabs = useKepegawaianTabs(activeTab, "Pengaturan Kepegawaian");

  useEffect(() => {
    if (initialTab === "uang_makan" || initialTab === "holidays" || initialTab === "banks") {
      setActiveTab("uang_makan");
    } else if (initialTab === "locations" || initialTab === "lokasi") {
      setActiveTab("locations");
    } else if (
      initialTab === "st_templates" ||
      initialTab === "task_types" ||
      initialTab === "expense_templates" ||
      initialTab === "leave_types"
    ) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  return (
    <div data-module="kepegawaian" className="kpg-ui p-5 md:p-7 space-y-5">
      {/* Unified Clean Enterprise Header Bar */}
      <div className="bg-[var(--ds-surface)] border border-slate-200/80 dark:border-zinc-800 rounded-3xl p-4 md:px-6 md:py-4 shadow-xs flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-[var(--ds-accent-soft)] text-[var(--ds-accent-fg)] border border-[var(--ds-accent-soft-border)] flex items-center justify-center shrink-0">
            <Settings className="w-5 h-5" />
          </div>
          <div>

            <h1 className="text-xl md:text-2xl font-bold text-[var(--ds-fg)] tracking-tight">
              Setting Kepegawaian
            </h1>
            <p className="text-xs text-[var(--ds-fg-muted)] mt-1">
              Kelola template dokumen Surat Tugas, sumber dana, master jenis cuti, serta alokasi Bank Uang Makan &amp; Hari Libur.
            </p>
          </div>
        </div>
      </div>

      {/* Tabs Switcher with Sliding Indicator ala Detail Pegawai */}
      <div {...tabs.tabListProps} className="kpg-pill-tabs bg-[var(--ds-surface)] border border-slate-200/80 dark:border-zinc-800 rounded-3xl p-2 shadow-xs inline-flex flex-wrap gap-1">
        {[
          { id: "st_templates", label: "Template Surat Tugas", icon: FileText },
          { id: "task_types", label: "Jenis Tugas ST", icon: Briefcase },
          { id: "expense_templates", label: "Template Biaya & Sumber Dana", icon: Banknote },
          { id: "leave_types", label: "Jenis Surat Cuti", icon: Calendar },
          { id: "uang_makan", label: "Uang Makan & Hari Libur", icon: Coins },
          { id: "locations", label: "Lokasi & Ruangan", icon: MapPin },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              aria-pressed={isActive}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              {...tabs.tabProps(tab.id)}
              className={cn(
                "relative px-4 py-2 rounded-lg text-xs font-bold transition-colors flex items-center gap-2 shrink-0 cursor-pointer select-none",
                isActive
                  ? "text-[var(--ds-accent-on-solid)]"
                  : "text-[var(--ds-fg-muted)] hover:text-[var(--ds-fg)] hover:bg-[var(--ds-surface-muted)]"
              )}
            >
              {isActive && (
                <motion.span
                  layoutId={tabs.indicatorId}
                  className="absolute inset-0 bg-[var(--ds-accent-solid)] rounded-lg shadow-xs"
                  transition={reducedMotion ? { duration: 0 } : { type: "spring", stiffness: 420, damping: 32 }}
                />
              )}
              <Icon className="w-4 h-4 relative z-10" />
              <span className="relative z-10">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Panels with Motion Glide Transition ala Detail Pegawai */}
      <AnimatePresence mode="wait" initial={false}>
        <KepegawaianTabContent
          panelProps={tabs.panelProps}
          key={activeTab}

        >
          {activeTab === "st_templates" && <div data-module="surat-tugas" className="st-ui"><StTemplatesTab /></div>}
          {activeTab === "task_types" && <div data-module="surat-tugas" className="st-ui"><TaskTypesTab /></div>}
          {activeTab === "expense_templates" && <div data-module="surat-tugas" className="st-ui"><ExpenseTemplatesTab /></div>}
          {activeTab === "leave_types" && <LeaveTypesTab />}
          {activeTab === "uang_makan" && <MealAllowanceHolidaysTab />}
          {activeTab === "locations" && (
            <LocationManagementTab canManage={isSuperAdmin} isSuperAdmin={isSuperAdmin} />
          )}
        </KepegawaianTabContent>
      </AnimatePresence>
    </div>
  );
}

export default function KepegawaianSettingsPage() {
  return (
    <Suspense fallback={<div className="p-6 text-xs text-[var(--ds-fg-muted)]">Memuat Pengaturan Kepegawaian...</div>}>
      <KepegawaianSettingsContent />
    </Suspense>
  );
}
