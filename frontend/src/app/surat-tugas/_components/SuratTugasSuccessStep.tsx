"use client";

import React from "react";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function SuratTugasSuccessStep() {
  return (
    <div className="bg-white/80 backdrop-blur-xl rounded-4xl p-8 sm:p-12 shadow-2xl border border-emerald-100 ring-1 ring-slate-100/50 animate-in fade-in zoom-in-95 duration-500 max-w-xl mx-auto text-center relative overflow-hidden">
      <div className="w-24 h-24 bg-emerald-50 text-emerald-500 rounded-full mx-auto flex items-center justify-center mb-6 shadow-sm border border-emerald-100">
        <CheckCircle2 className="w-12 h-12" />
      </div>
      <h2 className="text-3xl font-black text-slate-800 tracking-tight mb-3">
        Berhasil Disubmit!
      </h2>
      <p className="text-slate-500 font-medium max-w-sm mx-auto mb-10">
        Pengajuan surat tugas Anda berhasil dikirim dan akan segera diproses oleh Admin.
      </p>
      <Button
        onClick={() => window.location.reload()}
        variant="outline"
        className="h-12 border-slate-200 hover:bg-slate-50 font-bold"
      >
        Buat Surat Tugas Baru
      </Button>
    </div>
  );
}
