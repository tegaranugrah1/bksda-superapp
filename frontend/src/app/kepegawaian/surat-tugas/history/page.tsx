"use client";

import { AssignmentHistoryTab } from "../../_components/AssignmentHistoryTab";
import { Briefcase } from "lucide-react";

export default function AssignmentHistoryPage() {
    return (
        <div className="p-6 md:p-10 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white">
                            <Briefcase className="w-5 h-5" />
                        </div>
                        <h2 className="text-xs font-black uppercase tracking-[0.2em] text-blue-600 dark:text-blue-400">Kepegawaian & SDM</h2>
                    </div>
                    <h1 className="text-3xl font-black text-zinc-900 dark:text-white tracking-tight">Daftar Surat Tugas</h1>
                    <p className="text-zinc-500 dark:text-zinc-400 mt-1 text-sm">Arsip dan manajemen seluruh surat tugas yang diterbitkan.</p>
                </div>
            </div>

            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[2.5rem] p-8 shadow-sm min-h-[600px]">
                <AssignmentHistoryTab />
            </div>
        </div>
    );
}
