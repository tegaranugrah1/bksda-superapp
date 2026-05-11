/* eslint-disable @next/next/no-img-element */
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, ChevronDown } from "lucide-react";
import axios from "axios";

const API_BASE = process.env.NEXT_PUBLIC_API_URL;

interface MenuItem {
  id: string;
  label: string;
  url: string;
  children?: MenuItem[];
}

export default function PublicNavbar() {
  const pathname = usePathname();
  const [menus, setMenus] = useState<MenuItem[]>([]);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Tarik menu dari API publik (TANPA token auth!)
  useEffect(() => {
    axios
      .get(`${API_BASE}/cms/public/menus?posisi=header`)
      .then((res) => setMenus(res.data?.data || []))
      .catch(() => {
        // Fallback jika API belum siap
        setMenus([
          { id: "1", label: "Beranda", url: "/" },
          { id: "2", label: "Informasi", url: "/informasi" },
          { id: "3", label: "Kawasan", url: "/kawasan" },
          { id: "4", label: "Galeri", url: "/galeri" },
          { id: "5", label: "Profil", url: "/profil" },
          { id: "6", label: "TSL", url: "/tsl" },
          { id: "7", label: "Publikasi", url: "/publikasi" },
        ]);
      });
  }, []);

  const isActive = (url: string) =>
    pathname === url || (url !== "/" && pathname.startsWith(url));

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-100 shadow-sm">
      {/* Bar Atas (Info Strip) */}
      <div className="bg-green-800 text-white text-xs py-1.5">
        <div className="max-w-7xl mx-auto px-4 flex justify-between items-center">
          <span>Balai Konservasi Sumber Daya Alam</span>
          <span className="hidden sm:block">📞 (021) 123-4567</span>
        </div>
      </div>

      {/* Navbar Utama */}
      <nav className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo + Nama */}
          <Link href="/" className="flex items-center gap-3 shrink-0">
            <img
              src="/logo_bksda.png"
              alt="Logo BKSDA"
              className="h-10 w-10 object-contain"
            />
            <div className="hidden sm:block">
              <p className="text-sm font-black text-green-800 leading-tight">
                BKSDA
              </p>
              <p className="text-[10px] text-gray-500 leading-tight">
                Kementerian LHK RI
              </p>
            </div>
          </Link>

          {/* Menu Desktop */}
          <div className="hidden lg:flex items-center gap-1">
            {menus.map((item) => (
              <div key={item.id} className="relative group">
                <Link
                  href={item.url}
                  className={`flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-semibold transition-all ${
                    isActive(item.url)
                      ? "text-green-700 bg-green-50"
                      : "text-gray-600 hover:text-green-700 hover:bg-green-50/50"
                  }`}
                >
                  {item.label}
                  {item.children && item.children.length > 0 && (
                    <ChevronDown className="w-3 h-3" />
                  )}
                </Link>
                {/* Dropdown Sub-Menu */}
                {item.children && item.children.length > 0 && (
                  <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl py-2 min-w-[180px] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                    {item.children.map((child) => (
                      <Link
                        key={child.id}
                        href={child.url}
                        className="block px-4 py-2 text-sm text-gray-600 hover:bg-green-50 hover:text-green-700 transition-colors"
                      >
                        {child.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Tombol Hamburger Mobile */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="lg:hidden p-2 rounded-lg hover:bg-gray-100"
          >
            {mobileOpen ? (
              <X className="w-6 h-6 text-gray-700" />
            ) : (
              <Menu className="w-6 h-6 text-gray-700" />
            )}
          </button>
        </div>

        {/* Menu Mobile (Slide Down) */}
        {mobileOpen && (
          <div className="lg:hidden border-t border-gray-100 py-3 animate-in slide-in-from-top duration-200">
            {menus.map((item) => (
              <Link
                key={item.id}
                href={item.url}
                onClick={() => setMobileOpen(false)}
                className={`block px-4 py-3 rounded-lg text-sm font-semibold transition-all ${
                  isActive(item.url)
                    ? "text-green-700 bg-green-50"
                    : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </div>
        )}
      </nav>
    </header>
  );
}





