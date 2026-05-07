"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, Box, Users, Archive, FileText, ShieldAlert } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

// 1. Kamus Konfigurasi Seluruh Modul BKSDA
const MODULES_CONFIG = [
  { id: "kepegawaian", name: "Kepegawaian", icon: Users, path: "/kepegawaian", color: "text-blue-500 dark:text-blue-400", bg: "bg-blue-500/10" },
  { id: "bmn", name: "Aset BMN", icon: Box, path: "/bmn", color: "text-amber-500 dark:text-amber-400", bg: "bg-amber-500/10" },
  { id: "inventory", name: "Gudang", icon: Archive, path: "/inventory", color: "text-emerald-500 dark:text-emerald-400", bg: "bg-emerald-500/10" },
  { id: "dereporting", name: "Laporan", icon: FileText, path: "/dereporting", color: "text-purple-500 dark:text-purple-400", bg: "bg-purple-500/10" },
];

export function ModuleSwitcher() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const { user } = useAuth(); // Ambil identitas user (Rule 2.1 & 2.3)

  // 2. Fungsi Menutup Dropdown jika User klik di luar area
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // 3. Logika Keamanan (Filter Modul Berdasarkan Hak Akses)
  const availableModules = MODULES_CONFIG.filter((m) => {
    if (user?.role === "super_admin") return true; // Bos besar bisa lihat semua
    return user?.access_modules?.includes(m.id);   // Staf hanya bisa lihat yang dijatahkan
  });

  // 4. Deteksi Modul Aktif Saat Ini Berdasarkan URL
  const activeModule = MODULES_CONFIG.find((m) => pathname.startsWith(m.path)) || availableModules[0];
  const ActiveIcon = activeModule?.icon || ShieldAlert;

  return (
    <div className="relative" ref={dropdownRef}>

      {/* TOMBOL PEMICU (TRIGGER BUTTON) */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-all duration-200"
      >
        <div className={`p-1.5 rounded-lg ${activeModule?.bg || "bg-zinc-100 dark:bg-zinc-800"}`}>
          <ActiveIcon className={`w-4 h-4 ${activeModule?.color || "text-zinc-600 dark:text-zinc-400"}`} />
        </div>
        <span className="font-semibold text-sm hidden sm:block text-zinc-800 dark:text-zinc-200">
          {activeModule?.name || "Modul Terkunci"}
        </span>
        <ChevronDown className={`w-4 h-4 text-zinc-400 transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {/* ISI LACI (DROPDOWN MENU) - Glassmorphism */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-56 rounded-2xl bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border border-zinc-200/50 dark:border-zinc-800/50 shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="p-2 space-y-1">
            <div className="px-3 py-2 text-[10px] font-bold tracking-wider text-zinc-400 uppercase">
              Beralih Aplikasi
            </div>

            {/* Jika Modul Kosong (Tidak Diberi Akses Sama Sekali) */}
            {availableModules.length === 0 ? (
              <div className="px-3 py-4 text-sm text-center text-zinc-500 flex flex-col items-center gap-2">
                 <ShieldAlert className="w-6 h-6 text-red-400/50" />
                 <span>Akses Ditolak</span>
              </div>
            ) : (
              /* Render Modul yang Lolos Filter */
              availableModules.map((mod) => {
                const Icon = mod.icon;
                const isSelected = activeModule?.id === mod.id;

                return (
                  <Link
                    key={mod.id}
                    href={mod.path}
                    onClick={() => setIsOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group ${
                      isSelected
                        ? "bg-zinc-100 dark:bg-zinc-800/80"
                        : "hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                    }`}
                  >
                    {/* Ikon dengan animasi membesar saat disentuh Mouse */}
                    <div className={`p-1.5 rounded-lg ${mod.bg} transition-transform group-hover:scale-110`}>
                      <Icon className={`w-4 h-4 ${mod.color}`} />
                    </div>
                    <span className={`text-sm font-medium ${isSelected ? "text-zinc-900 dark:text-zinc-100" : "text-zinc-600 dark:text-zinc-400"}`}>
                      {mod.name}
                    </span>
                  </Link>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
