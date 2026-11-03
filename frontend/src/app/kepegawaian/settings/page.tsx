"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Settings, FileText, Banknote, Calendar, Briefcase, Coins } from "lucide-react";
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

      {/* Tabs Switcher */}
      <div className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800/80 rounded-2xl p-1.5 shadow-2xs inline-flex flex-wrap gap-1">
        <button
          type="button"
          onClick={() => setActiveTab("st_templates")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-2 shrink-0 cursor-pointer ${
            activeTab === "st_templates"
              ? "bg-blue-600 text-white shadow-xs"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 dark:text-zinc-400 dark:hover:text-white dark:hover:bg-zinc-800"
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          Template Surat Tugas
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("task_types")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-2 shrink-0 cursor-pointer ${
            activeTab === "task_types"
              ? "bg-blue-600 text-white shadow-xs"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 dark:text-zinc-400 dark:hover:text-white dark:hover:bg-zinc-800"
          }`}
        >
          <Briefcase className="w-3.5 h-3.5" />
          Jenis Tugas ST
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("expense_templates")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-2 shrink-0 cursor-pointer ${
            activeTab === "expense_templates"
              ? "bg-blue-600 text-white shadow-xs"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 dark:text-zinc-400 dark:hover:text-white dark:hover:bg-zinc-800"
          }`}
        >
          <Banknote className="w-3.5 h-3.5" />
          Template Biaya &amp; Sumber Dana
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("leave_types")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-2 shrink-0 cursor-pointer ${
            activeTab === "leave_types"
              ? "bg-blue-600 text-white shadow-xs"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 dark:text-zinc-400 dark:hover:text-white dark:hover:bg-zinc-800"
          }`}
        >
          <Calendar className="w-3.5 h-3.5" />
          Jenis Surat Cuti
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("uang_makan")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-2 shrink-0 cursor-pointer ${
            activeTab === "uang_makan"
              ? "bg-blue-600 text-white shadow-xs"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 dark:text-zinc-400 dark:hover:text-white dark:hover:bg-zinc-800"
          }`}
        >
          <Coins className="w-3.5 h-3.5" />
          Uang Makan &amp; Hari Libur
        </button>
      </div>

      {/* Tab Panels */}
      {activeTab === "st_templates" && <StTemplatesTab />}
      {activeTab === "task_types" && <TaskTypesTab />}
      {activeTab === "expense_templates" && <ExpenseTemplatesTab />}
      {activeTab === "leave_types" && <LeaveTypesTab />}
      {activeTab === "uang_makan" && <MealAllowanceHolidaysTab />}
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
