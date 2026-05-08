"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, FileText, Globe, Users, LayoutDashboard } from "lucide-react";

const SIDEBAR_ITEMS = [
    { href: "/dereporting",          label: "Dashboard",        icon: LayoutDashboard },
    { href: "/dereporting/internal", label: "Laporan Internal", icon: FileText },
    { href: "/dereporting/eksternal",label: "Laporan Publik",   icon: Globe },
    { href: "/dereporting/operator", label: "Operator",         icon: Users },
];

export default function DeReportingLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();

    return (
        <div className="flex min-h-screen bg-zinc-950">
            {/* Sidebar Navigasi */}
            <aside className="hidden md:flex flex-col w-64 bg-zinc-900/50 border-r border-zinc-800 p-4 gap-1">
                <div className="flex items-center gap-3 px-3 py-4 mb-4">
                    <BarChart3 className="w-7 h-7 text-violet-500" />
                    <h2 className="text-lg font-black text-white tracking-tight">DeReporting</h2>
                </div>
                {SIDEBAR_ITEMS.map((item) => {
                    const isActive = pathname === item.href || (item.href !== "/dereporting" && pathname.startsWith(item.href));
                    return (
                        <Link key={item.href} href={item.href}
                            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                                isActive
                                    ? "bg-violet-500/10 text-violet-400 border border-violet-500/20"
                                    : "text-zinc-400 hover:text-white hover:bg-zinc-800/50"
                            }`}>
                            <item.icon className="w-4 h-4" />
                            {item.label}
                        </Link>
                    );
                })}
            </aside>

            {/* Konten Utama */}
            <main className="flex-1 overflow-auto">{children}</main>
        </div>
    );
}
