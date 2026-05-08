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

    return (
        <aside className="w-64 shrink-0 border-r border-zinc-800 bg-zinc-950/50 backdrop-blur-xl hidden md:flex flex-col">
            {/* Header / Kop Sidebar */}
            <div className="h-16 flex items-center px-6 border-b border-zinc-800">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center mr-3">
                    <PackageSearch className="w-5 h-5 text-emerald-500" />
                </div>
                <h2 className="font-bold text-zinc-100 tracking-wide">BKSDA Logistik</h2>
            </div>

            {/* Area Daftar Navigasi */}
            <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-1">
                {menuItems.map((item) => {
                    const isActive = pathname === item.href;

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-300 font-medium text-sm ${
                                isActive
                                    ? "bg-emerald-500/10 text-emerald-400"
                                    : "text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200"
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

            {/* Area Pijakan Bawah (Footer Sidebar) */}
            <div className="p-4 border-t border-zinc-800">
                <div className="p-3 bg-zinc-900 rounded-xl border border-zinc-800 text-xs text-zinc-500 text-center">
                    Sistem Manajemen Inventaris
                    <br />
                    <span className="font-semibold text-zinc-400">Versi 2.0</span>
                </div>
            </div>
        </aside>
    );
}
