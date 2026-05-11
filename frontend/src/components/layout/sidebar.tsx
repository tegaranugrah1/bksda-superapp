"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Users, LayoutDashboard, Settings, Menu, FileText, Inbox, History, Plus } from "lucide-react";
import { useState } from "react";
import { LogoutButton } from "@/components/logout-button";

// Daftar Menu (Bisa ditambahkan nanti)
const menuItems = [
  { name: "Portal Modul", href: "/", icon: LayoutDashboard },
  { name: "Daftar Pegawai", href: "/kepegawaian", icon: Users },
  { name: "Tambah Pegawai", href: "/kepegawaian/employees/create", icon: Plus, indent: true },
  { name: "Surat Tugas Masuk", href: "/kepegawaian/surat-tugas/inbox", icon: Inbox },
  { name: "Buat Surat Tugas", href: "/kepegawaian/surat-tugas/create", icon: FileText, indent: true },
  { name: "Daftar Surat Tugas", href: "/kepegawaian/surat-tugas/history", icon: History, indent: true },
  { name: "Pengaturan", href: "/settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  // State untuk mode Handphone (Mobile)
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Tombol Floating Mobile Hamburger */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="md:hidden fixed z-50 bottom-6 right-6 p-4 rounded-full bg-emerald-600 text-white shadow-2xl hover:bg-emerald-500 hover:scale-105 active:scale-95 transition-all duration-300"
      >
        <Menu className="w-6 h-6" />
      </button>

      {/* Area Navigasi Utama */}
      <aside className={`
        fixed inset-y-0 left-0 z-40 w-64
        transform transition-transform duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] md:translate-x-0
        ${isOpen ? "translate-x-0" : "-translate-x-full"}
        bg-white/70 dark:bg-zinc-950/70 backdrop-blur-2xl border-r border-zinc-200/50 dark:border-zinc-800/50 shadow-2xl md:shadow-none
      `}>
        <div className="h-full flex flex-col">

          {/* Logo BKSDA Premium */}
          <div className="p-6 border-b border-zinc-200/50 dark:border-zinc-800/50">
             <div className="flex items-center gap-3">
               <div className="w-10 h-10 rounded-xl bg-linear-to-br from-emerald-400 to-emerald-600 shadow-lg shadow-emerald-500/30 flex items-center justify-center">
                 <span className="text-white font-extrabold text-lg">B</span>
               </div>
               <div>
                  <h1 className="font-bold text-lg tracking-tight leading-none text-zinc-900 dark:text-white">SuperApp</h1>
                  <p className="text-[10px] uppercase font-semibold text-emerald-600 dark:text-emerald-400 mt-1 tracking-wider">Kalimantan Timur</p>
               </div>
             </div>
          </div>

          {/* Deretan Menu Navigasi */}
          <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
            {menuItems.map((item) => {
              // Cek apakah url saat ini sedang membuka menu tersebut
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
              const Icon = item.icon;

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  className={`
                    flex items-center gap-3 px-4 py-3.5 rounded-2xl font-medium transition-all duration-300 group
                    ${isActive
                      ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shadow-sm border border-emerald-100 dark:border-emerald-500/20"
                      : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/50 hover:text-zinc-900 dark:hover:text-zinc-100 border border-transparent"}
                  `}
                >
                  <Icon className={`w-5 h-5 transition-transform duration-300 ${isActive ? "scale-110" : "group-hover:scale-110"}`} />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {/* Tombol Logout di Bawah */}
          <div className="px-4 py-4 border-t border-zinc-200/50 dark:border-zinc-800/50">
            <LogoutButton />
          </div>
        </div>
      </aside>

      {/* Layar Gelap (Backdrop) saat laci ditarik di layar HP */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          className="md:hidden fixed inset-0 z-30 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300"
        />
      )}
    </>
  );
}
