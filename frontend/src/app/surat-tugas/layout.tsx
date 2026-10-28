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
    <div className="min-h-screen bg-slate-50 font-sans selection:bg-blue-500/20">
      {/* Minimal Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-200/50 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white shadow-sm border border-slate-100 flex items-center justify-center p-1">
              <Image
                src="/logo_bksda.png"
                alt="Logo"
                width={40}
                height={40}
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <h1 className="font-bold text-slate-900 leading-tight">
                Pengajuan Surat Tugas
              </h1>
              <p className="text-[10px] font-black tracking-widest text-blue-600 uppercase">
                BKSDA KALTIM
              </p>
            </div>
          </div>

          {isAuthenticated ? (
            <Link
              href={canWrite ? "/kepegawaian/surat-tugas/inbox" : "/portal"}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200/80 text-slate-700 text-xs font-bold transition-colors cursor-pointer shrink-0"
            >
              {canWrite ? (
                <>
                  <Inbox className="w-4 h-4 text-blue-600" />
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
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200/80 text-slate-700 text-xs font-bold transition-colors cursor-pointer shrink-0"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Beranda</span>
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors cursor-pointer shrink-0 shadow-sm"
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

      {/* Decorative Background Elements */}
      <div className="fixed inset-0 z-[-1] pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-100/40 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-100/30 rounded-full blur-[120px]"></div>
      </div>
    </div>
  );
}
