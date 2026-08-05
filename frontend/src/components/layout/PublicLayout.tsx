/* eslint-disable @typescript-eslint/no-explicit-any, @next/next/no-css-tags */
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import axios from "axios";
import { cn } from "@/lib/utils";

const API = process.env.NEXT_PUBLIC_API_URL;

// Hardcoded menu (tidak pakai menu management)
const DEFAULT_MENU = [
  { name: "Beranda", url: "/" },
  {
    name: "Profil",
    url: "/profil",
    children: [
      { name: "Sejarah", url: "/page/sejarah" },
      { name: "Organisasi", url: "/page/organisasi" },
      { name: "Kepala Balai", url: "/page/kepala-balai" },
    ],
  },
  { name: "TSL", url: "/tsl" },
  { name: "Kawasan", url: "/kawasan" },
  { name: "Informasi", url: "/informasi" },
  { name: "Galeri", url: "/galeri" },
  { name: "Publikasi", url: "/publikasi" },
];

interface WebsiteSettings {
  alamat?: string;
  telepon?: string;
  email?: string;
  logo_path?: string;
  facebook?: string;
  instagram?: string;
  youtube?: string;
}

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [settings, setSettings] = useState<WebsiteSettings>({});
  const [isSticky, setIsSticky] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [expandedMenuIndexes, setExpandedMenuIndexes] = useState<number[]>([]);

  useEffect(() => {
    axios
      .get(`${API}/cms/public/website`)
      .then((res) => {
        setSettings(res.data?.data || {});
        setIsLoaded(true);
      })
      .catch(() => setIsLoaded(true));
  }, []);

  useEffect(() => {
    const handleScroll = () => setIsSticky(window.scrollY > 100);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navbarItems = DEFAULT_MENU;

  return (
    <div className={cn("boxed_wrapper", isLoaded ? "is-ready" : "opacity-0")}>
      <link href="/assets/css/font-awesome-all.css" rel="stylesheet" />
      <link
        rel="stylesheet"
        href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css"
      />
      <link href="/assets/css/flaticon.css" rel="stylesheet" />
      <link href="/assets/css/bootstrap.css" rel="stylesheet" />
      <link href="/assets/css/animate.css" rel="stylesheet" />
      <link href="/assets/css/color.css" rel="stylesheet" />
      <link href="/assets/css/style.css" rel="stylesheet" />
      <link href="/assets/css/responsive.css" rel="stylesheet" />

      <style
        dangerouslySetInnerHTML={{
          __html: `
            .main-header.header-style-one { width: 100% !important; left: 0 !important; right: 0 !important; position: relative !important; z-index: 1000; }
            .main-header .header-top, .main-header .header-lower { width: 100% !important; padding-left: 0 !important; padding-right: 0 !important; }
            .main-header .header-top .top-inner, .main-header .header-lower .outer-box { 
                max-width: 100% !important; width: 100% !important; margin: 0 !important; padding: 0 40px !important; 
                display: flex !important; justify-content: space-between !important; 
            }
            @keyframes slideDown {
                from { transform: translateY(-100%); }
                to { transform: translateY(0); }
            }
            .sticky-header-active {
                position: fixed !important; top: 0 !important; left: 0 !important; width: 100% !important;
                background: rgba(255, 255, 255, 0.85) !important; backdrop-filter: blur(12px);
                box-shadow: 0 4px 30px rgba(0,0,0,0.05);
                z-index: 5000 !important; border-bottom: 1px solid rgba(255,255,255,0.3);
                animation: slideDown 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
            }
            .dropdown-menu-custom {
                position: absolute; top: 100%; left: 0; background: #fff; min-width: 220px; 
                box-shadow: 0 10px 30px rgba(0,0,0,0.1); opacity: 0; visibility: hidden; transition: all 0.3s ease;
                z-index: 100; padding: 15px 0; border-top: 3px solid #fdb913;
            }
            .navigation li:hover .dropdown-menu-custom { opacity: 1; visibility: visible; }
            .main-header .navigation > li > a { color: #222 !important; visibility: visible !important; opacity: 1 !important; display: block !important; font-weight: 600 !important; }
            .header-lower { background: #fff !important; transition: all 0.3s ease; }
            .whatsapp-float {
                position: fixed; width: 60px; height: 60px; bottom: 40px; right: 40px; background-color: #25d366;
                color: #FFF !important; border-radius: 50px; display: flex; align-items: center; justify-content: center;
                font-size: 30px; box-shadow: 2px 2px 3px rgba(0,0,0,0.2); z-index: 9999; transition: all 0.3s ease;
            }
            .whatsapp-float:hover { transform: scale(1.1); background-color: #128C7E; color: white !important; }
            .is-ready { opacity: 1 !important; visibility: visible !important; }
            .boxed_wrapper { transition: opacity 0.5s ease; }
          `,
        }}
      />

      <div className="page_wrapper">
        <header className="main-header header-style-one">
          <div className="header-top">
            <div className="top-inner">
              <div className="top-left">
                <ul className="info clearfix">
                  <li>
                    <i className="flaticon-pin"></i>
                    {settings.alamat || "Samarinda, Kalimantan Timur"}
                  </li>
                  <li>
                    <i className="flaticon-clock"></i>Senin-Kamis 07:30 - 16:00
                    WITA
                  </li>
                  <li>
                    <i className="fa-solid fa-phone me-2"></i>
                    {settings.telepon || "(0541) 200-662"}
                  </li>
                </ul>
              </div>
              <div className="top-right">
                <ul className="social-links clearfix">
                  <li>
                    <a href={settings.instagram || "#"}>
                      <i className="fab fa-instagram"></i>
                    </a>
                  </li>
                  <li>
                    <a href={settings.facebook || "#"}>
                      <i className="fab fa-facebook-f"></i>
                    </a>
                  </li>
                  <li>
                    <a href={settings.youtube || "#"}>
                      <i className="fab fa-youtube"></i>
                    </a>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <div
            className="header-lower-placeholder"
            style={{
              minHeight: isSticky ? "108px" : "0",
              transition: "min-height 0s",
            }}
          >
            <div
              className={cn(
                "header-lower",
                isSticky && "sticky-header-active"
              )}
            >
              <div className="outer-box flex items-center justify-between w-full px-2 lg:px-8">
                <div className="logo-box shrink-0 pl-2 lg:pl-0">
                  <figure className="logo">
                    <Link href="/" className="block">
                      <div
                        className={cn(
                          "relative transition-all duration-400",
                          isSticky
                            ? "w-[180px] lg:w-[200px] h-[40px] lg:h-[45px]"
                            : "w-[220px] xl:w-[260px] h-[50px] xl:h-[60px]"
                        )}
                      >
                        <Image
                          src="/logo_bksda.png"
                          alt="BKSDA"
                          fill
                          style={{
                            objectFit: "contain",
                            objectPosition: "left center",
                          }}
                          priority
                        />
                      </div>
                    </Link>
                  </figure>
                </div>
                <div className="menu-area flex flex-1 justify-center mx-auto px-1 lg:px-2 mr-4 lg:mr-8 xl:mr-12">
                  <nav className="main-menu hidden lg:block">
                    <ul className="navigation flex items-center gap-2 lg:gap-4 xl:gap-6 justify-center">
                      {navbarItems.map((item, idx) => (
                        <li key={idx} className="relative group py-6">
                          <Link
                            href={item.url}
                            className="hover:text-[#fdb913] transition-colors whitespace-nowrap text-[13px] xl:text-[14px]"
                          >
                            {item.name}
                          </Link>
                          {item.children && item.children.length > 0 && (
                            <ul className="dropdown-menu-custom">
                              {item.children.map(
                                (child: any, cidx: number) => (
                                  <li key={cidx}>
                                    <Link
                                      href={child.url}
                                      className="block px-6 py-2 hover:text-[#fdb913] hover:pl-8 transition-all whitespace-nowrap"
                                    >
                                      {child.name}
                                    </Link>
                                  </li>
                                )
                              )}
                            </ul>
                          )}
                        </li>
                      ))}
                    </ul>
                  </nav>
                </div>
                <div className="menu-right-content flex items-center justify-end shrink-0 pr-2 lg:pr-10">
                  <div className="hidden lg:flex items-center gap-5">
                    <div className="search-box-outer flex-none relative">
                      <button
                        className="search-box-btn bg-transparent border-none text-xl hover:text-[#fdb913] transition-colors"
                        type="button"
                        aria-label="Search"
                        onClick={() => setIsSearchOpen(!isSearchOpen)}
                      >
                        <i
                          className={
                            isSearchOpen
                              ? "fa-solid fa-xmark"
                              : "flaticon-magnifying-glass"
                          }
                        ></i>
                      </button>
                      <div
                        className={cn(
                          "absolute right-0 top-full mt-6 w-[280px] bg-white shadow-xl rounded border border-gray-100 transition-all duration-300 origin-top-right z-50",
                          isSearchOpen
                            ? "scale-100 opacity-100 visible pointer-events-auto"
                            : "scale-95 opacity-0 invisible pointer-events-none"
                        )}
                      >
                        <form
                          method="get"
                          action="/search"
                          className="p-3 relative flex items-center"
                        >
                          <input
                            type="text"
                            name="q"
                            placeholder="Cari disini..."
                            className="w-full bg-gray-50 text-gray-700 text-sm px-4 py-3 rounded border border-gray-200 focus:outline-none focus:border-[#fdb913] focus:ring-1 focus:ring-[#fdb913] transition-all pr-12"
                          />
                          <button
                            type="submit"
                            className="absolute right-6 text-gray-400 hover:text-[#fdb913] transition-colors"
                          >
                            <i className="flaticon-magnifying-glass text-lg"></i>
                          </button>
                        </form>
                      </div>
                    </div>
                    <div className="btn-box flex-none m-0 p-0">
                      <Link
                        href="/login"
                        className="theme-btn btn-one whitespace-nowrap"
                        style={{ padding: "10px 18px", fontSize: "12px" }}
                      >
                        PORTAL PEGAWAI
                      </Link>
                    </div>
                  </div>
                  <button
                    className="lg:hidden inline-block text-2xl text-gray-800 focus:outline-none ml-4"
                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                  >
                    <i
                      className={
                        isMobileMenuOpen
                          ? "fa-solid fa-xmark text-4xl"
                          : "fa-solid fa-bars text-3xl"
                      }
                    ></i>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Mobile Menu Overlay */}
          <div
            className={cn(
              "fixed inset-0 z-[1000] lg:hidden transition-all duration-300",
              isMobileMenuOpen
                ? "opacity-100 visible pointer-events-auto"
                : "opacity-0 invisible pointer-events-none"
            )}
          >
            <div
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              onClick={() => setIsMobileMenuOpen(false)}
            ></div>
            <div
              className={cn(
                "absolute right-0 top-0 bottom-0 w-[85vw] max-w-[400px] bg-white shadow-2xl flex flex-col pt-6 px-8 md:px-12 pb-20 overflow-y-auto transition-transform duration-300 transform",
                isMobileMenuOpen ? "translate-x-0" : "translate-x-full"
              )}
            >
              <div className="flex justify-center items-center mb-6 mt-2 pb-4 border-b border-gray-100 relative">
                <Image
                  src="/logo_bksda.png"
                  alt="Logo BKSDA"
                  width={140}
                  height={40}
                  className="object-contain"
                />
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="absolute right-0 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center text-gray-900 hover:text-[#fdb913] transition-colors"
                >
                  <i className="fa-solid fa-xmark text-xl"></i>
                </button>
              </div>
              <nav className="flex flex-col">
                {navbarItems.map((item, idx) => {
                  const isExpanded = expandedMenuIndexes.includes(idx);
                  const toggleMenu = (e: React.MouseEvent) => {
                    if (item.children && item.children.length > 0) {
                      e.preventDefault();
                      setExpandedMenuIndexes(
                        isExpanded
                          ? expandedMenuIndexes.filter((i) => i !== idx)
                          : [...expandedMenuIndexes, idx]
                      );
                    } else {
                      setIsMobileMenuOpen(false);
                    }
                  };
                  return (
                    <div
                      key={idx}
                      className="flex flex-col border-b border-gray-100 last:border-0"
                    >
                      <Link
                        href={item.url}
                        className="py-4 px-2 md:px-4 text-base font-bold text-gray-900 hover:text-[#fdb913] transition-colors flex justify-between items-center"
                        onClick={toggleMenu}
                      >
                        <span className="capitalize">
                          {item.name.toLowerCase()}
                        </span>
                        {item.children && item.children.length > 0 ? (
                          <i
                            className={cn(
                              "fa-solid fa-chevron-down text-sm text-gray-400 transition-transform duration-200",
                              isExpanded ? "rotate-180" : ""
                            )}
                          ></i>
                        ) : (
                          <i className="fa-solid fa-arrow-right text-sm text-gray-300"></i>
                        )}
                      </Link>
                      {item.children && item.children.length > 0 && (
                        <div
                          className={cn(
                            "flex-col pb-4 pl-4 ml-2 overflow-hidden transition-all duration-300",
                            isExpanded
                              ? "flex opacity-100 max-h-[500px]"
                              : "hidden opacity-0 max-h-0 pb-0"
                          )}
                        >
                          {item.children.map((child: any, cidx: number) => (
                            <Link
                              key={cidx}
                              href={child.url}
                              className="py-3 px-2 md:px-4 text-[15px] font-semibold text-gray-600 hover:text-[#fdb913] transition-colors flex items-center justify-between pr-2"
                              onClick={() => setIsMobileMenuOpen(false)}
                            >
                              <span className="capitalize">
                                {child.name.toLowerCase()}
                              </span>
                              <i className="fa-solid fa-arrow-right text-[11px] text-gray-300"></i>
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </nav>
            </div>
          </div>
        </header>

        <main className="min-h-screen bg-gray-50">{children}</main>

        <footer
          className="main-footer bg-[#0B1120] text-gray-400 pb-12 relative overflow-hidden font-sans border-t-[3px] border-[#0B1120]"
          style={{ paddingTop: "3rem" }}
        >
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#fdb913] via-[#ff8c00] to-[#fdb913]"></div>
          <div className="w-full mx-auto px-6 md:px-12 relative z-10 pt-4 overflow-hidden">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-y-12 gap-x-8 lg:gap-x-12 mb-16">
              {/* Col 1: Brand */}
              <div className="lg:pr-6">
                <div className="mb-6 flex items-center gap-4">
                  <div className="relative w-64 h-18 shrink-0">
                    <Image
                      src="/logo_bksda.png"
                      alt="BKSDA"
                      fill
                      style={{
                        objectFit: "contain",
                        objectPosition: "left center",
                      }}
                      className="drop-shadow-lg"
                    />
                  </div>
                </div>
                <p className="text-sm leading-relaxed text-gray-400 font-light pr-4 mt-2">
                  Unit Pelaksana Teknis di bawah Direktorat Jenderal KSDAE,
                  Kementerian Lingkungan Hidup dan Kehutanan RI.
                </p>
              </div>

              {/* Col 2: Navigasi */}
              <div>
                <h5 className="text-white font-bold text-base mb-6 tracking-wider capitalize">
                  Navigasi Cepat
                </h5>
                <ul className="space-y-4 text-sm font-medium text-gray-400">
                  <li>
                    <Link
                      href="/"
                      className="hover:text-white transition-colors flex items-center gap-2"
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-gray-700"></div>
                      Beranda
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/profil"
                      className="hover:text-white transition-colors flex items-center gap-2"
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-gray-700"></div>
                      Profil Balai
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/tsl"
                      className="hover:text-white transition-colors flex items-center gap-2"
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-gray-700"></div>
                      Satwa Dilindungi
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/kawasan"
                      className="hover:text-white transition-colors flex items-center gap-2"
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-gray-700"></div>
                      Kawasan Konservasi
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/publikasi"
                      className="hover:text-white transition-colors flex items-center gap-2"
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-gray-700"></div>
                      Publikasi & Regulasi
                    </Link>
                  </li>
                </ul>
              </div>

              {/* Col 3: Contact */}
              <div>
                <ul className="space-y-5 text-sm font-medium">
                  <li className="flex gap-4 items-start">
                    <div className="w-10 h-10 rounded-full bg-[#1a1f2e] flex items-center justify-center shrink-0 border border-gray-800 mt-1">
                      <i className="flaticon-pin text-sm text-gray-300"></i>
                    </div>
                    <div className="flex flex-col pt-0.5">
                      <span className="text-white font-semibold mb-1">
                        Indonesia
                      </span>
                      <span className="leading-relaxed text-gray-400 font-light">
                        {settings.alamat || "Samarinda, Kalimantan Timur"}
                      </span>
                    </div>
                  </li>
                  <li className="flex gap-4 items-center">
                    <div className="w-10 h-10 rounded-full bg-[#1a1f2e] flex items-center justify-center shrink-0 border border-gray-800">
                      <i className="flaticon-telephone text-sm text-gray-300"></i>
                    </div>
                    <span className="text-white font-bold tracking-wide">
                      {settings.telepon || "(0541) 200-662"}
                    </span>
                  </li>
                  <li className="flex gap-4 items-center">
                    <div className="w-10 h-10 rounded-full bg-[#1a1f2e] flex items-center justify-center shrink-0 border border-gray-800">
                      <i className="flaticon-email text-sm text-gray-300"></i>
                    </div>
                    <span className="text-[#10b981] font-bold tracking-wide break-all">
                      {settings.email || "bksda.kaltim@gmail.com"}
                    </span>
                  </li>
                </ul>
              </div>

              {/* Col 4: Tautan & Social */}
              <div className="lg:pl-4">
                <h5 className="text-white font-bold text-base mb-6 tracking-wider capitalize">
                  Tautan Terkait
                </h5>
                <p className="text-sm leading-relaxed text-gray-400 font-light mb-6">
                  Kunjungi tautan di lingkup Kementerian LHK untuk mendapatkan
                  informasi terkait program lainnya.
                </p>
                <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-sm font-medium text-gray-400 mb-8">
                  <a
                    href="https://www.menlhk.go.id"
                    target="_blank"
                    className="hover:text-white transition-colors"
                  >
                    MENLHK
                  </a>
                  <a
                    href="http://ksdae.menlhk.go.id"
                    target="_blank"
                    className="hover:text-white transition-colors"
                  >
                    Ditjen KSDAE
                  </a>
                  <a
                    href="https://ppid.menlhk.go.id"
                    target="_blank"
                    className="hover:text-white transition-colors"
                  >
                    PPID KLHK
                  </a>
                </div>
                <div className="flex items-center gap-3">
                  <a
                    href={settings.instagram || "#"}
                    className="w-10 h-10 rounded-full bg-[#1a1f2e] flex items-center justify-center text-gray-400 hover:bg-[#fdb913] hover:text-black transition-colors border border-gray-800"
                  >
                    <i className="fab fa-instagram"></i>
                  </a>
                  <a
                    href={settings.facebook || "#"}
                    className="w-10 h-10 rounded-full bg-[#1a1f2e] flex items-center justify-center text-gray-400 hover:bg-[#3b5998] hover:text-white transition-colors border border-gray-800"
                  >
                    <i className="fab fa-facebook-f"></i>
                  </a>
                  <a
                    href={`https://wa.me/${settings.telepon?.replace(/[^0-9]/g, "") || ""}`}
                    className="w-10 h-10 rounded-full bg-[#1a1f2e] flex items-center justify-center text-gray-400 hover:bg-[#25D366] hover:text-white transition-colors border border-gray-800"
                  >
                    <i className="fab fa-whatsapp"></i>
                  </a>
                </div>
              </div>
            </div>

            {/* Bottom Bar */}
            <div className="border-t border-gray-800/80 pt-6 flex flex-col md:flex-row justify-between items-center gap-4 text-[11px] uppercase tracking-widest font-bold text-gray-600">
              <p>© {new Date().getFullYear()} BKSDA KALTIM</p>
              <div className="flex justify-center md:justify-end items-center gap-6">
                <Link href="#" className="hover:text-white transition-colors">
                  Privasi
                </Link>
                <Link href="#" className="hover:text-white transition-colors">
                  Syarat & Ketentuan
                </Link>
              </div>
            </div>
          </div>
        </footer>

        <a
          href={`https://wa.me/${settings.telepon?.replace(/[^0-9]/g, "") || ""}`}
          className="whatsapp-float shadow-2xl"
          target="_blank"
          rel="noreferrer"
        >
          <i className="fab fa-whatsapp"></i>
        </a>
      </div>
    </div>
  );
}
