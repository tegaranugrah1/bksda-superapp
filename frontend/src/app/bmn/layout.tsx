"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { LayoutDashboard, Package, Handshake, Wrench, Trash2, FileText, Building2, FileUp } from "lucide-react";
import { ModuleSwitcher } from "@/components/module-switcher";
import { LogoutButton } from "@/components/logout-button";
import { ThemeToggle } from "@/components/theme-toggle";
import { useAuth } from "@/hooks/useAuth";
import { useRole } from "@/hooks/useRole";
import { Badge } from "@/components/ui/badge";
import { RouteGuard } from "@/components/RouteGuard";
import { cn } from "@/lib/utils";

const bmnMenus = [
  { title: "Dashboard", path: "/bmn", icon: LayoutDashboard, minRole: "user" as const },
  { title: "Data Aset", path: "/bmn/assets", icon: Package, minRole: "user" as const },
  { title: "Peminjaman", path: "/bmn/loans", icon: Handshake, minRole: "user" as const },
  { title: "Pemeliharaan", path: "/bmn/maintenances", icon: Wrench, minRole: "user" as const },
  { title: "Import Review", path: "/bmn/import-review", icon: FileUp, minRole: "admin" as const },
  { title: "Aset Dihapus", path: "/bmn/disposal", icon: Trash2, minRole: "admin" as const },
  { title: "Laporan", path: "/bmn/reports", icon: FileText, minRole: "user" as const },
];

export default function BmnLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user } = useAuth();
  const { canWrite } = useRole();

  const visibleMenus = bmnMenus.filter(item => {
    if (item.minRole === "user") return true;
    if (item.minRole === "admin") return canWrite;
    return false;
  });

  return (
    <RouteGuard requiredModule="bmn">
      <div className="flex h-screen bg-slate-50 overflow-hidden">
        {/* Sidebar */}
        <aside className="hidden md:flex w-64 flex-col bg-white border-r border-slate-200">
          <div className="p-5 border-b border-slate-100">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-bold text-base text-slate-900 leading-none">BMN</h2>
                  <p className="text-[9px] font-bold text-emerald-600 uppercase tracking-[0.15em] mt-0.5">Barang Milik Negara</p>
                </div>
              </div>
              <ThemeToggle />
            </div>
            <ModuleSwitcher />
          </div>

          <nav className="flex-1 overflow-y-auto p-3 space-y-1">
            {visibleMenus.map((menu) => {
              const Icon = menu.icon;
              const isActive = menu.path === "/bmn" ? pathname === "/bmn" : pathname.startsWith(menu.path);
              return (
                <Link
                  key={menu.path}
                  href={menu.path}
                  className={cn(
                    "flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all",
                    isActive
                      ? "bg-emerald-50 text-emerald-700 font-semibold"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  )}
                >
                  <Icon className={cn("w-4 h-4", isActive ? "text-emerald-600" : "text-slate-400")} />
                  {menu.title}
                </Link>
              );
            })}
          </nav>

          <div className="p-4 border-t border-slate-100">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-600 flex items-center justify-center text-white font-bold text-sm">
                {user?.name?.charAt(0) || "U"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-900 truncate">{user?.name || "User"}</p>
                <Badge variant="secondary" className="text-[10px]">{user?.role || "Pegawai"}</Badge>
              </div>
            </div>
            <LogoutButton />
          </div>
        </aside>

        {/* Main */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </RouteGuard>
  );
}
