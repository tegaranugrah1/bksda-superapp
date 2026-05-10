"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    LayoutDashboard,
    PackageSearch,
    Building2,
    ArrowDownToLine,
    ArrowUpFromLine,
    History,
} from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { LogoutButton } from "@/components/logout-button";
import { ModuleSwitcher } from "@/components/module-switcher";

const menuItems = [
    { title: "Dashboard", href: "/inventory", icon: LayoutDashboard },
    { title: "Katalog Barang", href: "/inventory/items", icon: PackageSearch },
    { title: "Jaringan Kantor", href: "/inventory/offices", icon: Building2 },
    { title: "Stok Masuk", href: "/inventory/stock-in", icon: ArrowDownToLine },
    { title: "Distribusi Keluar", href: "/inventory/stock-out", icon: ArrowUpFromLine },
    { title: "Riwayat Mutasi", href: "/inventory/transactions", icon: History },
];

export function InventorySidebar() {
    const pathname = usePathname();
    const { user } = useAuth();

    return (
        <aside className="w-64 shrink-0 border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 hidden md:flex flex-col">
            {/* Header */}
            <div className="p-5 border-b border-zinc-200 dark:border-zinc-800/50">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-linear-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                            <PackageSearch className="w-5 h-5 text-white" />
                        </div>
                        <div>
                        <div>
                            <h2 className="font-bold text-zinc-900 dark:text-white">Inventory</h2>
                        </div>
                    </div>
                    <ThemeToggle />
                </div>
                <ModuleSwitcher />
            </div>

            {/* Navigation */}
            <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
                {menuItems.map((item) => {
                    const isActive = pathname === item.href;

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-300 font-medium text-sm ${
                                isActive
                                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold"
                                    : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/50 hover:text-zinc-900 dark:hover:text-white"
                            }`}
                        >
                            <item.icon
                                className={`w-5 h-5 ${isActive ? "text-emerald-500" : "text-zinc-500"}`}
                            />
                            {item.title}
                        </Link>
                    );
                })}
            </nav>

            {/* Footer */}
            <div className="p-4 border-t border-zinc-200 dark:border-zinc-800/50">
                <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-linear-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-bold text-sm shadow-md">
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
    );
}
