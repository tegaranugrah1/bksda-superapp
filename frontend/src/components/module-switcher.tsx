"use client";

import {
  ChevronDown,
  LayoutGrid,
  Users,
  Box,
  Archive,
  FileText,
  Settings,
  Mail,
  Banknote,
} from "lucide-react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";

// Module definitions with paths
const moduleDefinitions = [
  {
    name: "Portal Utama",
    slug: "portal",
    icon: LayoutGrid,
    href: "/portal",
    color: "bg-zinc-100 text-zinc-900",
  },
  {
    name: "Kepegawaian",
    slug: "kepegawaian",
    icon: Users,
    href: "/kepegawaian",
    color: "bg-blue-100 text-blue-700",
  },
  {
    name: "BMN & Aset",
    slug: "bmn",
    icon: Box,
    href: "/bmn",
    color: "bg-emerald-100 text-emerald-700",
  },
  {
    name: "Keuangan",
    slug: "keuangan",
    icon: Banknote,
    href: "/keuangan",
    color: "bg-amber-100 text-amber-700",
  },
  {
    name: "Inventory",
    slug: "inventory",
    icon: Archive,
    href: "/inventory",
    color: "bg-orange-100 text-orange-700",
  },
  {
    name: "D-Reporting",
    slug: "dereporting",
    icon: FileText,
    href: "/dereporting",
    color: "bg-violet-100 text-violet-700",
  },
  {
    name: "CMS Panel",
    slug: "cms",
    icon: Settings,
    href: "/cms",
    color: "bg-teal-100 text-teal-700",
  },
  {
    name: "Persuratan",
    slug: "surat",
    icon: Mail,
    href: "/surat",
    color: "bg-emerald-100 text-emerald-700",
  },
];

// Get module by pathname
function getActiveModule(pathname: string) {
  // Remove trailing slash and get first segment
  const cleanPath = pathname.replace(/\/$/, "");
  const segment = cleanPath.split("/")[1] || "portal";

  // Find matching module
  const foundModule = moduleDefinitions.find((m) => m.slug === segment);
  return foundModule || moduleDefinitions[0]; // Default to portal
}

export function ModuleSwitcher() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const { user } = useAuth();
  const activeModule = getActiveModule(pathname);

  // Filter modules based on user access
  const visibleModules = moduleDefinitions.filter((mod) => {
    if (mod.slug === "portal") return true; // Portal always visible
    if (user?.role === "super_admin") return true; // Super admin sees all
    return user?.access_modules?.includes(mod.slug);
  });

  useEffect(() => {
    const close = () => setIsOpen(false);

    window.addEventListener("pageshow", close);
    window.addEventListener("popstate", close);

    return () => {
      window.removeEventListener("pageshow", close);
      window.removeEventListener("popstate", close);
    };
  }, []);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 px-3 py-2 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-emerald-500/50 transition-all shadow-sm group"
      >
        <div
          className={`w-8 h-8 rounded-lg flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform ${activeModule.color}`.replace(
            "bg-zinc-100 text-zinc-900",
            "bg-emerald-500",
          )}
        >
          <activeModule.icon className="w-5 h-5" />
        </div>
        <div className="text-left flex-1 min-w-0">
          <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider leading-none mb-1">
            Modul Aktif
          </p>
          <p className="text-sm font-bold text-zinc-900 dark:text-white leading-none">
            {activeModule.name}
          </p>
        </div>
        <ChevronDown
          className={`w-4 h-4 text-zinc-400 transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute top-full left-0 mt-2 w-full min-w-[240px] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-200">
            {visibleModules.map((mod) => (
              <Link
                key={mod.slug}
                href={mod.href}
                onClick={() => setIsOpen(false)}
                className={`flex items-center gap-3 p-3 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors group ${pathname === mod.href || (pathname.startsWith(mod.href + "/") && mod.href !== "/portal") ? "bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800" : ""}`}
              >
                <div
                  className={`w-10 h-10 rounded-xl ${mod.color} flex items-center justify-center transition-transform group-hover:scale-110`}
                >
                  <mod.icon className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-zinc-900 dark:text-white">
                    {mod.name}
                  </p>
                  <p className="text-[11px] text-zinc-500">
                    Klik untuk berpindah modul
                  </p>
                </div>
                {pathname === mod.href ||
                (pathname.startsWith(mod.href + "/") &&
                  mod.href !== "/portal") ? (
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                ) : null}
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
