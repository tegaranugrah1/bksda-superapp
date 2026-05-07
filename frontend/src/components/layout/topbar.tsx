"use client";

import { ThemeToggle } from "@/components/theme-toggle";
import { useAuth } from "@/hooks/useAuth";
import { ModuleSwitcher } from "@/components/module-switcher";

export function Topbar({ serverUser }: { serverUser?: any }) {
  const { user: clientUser } = useAuth(); // Hook sakti yang melacak login state
  
  // Gunakan data dari Server Component sebagai fallback agar tidak ada flash 'Guest'
  // saat hidrasi Client-Side tertunda oleh popstate
  const user = clientUser || serverUser;

  return (
    <header className="sticky top-0 z-20 w-full h-16 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-3xl border-b border-zinc-200/50 dark:border-zinc-800/50 shadow-sm dark:shadow-none flex items-center justify-between px-6 md:px-8 transition-all duration-500">
       <div className="flex items-center gap-4">
          {/* Module Switcher di sebelah kiri */}
          <ModuleSwitcher />
       </div>

       <div className="flex items-center gap-5">
          {/* Inject Komponen Saklar Tema */}
          <ThemeToggle />

          {/* Garis Pemisah */}
          <div className="h-8 w-px bg-zinc-200 dark:bg-zinc-800"></div>

          {/* Modul Reaktif Profil Pegawai */}
          <div className="flex items-center gap-3">
             <div className="w-9 h-9 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-bold text-sm border border-emerald-200 dark:border-emerald-800">
                {/* Tampilkan inisial huruf pertama nama, atau U jika kosong */}
                {user?.name?.charAt(0).toUpperCase() || "U"}
             </div>
             <div className="hidden md:block text-sm">
                <p className="font-bold text-zinc-900 dark:text-zinc-100 leading-none">{user?.name || "Pengguna Aplikasi"}</p>
                <p className="text-zinc-500 dark:text-zinc-400 text-[11px] font-medium mt-1 uppercase tracking-wider">{user?.role || "GUEST"}</p>
             </div>
          </div>
       </div>
    </header>
  );
}
