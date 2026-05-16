/* eslint-disable @next/next/no-img-element */
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, ChevronDown } from "lucide-react";

interface MenuItem {
  id: string;
  label: string;
  url: string;
  children?: MenuItem[];
}

// Hardcoded menu — tidak perlu fetch dari API
const MENUS: MenuItem[] = [
  { id: "1", label: "Beranda", url: "/" },
  {
    id: "2",
    label: "Profil",
    url: "/profil",
    children: [
      { id: "2a", label: "Sejarah", url: "/page/sejarah" },
      { id: "2b", label: "Organisasi", url: "/page/organisasi" },
      { id: "2c", label: "Kepala Balai", url: "/page/kepala-balai" },
    ],
  },
  { id: "3", label: "Informasi", url: "/informasi" },
  { id: "4", label: "Kawasan", url: "/kawasan" },
  { id: "5", label: "TSL", url: "/tsl" },
  { id: "6", label: "Galeri", url: "/galeri" },
  { id: "7", label: "Publikasi", url: "/publikasi" },
  { id: "8", label: "Hubungi Kami", url: "/hubungi-kami" },
];

export default function PublicNavbar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const isActive = (url: string) =>
    pathname === url || (url !== "/" && pathname.startsWith(url));

  return (
    <header
      className={`sticky top-0 z-50 transition-all duration-300 ${
        isScrolled
          ? "bg-white/95 backdrop-blur-md shadow-md"
          : "bg-white/95 backdrop-blur-md"
      } border-b border-gray-100`}
    >
      {/* Bar Atas (Info Strip) */}
      <div className="bg-green-800 text-white text-xs py-1.5">
        <div className="max-w-7xl mx-auto px-4 flex justify-between items-center">
          <span className="flex items-center gap-2">
            <span className="hidden sm:inline">📍</span>
            Balai Konservasi Sumber Daya Alam Kalimantan Timur
          </span>
          <div className="hidden sm:flex items-center gap-4">
            <span>📞 (0541) 200-662</span>
            <span>✉️ bksda.kaltim@gmail.com</span>
          </div>
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
                BKSDA Kaltim
              </p>
              <p className="text-[10px] text-gray-500 leading-tight">
                Kementerian LHK RI
              </p>
            </div>
          </Link>

          {/* Menu Desktop */}
          <div className="hidden lg:flex items-center gap-1">
            {MENUS.map((item) => (
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
                  <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl py-2 min-w-[180px] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                    {item.children.map((child) => (
                      <Link
                        key={child.id}
                        href={child.url}
                        className="block px-4 py-2.5 text-sm text-gray-600 hover:bg-green-50 hover:text-green-700 transition-colors"
                      >
                        {child.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* CTA Button Desktop */}
          <div className="hidden lg:block">
            <Link
              href="/login"
              className="px-4 py-2 bg-green-700 text-white text-xs font-bold rounded-lg hover:bg-green-600 transition-colors uppercase tracking-wider"
            >
              Portal Pegawai
            </Link>
          </div>

          {/* Tombol Hamburger Mobile */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="lg:hidden p-2 rounded-lg hover:bg-gray-100"
            aria-label="Toggle menu"
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
            {MENUS.map((item) => (
              <div key={item.id}>
                <Link
                  href={item.url}
                  onClick={() => !item.children && setMobileOpen(false)}
                  className={`block px-4 py-3 rounded-lg text-sm font-semibold transition-all ${
                    isActive(item.url)
                      ? "text-green-700 bg-green-50"
                      : "text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {item.label}
                </Link>
                {item.children?.map((child) => (
                  <Link
                    key={child.id}
                    href={child.url}
                    onClick={() => setMobileOpen(false)}
                    className="block pl-8 py-2 text-sm text-gray-500 hover:text-green-700"
                  >
                    {child.label}
                  </Link>
                ))}
              </div>
            ))}
            <div className="mt-3 px-4">
              <Link
                href="/login"
                className="block text-center px-4 py-2.5 bg-green-700 text-white text-sm font-bold rounded-lg"
              >
                Portal Pegawai
              </Link>
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}
