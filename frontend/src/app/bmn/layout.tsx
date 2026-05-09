"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import {
    LayoutDashboard,
    CarFront,
    Handshake,
    Wrench,
    Trash2,
    FileBox,
    Building2,
} from "lucide-react";
import { ModuleSwitcher } from "@/components/module-switcher";
import { LogoutButton } from "@/components/logout-button";
import { ThemeToggle } from "@/components/theme-toggle";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";

const bmnMenus = [
    { title: "Dashboard BMN", path: "/bmn", icon: LayoutDashboard },
    { title: "Katalog Master Aset", path: "/bmn/assets", icon: CarFront },
    { title: "Lalu Lintas Peminjaman", path: "/bmn/loans", icon: Handshake },
    { title: "Riwayat Pemeliharaan", path: "/bmn/maintenances", icon: Wrench },
    { title: "Karantina & Pemutihan", path: "/bmn/disposal", icon: Trash2 },
    { title: "Laporan & Audit BPK", path: "/bmn/reports", icon: FileBox },
];

export default function BmnLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const { user } = useAuth();

    return (
        <div className="flex h-screen bg-zinc-50 dark:bg-black text-zinc-900 dark:text-zinc-100 overflow-hidden selection:bg-emerald-500/30">
            {/* Sidebar Eksklusif BMN */}
            <aside className="w-72 bg-white dark:bg-zinc-950 border-r border-zinc-200 dark:border-zinc-800/50 flex flex-col relative z-20 shadow-xl dark:shadow-2xl">
                {/* Header: Logo & Module Switcher */}
                <div className="p-6 border-b border-zinc-200 dark:border-zinc-800/50">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-xl bg-linear-to-br from-emerald-500 to-teal-700 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                            <Building2 className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h1 className="font-bold text-lg leading-tight tracking-tight text-zinc-900 dark:text-white">
                                BKSDA
                            </h1>
                            <p className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 tracking-widest uppercase">
                                Barang Milik Negara
                            </p>
                        </div>
                    </div>
                    <ModuleSwitcher />
                </div>

                {/* User Info Card */}
                <div className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-800/50 bg-zinc-50 dark:bg-zinc-900/50">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-linear-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-bold text-sm shadow-md">
                            {user?.name?.charAt(0) || "U"}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-zinc-900 dark:text-white truncate">
                                {user?.name || user?.nama_lengkap || "User"}
                            </p>
                            <Badge variant="secondary" className="text-[10px] mt-0.5">
                                {user?.role || "Pegawai"}
                            </Badge>
                        </div>
                        <ThemeToggle />
                    </div>
                </div>

                {/* Navigasi Utama */}
                <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
                    {bmnMenus.map((menu) => {
                        const Icon = menu.icon;
                        const isActive =
                            menu.path === "/bmn"
                                ? pathname === "/bmn"
                                : pathname.startsWith(menu.path);

                        return (
                            <Link
                                key={menu.path}
                                href={menu.path}
                                className={`relative flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group ${
                                    isActive
                                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold shadow-inner shadow-emerald-500/5 dark:bg-emerald-500/10 dark:text-emerald-400"
                                        : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900 hover:text-zinc-900 dark:hover:text-white"
                                }`}
                            >
                                {isActive && (
                                    <span className="absolute left-0 w-1 h-8 bg-emerald-500 rounded-r-full shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                                )}
                                <Icon
                                    className={`w-5 h-5 transition-transform duration-300 ${
                                        isActive ? "scale-110" : "group-hover:scale-110"
                                    }`}
                                />
                                <span className="text-sm">{menu.title}</span>
                            </Link>
                        );
                    })}
                </nav>

                {/* Footer: Logout */}
                <div className="p-3 border-t border-zinc-200 dark:border-zinc-800/50">
                    <LogoutButton />
                </div>
            </aside>

            {/* Area Konten Utama */}
            <main className="flex-1 relative z-10 overflow-y-auto bg-zinc-50 dark:bg-black">
                {children}
            </main>
        </div>
    );
}
