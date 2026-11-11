"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Inbox, LogIn } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useRole } from "@/hooks/useRole";

export default function SuratTugasLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated } = useAuth();
  const { canWrite } = useRole();

  return (
    <div data-module="surat-tugas" className="st-ui min-h-screen bg-[var(--ds-canvas)] font-sans">
      {/* Minimal Header */}
      <header className="sticky top-0 z-50 bg-[var(--ds-surface)] border-b border-[var(--ds-border-subtle)] shadow-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 sm:gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="w-10 h-10 shrink-0 rounded-xl bg-white border border-[var(--ds-border-subtle)] flex items-center justify-center p-1">
              <Image
                src="/logo_bksda.png"
                alt="Logo BKSDA Kalimantan Timur"
                width={40}
                height={40}
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <h1 className="font-bold text-[var(--ds-fg)] leading-tight">
                Pengajuan Surat Tugas
              </h1>
              <p className="text-xs font-black tracking-widest text-[var(--ds-accent-fg)] uppercase">
                BKSDA KALTIM
              </p>
            </div>
          </div>

          {isAuthenticated ? (
            <Link
              href={canWrite ? "/kepegawaian/surat-tugas/inbox" : "/portal"}
              className="inline-flex min-h-11 items-center gap-2 px-3.5 py-2 rounded-xl st-secondary text-xs font-bold transition-colors cursor-pointer shrink-0"
            >
              {canWrite ? (
                <>
                  <Inbox className="w-4 h-4 text-[var(--ds-accent-fg)]" />
                  <span>Kembali ke Inbox ST</span>
                </>
              ) : (
                <>
                  <ArrowLeft className="w-4 h-4" />
                  <span>Kembali ke Portal</span>
                </>
              )}
            </Link>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/"
                className="inline-flex min-h-11 items-center gap-1.5 px-3 py-2 rounded-xl st-secondary text-xs font-bold transition-colors cursor-pointer shrink-0"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Beranda</span>
              </Link>
              <Link
                href="/login"
                className="inline-flex min-h-11 items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[var(--ds-accent-solid)] hover:bg-[var(--ds-accent-hover)] text-[var(--ds-accent-on-solid)] text-xs font-bold transition-colors cursor-pointer shrink-0 shadow-sm"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Login Pegawai</span>
              </Link>
            </div>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="py-8 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
        {children}
      </main>

    </div>
  );
}
