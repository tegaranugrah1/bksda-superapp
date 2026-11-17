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
    <div className="bg-[var(--ds-surface)] rounded-3xl p-6 sm:p-10 shadow-xs border border-[var(--ds-status-success-border)] max-w-xl mx-auto text-center relative overflow-hidden">
      <div className="w-20 h-20 bg-[var(--ds-status-success-bg)] text-[var(--ds-status-success-fg)] rounded-full mx-auto flex items-center justify-center mb-6 shadow-xs border border-[var(--ds-status-success-border)]">
        <CheckCircle2 className="w-10 h-10" />
      </div>
      <h2 className="text-2xl font-bold text-[var(--ds-fg)] tracking-tight mb-3">
        Berhasil Disubmit!
      </h2>
      <p className="text-sm text-[var(--ds-fg-muted)] font-medium max-w-sm mx-auto mb-8">
        Pengajuan surat tugas Anda berhasil dikirim dan akan segera diproses oleh Admin.
      </p>
      <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center justify-center gap-3">
        <Button
          onClick={() => window.location.reload()}
          variant="outline"
          className="min-h-12 h-auto whitespace-normal rounded-lg px-4 sm:px-6 py-3 border-slate-200/80 dark:border-zinc-800 hover:bg-[var(--ds-surface-muted)] font-bold gap-2 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Buat Surat Tugas Baru</span>
        </Button>

        {isAuthenticated && (
          <Button asChild className="min-h-12 h-auto whitespace-normal rounded-lg px-4 sm:px-6 py-3 bg-[var(--ds-accent-solid)] hover:bg-[var(--ds-accent-hover)] text-[var(--ds-accent-on-solid)] font-bold gap-2 cursor-pointer">
            <Link href={canWrite ? "/kepegawaian/surat-tugas/inbox" : "/portal"}>
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
            </Link>
          </Button>
        )}
      </div>
    </div>
  );
}
