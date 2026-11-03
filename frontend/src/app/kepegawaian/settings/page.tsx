"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Settings, FileText, Banknote, Calendar, Briefcase, Coins } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { StTemplatesTab } from "./st-templates/_components/StTemplatesTab";
import { ExpenseTemplatesTab } from "./st-templates/_components/ExpenseTemplatesTab";
import { LeaveTypesTab } from "./st-templates/_components/LeaveTypesTab";
import { TaskTypesTab } from "./st-templates/_components/TaskTypesTab";
import { MealAllowanceHolidaysTab } from "./_components/MealAllowanceHolidaysTab";

function KepegawaianSettingsContent() {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab");

  const [activeTab, setActiveTab] = useState<
    "st_templates" | "task_types" | "expense_templates" | "leave_types" | "uang_makan"
  >("st_templates");

  useEffect(() => {
    if (initialTab === "uang_makan" || initialTab === "holidays" || initialTab === "banks") {
      setActiveTab("uang_makan");
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
    <div className="p-5 md:p-7 space-y-5">
      {/* Unified Clean Enterprise Header Bar */}
      <div className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800/80 rounded-2xl p-4 md:px-6 md:py-4 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-blue-600/10 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400 border border-blue-200/60 dark:border-blue-500/20 flex items-center justify-center shrink-0">
            <Settings className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-blue-600 dark:text-blue-400">
              SDM &amp; Kepegawaian
            </span>
            <h1 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              Setting Kepegawaian
            </h1>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
              Kelola template dokumen Surat Tugas, sumber dana, master jenis cuti, serta alokasi Bank Uang Makan &amp; Hari Libur.
            </p>
          </div>
        </div>
      </div>

      {/* Tabs Switcher with Sliding Indicator ala Detail Pegawai */}
      <div className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800/80 rounded-2xl p-1.5 shadow-2xs inline-flex flex-wrap gap-1">
        {[
          { id: "st_templates", label: "Template Surat Tugas", icon: FileText },
          { id: "task_types", label: "Jenis Tugas ST", icon: Briefcase },
          { id: "expense_templates", label: "Template Biaya & Sumber Dana", icon: Banknote },
          { id: "leave_types", label: "Jenis Surat Cuti", icon: Calendar },
          { id: "uang_makan", label: "Uang Makan & Hari Libur", icon: Coins },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "relative px-4 py-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-2 shrink-0 cursor-pointer select-none",
                isActive
                  ? "text-white"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 dark:text-zinc-400 dark:hover:text-white dark:hover:bg-zinc-800"
              )}
            >
              {isActive && (
                <motion.span
                  layoutId="activeSettingsTabIndicator"
                  className="absolute inset-0 bg-blue-600 rounded-xl shadow-xs"
                  transition={{ type: "spring", stiffness: 420, damping: 32 }}
                />
              )}
              <Icon className="w-3.5 h-3.5 relative z-10" />
              <span className="relative z-10">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Panels with Motion Glide Transition ala Detail Pegawai */}
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.16, ease: "easeOut" }}
        >
          {activeTab === "st_templates" && <StTemplatesTab />}
          {activeTab === "task_types" && <TaskTypesTab />}
          {activeTab === "expense_templates" && <ExpenseTemplatesTab />}
          {activeTab === "leave_types" && <LeaveTypesTab />}
          {activeTab === "uang_makan" && <MealAllowanceHolidaysTab />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

export default function KepegawaianSettingsPage() {
  return (
    <Suspense fallback={<div className="p-6 text-xs text-slate-500">Memuat Pengaturan Kepegawaian...</div>}>
      <KepegawaianSettingsContent />
    </Suspense>
  );
}
