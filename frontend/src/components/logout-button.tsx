"use client";

import { useState } from "react";
import { LogOut, AlertTriangle, X } from "lucide-react";
import { api } from "@/lib/api";
import { authStore } from "@/lib/auth-store";

export function LogoutButton() {
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogout = async () => {
    try {
      setIsLoading(true);
      
      // Gunakan Promise.race agar tidak nyangkut selamanya jika backend hang
      await Promise.race([
        api.post("/logout"),
        new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 2000))
      ]);
    } catch (error) {
      console.error("Logout backend skip/timeout", error);
    } finally {
      // Sapu bersih data lokal (Cookie & LocalStorage)
      authStore.logout();
      setIsLoading(false);
      setShowConfirm(false);
      
      // Gunakan window.location agar seluruh state React ter-reset total (Cleanest Logout)
      window.location.href = "/login";
    }
  };

  return (
    <>
      {/* 1. TOMBOL PEMICU AWAL */}
      <button
        onClick={() => setShowConfirm(true)}
        className="flex items-center justify-center md:justify-start gap-3 px-4 py-3 w-full rounded-2xl font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors duration-200 group"
      >
        <LogOut className="w-5 h-5 transition-transform group-hover:-translate-x-1" />
        <span className="hidden md:inline">Keluar Sistem</span>
      </button>

      {/* 2. JENDELA KONFIRMASI (MODAL OVERLAY) */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">

          {/* Kotak Putih Modal */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-2xl w-full max-w-sm p-6 relative animate-in zoom-in-95 duration-200">

            {/* Tombol Tutup (X) */}
            <button
              onClick={() => !isLoading && setShowConfirm(false)}
              className="absolute top-4 right-4 p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 transition-colors"
              disabled={isLoading}
            >
              <X className="w-4 h-4" />
            </button>

            {/* Ikon Peringatan Elegan */}
            <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-500/20 flex items-center justify-center mb-4 text-red-600 dark:text-red-400">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-2">Konfirmasi Keluar</h3>
            <p className="text-zinc-500 dark:text-zinc-400 text-sm mb-6">
              Apakah Anda yakin ingin keluar dari SuperApp? Sesi Anda akan diakhiri.
            </p>

            {/* Area Tombol Konfirmasi */}
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                disabled={isLoading}
                className="flex-1 px-4 py-2.5 rounded-xl font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
              >
                Batal
              </button>

              <button
                onClick={handleLogout}
                disabled={isLoading}
                className="flex-1 px-4 py-2.5 rounded-xl font-semibold bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-600/20 transition-colors flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-wait"
              >
                {isLoading ? (
                  // Efek Loading Muter (Spin)
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  "Ya, Keluar"
                )}
              </button>
            </div>

          </div>
        </div>
      )}
    </>
  );
}
