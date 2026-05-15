"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Newspaper,
  Tag,
  Building2,
  MapPin,
  TreePine,
  UserCircle,
  Camera,
  Video,
  Link as LinkIcon,
  BookOpen,
  FileImage,
  Image,
  Scale,
  Settings,
  Inbox,
} from "lucide-react";
import { RouteGuard } from "@/components/RouteGuard";
import { ModuleSwitcher } from "@/components/module-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { useRole } from "@/hooks/useRole";

// Definisi Navigasi dengan Kelompok Bertema
const SIDEBAR_SECTIONS = [
  {
    label: "Umum",
    items: [
      { href: "/cms", label: "Dashboard", icon: LayoutDashboard, minRole: "user" as const },
      { href: "/cms/informasi", label: "Berita", icon: Newspaper, minRole: "user" as const },
      { href: "/cms/categories", label: "Kategori", icon: Tag, minRole: "admin" as const },
      { href: "/cms/pesan", label: "Pesan Masuk", icon: Inbox, minRole: "user" as const },
    ],
  },
  {
    label: "Institusi",
    items: [
      { href: "/cms/profil", label: "Profil", icon: Building2, minRole: "admin" as const },
      { href: "/cms/kawasan", label: "Kawasan", icon: MapPin, minRole: "user" as const },
      { href: "/cms/tsl", label: "TSL", icon: TreePine, minRole: "user" as const },
      { href: "/cms/kepala", label: "Kepala Kantor", icon: UserCircle, minRole: "admin" as const },
    ],
  },
  {
    label: "Media",
    items: [
      { href: "/cms/photos", label: "Galeri Foto", icon: Camera, minRole: "user" as const },
      { href: "/cms/videos", label: "Galeri Video", icon: Video, minRole: "user" as const },
      { href: "/cms/links", label: "Link Terkait", icon: LinkIcon, minRole: "admin" as const },
    ],
  },
  {
    label: "Publikasi",
    items: [
      { href: "/cms/buku", label: "Buku", icon: BookOpen, minRole: "user" as const },
      { href: "/cms/leaflet", label: "Leaflet", icon: FileImage, minRole: "user" as const },
      { href: "/cms/poster", label: "Poster", icon: Image, minRole: "user" as const },
      { href: "/cms/regulasi", label: "Regulasi", icon: Scale, minRole: "user" as const },
    ],
  },
];

export default function CMSLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { canWrite } = useRole();

  return (
    <RouteGuard requiredModule="cms">
      <div className="flex min-h-screen bg-zinc-950">
        {/* Sidebar Navigasi Raksasa */}
        <aside className="hidden md:flex flex-col w-64 bg-zinc-900/50 border-r border-zinc-800 p-4 gap-0.5 overflow-y-auto">
          {/* Header Modul */}
          <div className="flex items-center justify-between px-3 py-4 mb-2">
            <div className="flex items-center gap-3">
              <Settings className="w-7 h-7 text-teal-500" />
              <h2 className="text-lg font-black text-white tracking-tight">
                CMS Panel
              </h2>
            </div>
            <ThemeToggle />
          </div>
          <div className="mb-4">
            <ModuleSwitcher />
          </div>

          {/* Render Kelompok Navigasi */}
          {SIDEBAR_SECTIONS.map((section, sIdx) => {
            const visibleItems = section.items.filter(item => {
              if (item.minRole === "user") return true;
              if (item.minRole === "admin") return canWrite;
              return false;
            });
            if (visibleItems.length === 0) return null;
            return (
            <div key={section.label} className={sIdx > 0 ? "mt-4" : ""}>
              {/* Label Pemisah Seksi */}
              <p className="px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-zinc-600">
                {section.label}
              </p>
              {visibleItems.map((item) => {
                const isActive =
                  pathname === item.href ||
                  (item.href !== "/cms" && pathname.startsWith(item.href));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                      isActive
                        ? "bg-teal-500/10 text-teal-400 border border-teal-500/20"
                        : "text-zinc-400 hover:text-white hover:bg-zinc-800/50"
                    }`}
                  >
                    <item.icon className="w-4 h-4" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
            );
          })}
        </aside>

        {/* Konten Utama */}
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </RouteGuard>
  );
}
