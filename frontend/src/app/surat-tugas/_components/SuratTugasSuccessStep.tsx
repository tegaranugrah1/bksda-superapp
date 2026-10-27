"use client";

import React from "react";
import Link from "next/link";
import { CheckCircle2, Inbox, ArrowLeft, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useRole } from "@/hooks/useRole";

export function SuratTugasSuccessStep() {
  const { isAuthenticated } = useAuth();
  const { canWrite } = useRole();

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
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
        <Button
          onClick={() => window.location.reload()}
          variant="outline"
          className="h-12 px-6 border-slate-200 hover:bg-slate-50 font-bold gap-2 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Buat Surat Tugas Baru</span>
        </Button>

        {isAuthenticated && (
          <Link href={canWrite ? "/kepegawaian/surat-tugas/inbox" : "/"}>
            <Button className="h-12 px-6 bg-blue-600 hover:bg-blue-700 text-white font-bold gap-2 cursor-pointer">
              {canWrite ? (
                <>
                  <Inbox className="w-4 h-4" />
                  <span>Buka Inbox Surat Tugas</span>
                </>
              ) : (
                <>
                  <ArrowLeft className="w-4 h-4" />
                  <span>Kembali ke Portal</span>
                </>
              )}
            </Button>
          </Link>
        )}
      </div>
    </div>
  );
}
