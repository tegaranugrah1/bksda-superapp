"use client";

import React, { useState } from "react";
import { Settings, FileText, Banknote } from "lucide-react";
import { StTemplatesTab } from "./_components/StTemplatesTab";
import { ExpenseTemplatesTab } from "./_components/ExpenseTemplatesTab";

export default function StSettingsPage() {
  const [activeTab, setActiveTab] = useState<"st_templates" | "expense_templates">("st_templates");

  return (
    <div className="p-6 md:p-10 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-zinc-800 pb-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <Settings className="w-5 h-5" />
            </span>
            Pengaturan Surat Tugas
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Kelola template dokumen Surat Tugas dan pengaturan sumber dana / klausul pembebanan biaya.
          </p>
        </div>
      </div>

      {/* Tabs Switcher */}
      <div className="flex border-b border-slate-200 dark:border-zinc-800 gap-6 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab("st_templates")}
          className={`pb-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
            activeTab === "st_templates"
              ? "border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400"
              : "border-transparent text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white"
          }`}
        >
          <FileText className="w-4 h-4" />
          Template Surat Tugas
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("expense_templates")}
          className={`pb-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
            activeTab === "expense_templates"
              ? "border-emerald-600 text-emerald-600 dark:border-emerald-400 dark:text-emerald-400"
              : "border-transparent text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white"
          }`}
        >
          <Banknote className="w-4 h-4" />
          Template Biaya &amp; Sumber Dana
        </button>
      </div>

      {/* Tab Panels */}
      {activeTab === "st_templates" && <StTemplatesTab />}
      {activeTab === "expense_templates" && <ExpenseTemplatesTab />}
    </div>
  );
}
