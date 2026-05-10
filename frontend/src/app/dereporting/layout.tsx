"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, FileText, Globe, Users, LayoutDashboard, Gem, Handshake, ShieldCheck, FolderOpen } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { LogoutButton } from "@/components/logout-button";
import { ModuleSwitcher } from "@/components/module-switcher";

const SIDEBAR_ITEMS = [
    { href: "/dereporting",          label: "Dashboard",        icon: LayoutDashboard },
    { href: "/dereporting/internal", label: "Laporan Internal", icon: FileText },
    { href: "/dereporting/eksternal",label: "Laporan Publik",   icon: Globe },
    { href: "/dereporting/operator", label: "Operator",         icon: Users },
    { href: "/dereporting/bernilai",       label: "Data Bernilai",    icon: Gem },
    { href: "/dereporting/kerjasama",      label: "Kerjasama",        icon: Handshake },
    { href: "/dereporting/pemegang-izin",  label: "Pemegang Izin",    icon: ShieldCheck },
    { href: "/dereporting/lain",           label: "Lainnya",          icon: FolderOpen },
];

export default function DeReportingLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const { user } = useAuth();

    return (
        <div className="flex min-h-screen bg-zinc-50 dark:bg-black text-zinc-900 dark:text-zinc-100">
            {/* Sidebar Navigasi */}
            <aside className="hidden md:flex flex-col w-64 bg-white dark:bg-zinc-950 border-r border-zinc-200 dark:border-zinc-800/50">
                {/* Header */}
                <div className="p-5 border-b border-zinc-200 dark:border-zinc-800/50">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-linear-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                                <BarChart3 className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h2 className="font-bold text-lg text-zinc-900 dark:text-white tracking-tight">DeReporting</h2>
                                <p className="text-[10px] text-violet-600 dark:text-violet-400 uppercase tracking-widest">Pelaporan & Data</p>
                            </div>
                        </div>
                        <ThemeToggle />
                    </div>
                    <ModuleSwitcher />
                </div>

                {/* Navigation */}
                <nav className="flex-1 overflow-y-auto p-3 space-y-1">
                    {SIDEBAR_ITEMS.map((item) => {
                        const isActive = pathname === item.href || (item.href !== "/dereporting" && pathname.startsWith(item.href));
                        return (
                            <Link key={item.href} href={item.href}
                                className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                                    isActive
                                        ? "bg-violet-500/10 text-violet-600 dark:text-violet-400 font-semibold"
                                        : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/50 hover:text-zinc-900 dark:hover:text-white"
                                }`}>
                                <item.icon className="w-4 h-4" />
                                {item.label}
                            </Link>
                        );
                    })}
                </nav>

                {/* Footer */}
                <div className="p-4 border-t border-zinc-200 dark:border-zinc-800/50">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-xl bg-linear-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm shadow-md">
                            {user?.name?.charAt(0) || "U"}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-zinc-900 dark:text-white truncate">
                                {user?.name || user?.nama_lengkap || "User"}
                            </p>
                            <Badge variant="secondary" className="text-[10px]">
                                {user?.role || "Pegawai"}
                            </Badge>
                        </div>
                    </div>
                    <LogoutButton />
                </div>
            </aside>

            {/* Konten Utama */}
            <main className="flex-1 overflow-auto bg-zinc-50 dark:bg-black">{children}</main>
        </div>
    );
}
