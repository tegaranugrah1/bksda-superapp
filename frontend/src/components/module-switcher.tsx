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
  Send,
} from "lucide-react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";

// Module definitions aligned with docs/DESIGN_SYSTEM_COLORS.md
const moduleDefinitions = [
  {
    name: "Portal Utama",
    slug: "portal",
    icon: LayoutGrid,
    href: "/portal",
    color: "bg-[#edf3ee] text-[#1e5433] dark:bg-[#0d281a] dark:text-[#86efac]",
    solidColor: "bg-[#1e5433] text-white dark:bg-[#86efac] dark:text-[#0f172a]",
  },
  {
    name: "Kepegawaian",
    slug: "kepegawaian",
    icon: Users,
    href: "/kepegawaian",
    color: "bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300",
    solidColor: "bg-blue-600 text-white dark:bg-blue-400 dark:text-[#0f172a]",
  },
  {
    name: "BMN & Aset",
    slug: "bmn",
    icon: Box,
    href: "/bmn",
    color: "bg-emerald-50 text-[#047857] dark:bg-emerald-950/60 dark:text-[#6ee7b7]",
    solidColor: "bg-[#047857] text-white dark:bg-[#34d399] dark:text-[#0f172a]",
  },
  {
    name: "Keuangan",
    slug: "keuangan",
    icon: Banknote,
    href: "/keuangan",
    color: "bg-teal-50 text-teal-800 dark:bg-teal-950/60 dark:text-teal-300",
    solidColor: "bg-[#0f766e] text-white dark:bg-[#2dd4bf] dark:text-[#0f172a]",
  },
  {
    name: "Surat Tugas",
    slug: "surat-tugas",
    icon: Send,
    href: "/surat-tugas",
    color: "bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300",
    solidColor: "bg-[#0369a1] text-white dark:bg-[#38bdf8] dark:text-[#0f172a]",
  },
  {
    name: "Persuratan",
    slug: "surat",
    icon: Mail,
    href: "/surat",
    color: "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300",
    solidColor: "bg-[#4f46e5] text-white dark:bg-[#818cf8] dark:text-[#0f172a]",
  },
  {
    name: "D-Reporting",
    slug: "dereporting",
    icon: FileText,
    href: "/dereporting",
    color: "bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300",
    solidColor: "bg-[#b45309] text-white dark:bg-[#fbbf24] dark:text-[#0f172a]",
  },
  {
    name: "Inventory",
    slug: "inventory",
    icon: Archive,
    href: "/inventory",
    color: "bg-orange-50 text-orange-800 dark:bg-orange-950/60 dark:text-orange-300",
    solidColor: "bg-orange-600 text-white dark:bg-orange-400 dark:text-[#0f172a]",
  },
  {
    name: "CMS Panel",
    slug: "cms",
    icon: Settings,
    href: "/cms",
    color: "bg-slate-100 text-slate-700 dark:bg-zinc-800 dark:text-zinc-300",
    solidColor: "bg-slate-800 text-white dark:bg-zinc-200 dark:text-zinc-900",
  },
];

// Get module by pathname
function getActiveModule(pathname: string) {
  const cleanPath = pathname.replace(/\/$/, "");
  const segment = cleanPath.split("/")[1] || "portal";
  const foundModule = moduleDefinitions.find((m) => m.slug === segment);
  return foundModule || moduleDefinitions[0];
}

export function ModuleSwitcher() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const { user } = useAuth();
  const activeModule = getActiveModule(pathname);

  // Filter modules based on user access
  const visibleModules = moduleDefinitions.filter((mod) => {
    if (mod.slug === "portal") return true;
    if (user?.role === "super_admin") return true;
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
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-3 px-3 py-2 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700 transition-all shadow-2xs group cursor-pointer"
      >
        <div
          className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold shadow-xs group-hover:scale-105 transition-transform ${activeModule.solidColor || activeModule.color}`}
        >
          <activeModule.icon className="w-4 h-4" />
        </div>
        <div className="text-left flex-1 min-w-0">
          <p className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider leading-none mb-1">
            Modul Aktif
          </p>
          <p className="text-xs font-bold text-slate-900 dark:text-white leading-none truncate">
            {activeModule.name}
          </p>
        </div>
        <ChevronDown
          className={`w-4 h-4 text-slate-400 transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute top-full left-0 mt-2 w-full min-w-[240px] bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-xl p-2 z-50 animate-in fade-in zoom-in-95 duration-200 space-y-1">
            {visibleModules.map((mod) => {
              const isCurrent = activeModule.slug === mod.slug;
              return (
                <Link
                  key={mod.slug}
                  href={mod.href}
                  onClick={() => setIsOpen(false)}
                  className={`flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-zinc-800/60 transition-colors group ${
                    isCurrent
                      ? "bg-slate-100/80 dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700"
                      : "border border-transparent"
                  }`}
                >
                  <div
                    className={`w-9 h-9 rounded-xl ${mod.color} flex items-center justify-center transition-transform group-hover:scale-105 shrink-0`}
                  >
                    <mod.icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-bold truncate ${isCurrent ? "text-slate-900 dark:text-white" : "text-slate-700 dark:text-zinc-300"}`}>
                      {mod.name}
                    </p>
                    <p className="text-[10px] text-slate-400 dark:text-zinc-500 truncate">
                      {isCurrent ? "Sedang aktif" : "Buka modul"}
                    </p>
                  </div>
                  {isCurrent && (
                    <div className="w-1.5 h-1.5 rounded-full bg-slate-600 dark:bg-zinc-300 shrink-0" />
                  )}
                </Link>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
