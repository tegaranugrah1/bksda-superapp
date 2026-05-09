"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Users, UserPlus } from "lucide-react";

const SIDEBAR_ITEMS = [
  { href: "/kepegawaian", label: "Daftar Pegawai", icon: Users },
  { href: "/kepegawaian/create", label: "Tambah Pegawai", icon: UserPlus },
];

export default function KepegawaianLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen bg-zinc-950">
      <aside className="hidden md:flex flex-col w-64 bg-zinc-900/50 border-r border-zinc-800 p-4 gap-1">
        <div className="flex items-center gap-3 px-3 py-4 mb-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center">
            <Users className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-black text-white">Kepegawaian</h2>
            <p className="text-[10px] text-emerald-400 uppercase tracking-widest">SDM &amp; Employee</p>
          </div>
        </div>
        {SIDEBAR_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link key={item.href} href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                  : "text-zinc-400 hover:text-white hover:bg-zinc-800/50"
              }`}>
              <Icon className="w-4 h-4" />
              {item.label}
            </Link>
          );
        })}
      </aside>
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
