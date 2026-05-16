/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import axios from "axios";
import { cn } from "@/lib/utils";
import PublicLayout from "@/components/layout/PublicLayout";

const API = process.env.NEXT_PUBLIC_API_URL;
const STORAGE = process.env.NEXT_PUBLIC_STORAGE_URL;

function getYoutubeId(url: string): string | null {
  if (!url) return null;
  const match = url.match(
    /(?:youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*)/
  );
  return match && match[1].length === 11 ? match[1] : null;
}

function imgUrl(path?: string | null): string {
  if (!path) return "";
  if (path.startsWith("http")) return path;
  return `${STORAGE}/${path}`;
}

function sanitizeHtml(html: string): string {
  // Basic sanitization — strips scripts but keeps safe tags
  return html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");
}

export default function PublicBeranda() {
  const [homeData, setHomeData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState(0);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [activeVideoIndex, setActiveVideoIndex] = useState(0);
  const [visibleSections, setVisibleSections] = useState<string[]>([]);

  useEffect(() => {
    axios
      .get(`${API}/cms/public/home`)
      .then((res) => setHomeData(res.data))
      .catch(() =>
        setHomeData({ banners: [], news: [], tsls: [], photos: [], videos: [] })
      );
  }, []);

  // Intersection Observer for scroll animations
  useEffect(() => {
    if (!homeData) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisibleSections((prev) => [
              ...new Set([...prev, entry.target.id]),
            ]);
          }
        });
      },
      { threshold: 0.1 }
    );
    const sections = document.querySelectorAll("section[id]");
    sections.forEach((section) => observer.observe(section));
    return () => sections.forEach((section) => observer.unobserve(section));
  }, [homeData]);

  // Banner auto-rotate
  useEffect(() => {
    if (!homeData?.banners || homeData.banners.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % homeData.banners.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [homeData?.banners]);

  if (!homeData) {
    return (
      <PublicLayout>
        <div className="flex items-center justify-center min-h-screen bg-white text-center p-10">
          <div>
            <div className="w-16 h-16 border-4 border-[#fdb913] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="font-bold text-gray-500 uppercase tracking-widest text-sm">
              Menghubungkan ke CMS...
            </p>
          </div>
        </div>
      </PublicLayout>
    );
  }

  const bannerItems =
    homeData.banners && homeData.banners.length > 0
      ? homeData.banners
      : [{ judul: "BKSDA KALTIM", thumbnail_path: null, slug: "#" }];

  const carouselVideos = homeData.videos || [];
  const activeVideo =
    carouselVideos.length > 0 ? carouselVideos[activeVideoIndex] : null;
  const youtubeId = getYoutubeId(activeVideo?.youtube_url || "");

  const galleryPhotos = (homeData.photos || [])
    .filter((p: any) => p.file_path)
    .slice(0, 6);
  const marqueeItems = [
    ...galleryPhotos,
    ...galleryPhotos,
    ...galleryPhotos,
    ...galleryPhotos,
  ];

  return (
    <PublicLayout>
      <style
        dangerouslySetInnerHTML={{
          __html: `
            .banner-container { position: relative; height: 90vh; overflow: hidden; background: #000; }
            .banner-slide { position: absolute; inset: 0; opacity: 0; transition: opacity 1s ease-in-out; display: flex; align-items: center; justify-content: center; }
            .banner-slide.active { opacity: 1; z-index: 1; }
            .banner-overlay { position: absolute; inset: 0; background: rgba(0,0,0,0.4); }
            .banner-slide.active .banner-content > * { animation: slideUpFade 0.8s cubic-bezier(0.4, 0, 0.2, 1) forwards; opacity: 0; transform: translateY(30px); }
            .banner-slide.active .banner-content h3 { animation-delay: 0.2s; }
            .banner-slide.active .banner-content h2 { animation-delay: 0.4s; }
            .banner-slide.active .banner-content a { animation-delay: 0.6s; }
            @keyframes slideUpFade { to { opacity: 1; transform: translateY(0); } }
            .tab-content-enter { animation: slideUpFade 0.6s cubic-bezier(0.4, 0, 0.2, 1) forwards; }
            .section-fade-in { opacity: 0; transform: translateY(30px); transition: all 0.8s cubic-bezier(0.4, 0, 0.2, 1); }
            .section-fade-in.is-visible { opacity: 1; transform: translateY(0); }
            .fade-wrapper.is-visible .fade-item { opacity: 1; transform: translateY(0); }
            .fade-item { opacity: 0; transform: translateY(30px); transition: all 0.8s cubic-bezier(0.4, 0, 0.2, 1); }
            .delay-100 { transition-delay: 100ms; }
            .delay-200 { transition-delay: 200ms; }
            .delay-300 { transition-delay: 300ms; }
            .delay-400 { transition-delay: 400ms; }
            @keyframes marquee { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
            .animate-marquee { display: flex; width: max-content; animation: marquee 120s linear infinite; }
            .animate-marquee:hover { animation-play-state: paused; }
          `,
        }}
      />

      {/* ═══ BANNER CAROUSEL ═══ */}
      <section className="banner-container">
        {bannerItems.map((b: any, idx: number) => (
          <div
            key={idx}
            className={cn("banner-slide", currentSlide === idx && "active")}
          >
            {b.thumbnail_path ? (
              <Image
                src={imgUrl(b.thumbnail_path)}
                alt={b.judul || "Banner"}
                fill
                style={{ objectFit: "cover" }}
                priority={idx === 0}
                className="absolute inset-0 z-0"
              />
            ) : (
              <Image
                src="/assets/images/background/banner-bg.jpg"
                alt="Banner"
                fill
                style={{ objectFit: "cover" }}
                priority={idx === 0}
                className="absolute inset-0 z-0"
              />
            )}
            <div className="banner-overlay z-10"></div>
            <div
              className="relative z-20 text-center banner-content flex flex-col justify-center items-center h-full w-full px-4"
              style={{ maxWidth: "100%" }}
            >
              <h3
                className="text-lg md:text-3xl lg:text-4xl font-bold mb-4 md:mb-6 drop-shadow-[0_4px_4px_rgba(0,0,0,0.8)] tracking-[0.2em] md:tracking-[0.3em] uppercase"
                style={{ color: "#FFE066" }}
              >
                {b.category?.nama || "Informasi Utama"}
              </h3>
              <h2
                className="font-black mb-8 md:mb-10 w-full leading-[1.1] drop-shadow-[0_15px_35px_rgba(0,0,0,0.8)] text-white tracking-tight uppercase"
                style={{
                  fontSize: "clamp(28px, 5vw, 72px)",
                  padding: "0 4vw",
                }}
              >
                {b.judul}
              </h2>
              <Link
                href={`/informasi/${b.slug || ""}`}
                className="theme-btn btn-one drop-shadow-xl text-base md:text-xl lg:text-2xl px-8 py-4 md:px-12 md:py-5 lg:px-16 lg:py-6 font-bold tracking-widest hover:scale-105 transition-transform"
              >
                Selengkapnya
              </Link>
            </div>
          </div>
        ))}
      </section>

      {/* ═══ PROFIL SECTION ═══ */}
      {homeData.profil && (
        <section
          id="profil-section"
          className={cn(
            "about-style-two sec-pad fade-wrapper",
            visibleSections.includes("profil-section") && "is-visible"
          )}
        >
          <div className="auto-container">
            <div className="row clearfix items-center">
              <div className="col-lg-6 col-md-12 col-sm-12 fade-item delay-100">
                <div className="image-box rounded-3xl overflow-hidden shadow-2xl group relative aspect-square md:aspect-auto md:h-[500px]">
                  {homeData.profil.thumbnail_path && (
                    <Image
                      src={imgUrl(homeData.profil.thumbnail_path)}
                      alt="Profil"
                      fill
                      className="object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                  )}
                </div>
              </div>
              <div className="col-lg-6 col-md-12 col-sm-12 lg:pl-10 mt-8 lg:mt-0 fade-item delay-300">
                <div className="sec-title mb-6">
                  <h2>{homeData.profil.judul}</h2>
                </div>
                <div
                  className="text-gray-600 mb-8 leading-relaxed"
                  dangerouslySetInnerHTML={{
                    __html: sanitizeHtml(
                      (homeData.profil.konten || "").substring(0, 500) + "..."
                    ),
                  }}
                ></div>
                <Link href="/profil" className="theme-btn btn-one">
                  Selengkapnya
                </Link>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ═══ SATWA TSL SECTION ═══ */}
      <section
        id="tsl-section"
        className={cn(
          "animals-section sec-pad bg-[#f8f9fa] fade-wrapper",
          visibleSections.includes("tsl-section") && "is-visible"
        )}
      >
        <div className="auto-container">
          <div className="sec-title centred mb-12 fade-item">
            <h2>Daftar Satwa Liar Dilindungi</h2>
          </div>
          <div className="flex justify-center flex-wrap gap-8 mb-16 fade-item delay-200">
            {(homeData.tsls || []).map((tsl: any, idx: number) => (
              <div
                key={tsl.id}
                className="text-center group cursor-pointer"
                onClick={() => setActiveTab(idx)}
              >
                <div
                  className={cn(
                    "relative w-24 h-24 rounded-full overflow-hidden border-4 transition-all duration-300",
                    activeTab === idx
                      ? "border-[#fdb913] scale-110 shadow-lg"
                      : "border-white opacity-60 hover:opacity-100 hover:scale-105"
                  )}
                >
                  {tsl.thumbnail_path && (
                    <Image
                      src={imgUrl(tsl.thumbnail_path)}
                      alt="Satwa"
                      fill
                      className="object-cover"
                    />
                  )}
                </div>
                <h5
                  className={cn(
                    "mt-3 text-xs font-bold uppercase transition-colors",
                    activeTab === idx
                      ? "text-[#fdb913]"
                      : "text-gray-400 group-hover:text-gray-600"
                  )}
                >
                  {(tsl.nama_lokal || "Satwa").split(" ")[0]}
                </h5>
              </div>
            ))}
          </div>
          {homeData.tsls && homeData.tsls[activeTab] && (
            <div
              key={activeTab}
              className="tab-content-enter bg-white rounded-[30px] md:rounded-[40px] shadow-sm border border-gray-100 flex flex-col md:flex-row items-center fade-item delay-300 overflow-hidden mx-4 md:mx-0 mt-4 md:mt-0"
            >
              <div className="w-full md:w-1/2 order-2 md:order-1 p-6 md:p-12">
                <div className="sec-title mb-6">
                  <h2>{homeData.tsls[activeTab].nama_lokal}</h2>
                </div>
                <p className="text-sm italic text-gray-400 mb-4">
                  {homeData.tsls[activeTab].nama_latin}
                </p>
                <p
                  className="text-gray-600 mb-8 leading-relaxed"
                  dangerouslySetInnerHTML={{
                    __html: sanitizeHtml(
                      (homeData.tsls[activeTab].deskripsi || "").substring(
                        0,
                        400
                      ) + "..."
                    ),
                  }}
                ></p>
                <Link
                  href={`/tsl/${homeData.tsls[activeTab].slug}`}
                  className="theme-btn btn-one"
                >
                  Selengkapnya
                </Link>
              </div>
              <div className="w-full md:w-1/2 order-1 md:order-2 overflow-hidden shadow-xl relative aspect-[4/3] bg-gray-100">
                {homeData.tsls[activeTab].thumbnail_path && (
                  <Image
                    src={imgUrl(homeData.tsls[activeTab].thumbnail_path)}
                    alt="Satwa Detail"
                    fill
                    className="object-cover transition-transform duration-700 hover:scale-105"
                  />
                )}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ═══ VIDEO CAROUSEL SECTION ═══ */}
      <section
        id="video-section"
        className={cn(
          "video-section centred py-20 md:py-32 relative overflow-hidden section-fade-in bg-[#1a1a1a]",
          visibleSections.includes("video-section") && "is-visible"
        )}
      >
        <div className="absolute inset-0 z-0 opacity-40">
          {activeVideo?.thumbnail_path && (
            <Image
              src={imgUrl(activeVideo.thumbnail_path)}
              alt="Video Background"
              fill
              className="object-cover transition-transform duration-1000 scale-105"
            />
          )}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm"></div>
        </div>
        <div className="auto-container relative z-10 text-white">
          <div className="mb-8 md:mb-12 px-4 md:px-0 text-center">
            <h2 className="text-2xl md:text-5xl lg:text-6xl font-bold uppercase tracking-widest leading-tight drop-shadow-xl mb-4">
              {activeVideo?.judul || "Kawasan Konservasi"}
            </h2>
            <div className="w-16 md:w-24 h-1 bg-[#fdb913] mx-auto"></div>
          </div>

          <div className="max-w-5xl mx-auto relative">
            {carouselVideos.length > 1 && (
              <button
                onClick={() =>
                  setActiveVideoIndex((prev) =>
                    prev === 0 ? carouselVideos.length - 1 : prev - 1
                  )
                }
                className="absolute left-0 top-1/2 -ml-4 md:-ml-12 -translate-y-1/2 z-20 w-10 md:w-14 h-10 md:h-14 bg-black/50 hover:bg-[#fdb913] text-white rounded-full flex items-center justify-center transition-all shadow-xl hover:scale-110 border border-white/20 hover:border-transparent"
              >
                <i className="fa-solid fa-chevron-left text-lg md:text-xl"></i>
              </button>
            )}

            <div className="rounded-3xl overflow-hidden shadow-2xl border-4 border-white/10 relative group bg-black aspect-video transition-all duration-500 ease-in-out hover:border-[#fdb913]/50">
              {youtubeId ? (
                <iframe
                  className="w-full h-full"
                  src={`https://www.youtube.com/embed/${youtubeId}?autoplay=0&rel=0`}
                  title="YouTube video player"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                ></iframe>
              ) : (
                <div className="flex flex-col items-center justify-center w-full h-full bg-gray-900 text-gray-500">
                  <i className="fa-regular fa-face-frown text-6xl mb-4"></i>
                  <p className="text-xl">Preview video tidak tersedia.</p>
                </div>
              )}
            </div>

            {carouselVideos.length > 1 && (
              <button
                onClick={() =>
                  setActiveVideoIndex((prev) =>
                    prev === carouselVideos.length - 1 ? 0 : prev + 1
                  )
                }
                className="absolute right-0 top-1/2 -mr-4 md:-mr-12 -translate-y-1/2 z-20 w-10 md:w-14 h-10 md:h-14 bg-black/50 hover:bg-[#fdb913] text-white rounded-full flex items-center justify-center transition-all shadow-xl hover:scale-110 border border-white/20 hover:border-transparent"
              >
                <i className="fa-solid fa-chevron-right text-lg md:text-xl"></i>
              </button>
            )}
          </div>

          {carouselVideos.length > 1 && (
            <div className="flex justify-center gap-3 md:gap-4 mt-8 md:mt-10 overflow-x-auto pb-4 px-4">
              {carouselVideos.map((vid: any, idx: number) => (
                <button
                  key={idx}
                  onClick={() => setActiveVideoIndex(idx)}
                  className={cn(
                    "relative w-24 md:w-32 aspect-video rounded-xl overflow-hidden shrink-0 transition-all duration-300 border-2",
                    activeVideoIndex === idx
                      ? "border-[#fdb913] scale-110 shadow-[0_0_15px_rgba(253,185,19,0.4)] z-10"
                      : "border-white/20 opacity-60 hover:opacity-100 hover:scale-105"
                  )}
                >
                  {vid.thumbnail_path && (
                    <Image
                      src={imgUrl(vid.thumbnail_path)}
                      alt={vid.judul || "Thumbnail"}
                      fill
                      className="object-cover"
                    />
                  )}
                  <div className="absolute inset-0 bg-black/30"></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <i className="fa-brands fa-youtube text-white text-xl md:text-2xl drop-shadow-md"></i>
                  </div>
                </button>
              ))}
            </div>
          )}

          <div className="relative z-20 text-center mt-6 md:mt-10">
            <Link
              href="/galeri"
              className="inline-flex items-center gap-2 text-sm md:text-base font-bold uppercase tracking-wider text-white hover:text-[#fdb913] transition-colors border-b border-transparent hover:border-[#fdb913] pb-1"
            >
              Lihat Semua Video{" "}
              <i className="fa-solid fa-arrow-right-long"></i>
            </Link>
          </div>
        </div>
      </section>

      {/* ═══ GALERI FOTO MARQUEE ═══ */}
      <section
        id="gallery-section"
        className={cn(
          "gallery-section py-20 lg:py-32 fade-wrapper relative",
          visibleSections.includes("gallery-section") && "is-visible"
        )}
        style={{
          background:
            "linear-gradient(180deg, #0d1f14 0%, #081209 100%)",
        }}
      >
        <div className="auto-container mb-16 relative z-10">
          <div className="sec-title centred light fade-item">
            <span className="text-[#fdb913] text-sm font-bold tracking-[0.3em] uppercase block mb-3">
              Pesona Keanekaragaman Hayati
            </span>
            <h2 className="text-white text-4xl md:text-5xl font-black uppercase tracking-tight drop-shadow-lg">
              Galeri Foto
            </h2>
            <div className="w-24 h-1 bg-[#fdb913] mx-auto mt-6 rounded-full"></div>
          </div>
        </div>

        <div className="w-full relative z-10 fade-item delay-200 overflow-hidden py-4">
          <div className="animate-marquee flex gap-6 px-4 items-center">
            {marqueeItems.map((p: any, idx: number) => (
              <div
                key={`${p.id}-${idx}`}
                className="w-[280px] md:w-[380px] aspect-[4/5] shrink-0 relative group overflow-hidden rounded-3xl border border-white/10 shadow-[0_15px_35px_rgba(0,0,0,0.6)] bg-black cursor-pointer"
              >
                <Image
                  src={imgUrl(p.file_path)}
                  alt={p.judul || "Foto"}
                  fill
                  className="object-cover group-hover:scale-110 group-hover:opacity-70 transition-all duration-1000 ease-out z-0"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-transparent flex flex-col justify-end z-10 opacity-90 group-hover:opacity-100 transition-opacity duration-500">
                  <div
                    style={{ padding: "32px" }}
                    className="transform translate-y-6 group-hover:translate-y-0 transition-transform duration-700 ease-out"
                  >
                    <div className="w-8 h-1 bg-[#fdb913] mb-4 opacity-0 group-hover:opacity-100 transition-all duration-500 transform -translate-x-2.5 group-hover:translate-x-0 ease-out"></div>
                    <h4 className="text-white font-bold text-xl md:text-2xl leading-tight drop-shadow-md">
                      {p.judul}
                    </h4>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-center mt-20 mb-8 fade-item delay-300 relative z-20">
            <Link
              href="/galeri"
              className="theme-btn btn-one drop-shadow-md"
              style={{ display: "inline-block", width: "auto" }}
            >
              Lihat Semua Foto
            </Link>
          </div>
        </div>
      </section>

      {/* ═══ NEWS GRID SECTION ═══ */}
      <section
        id="news-section"
        className={cn(
          "news-style-two sec-pad fade-wrapper bg-gray-50",
          visibleSections.includes("news-section") && "is-visible"
        )}
      >
        <div className="auto-container px-4 lg:px-0">
          <div className="relative mb-12 fade-item flex flex-col items-center">
            <div className="sec-title centred mb-0">
              <h2 className="uppercase">Informasi</h2>
            </div>
            <div className="absolute right-0 top-1/2 -translate-y-1/2 hidden md:block">
              <Link
                href="/informasi"
                className="theme-btn btn-one bg-[#f8f9fa] text-[#1a1a1a] hover:bg-[#fdb913] hover:text-white px-8 py-3 text-sm font-bold uppercase tracking-widest transition-all"
              >
                Selengkapnya
              </Link>
            </div>
          </div>
          <div className="row clearfix">
            {/* Berita Utama (Headline) */}
            {homeData.news && homeData.news.length > 0 && (
              <div className="col-lg-7 col-md-12 col-sm-12 mb-8 fade-item delay-100 flex flex-col px-4 lg:px-6">
                <Link
                  href={`/informasi/${homeData.news[0].slug}`}
                  className="relative group flex flex-col w-full h-full min-h-[400px] md:min-h-[500px] shadow-lg rounded-xl md:rounded-sm overflow-hidden border border-gray-100 bg-white"
                >
                  <div className="relative w-full flex-1 min-h-[250px] overflow-hidden">
                    {homeData.news[0].thumbnail_path && (
                      <Image
                        src={imgUrl(homeData.news[0].thumbnail_path)}
                        alt={homeData.news[0].judul}
                        fill
                        sizes="(max-width: 768px) 100vw, 50vw"
                        className="object-cover transition-transform duration-1000 group-hover:scale-110"
                      />
                    )}
                  </div>
                  <div
                    className="w-full shrink-0 transition-opacity duration-300 md:group-hover:opacity-0 z-10"
                    style={{ backgroundColor: "#fdb913" }}
                  >
                    <div className="w-full p-6 md:p-10">
                      <div className="flex items-center gap-4 text-white text-[11px] md:text-xs font-medium mb-2 md:mb-3">
                        <span className="flex items-center gap-1">
                          <i className="fa-regular fa-user"></i> Admin
                        </span>
                        <span className="flex items-center gap-1">
                          <i className="fa-regular fa-calendar-alt"></i>{" "}
                          {homeData.news[0].published_at
                            ? new Date(
                                homeData.news[0].published_at
                              ).toLocaleDateString("id-ID", {
                                day: "2-digit",
                                month: "2-digit",
                                year: "numeric",
                              })
                            : ""}
                        </span>
                      </div>
                      <h3
                        className="text-white text-lg md:text-2xl lg:text-3xl font-black uppercase leading-[1.2] tracking-wide"
                        style={{
                          textShadow: "0 2px 4px rgba(0,0,0,0.2)",
                        }}
                      >
                        {homeData.news[0].judul}
                      </h3>
                    </div>
                  </div>
                </Link>
              </div>
            )}

            {/* Daftar Berita Samping */}
            <div className="col-lg-5 col-md-12 col-sm-12 flex flex-col px-0 lg:px-4">
              <div className="flex flex-col flex-1 gap-4 md:gap-6 mt-4 lg:mt-0 pb-8 pr-4 lg:pr-0">
                {(homeData.news || [])
                  .slice(1, 4)
                  .map((item: any, idx: number) => (
                    <Link
                      href={`/informasi/${item.slug}`}
                      key={item.id}
                      className={cn(
                        "group flex flex-col sm:flex-row gap-0 sm:gap-5 items-stretch bg-white transition-all duration-300 hover:-translate-y-1 fade-item flex-auto rounded-xl md:rounded-sm overflow-hidden shadow-sm border border-gray-100 hover:shadow-md",
                        idx === 0
                          ? "delay-200"
                          : idx === 1
                            ? "delay-300"
                            : "delay-400"
                      )}
                    >
                      <div className="w-full sm:w-40 md:w-48 lg:w-56 h-[180px] sm:min-h-[150px] sm:h-auto relative shrink-0 bg-gray-100 flex items-center justify-center overflow-hidden">
                        {item.thumbnail_path ? (
                          <Image
                            src={imgUrl(item.thumbnail_path)}
                            alt={item.judul}
                            fill
                            sizes="(max-width: 768px) 100vw, 30vw"
                            style={{ objectFit: "cover" }}
                            className="transition-transform duration-700 group-hover:scale-110"
                          />
                        ) : (
                          <div className="text-gray-400 text-xs font-medium">
                            <i className="fa-regular fa-image text-2xl"></i>
                          </div>
                        )}
                      </div>
                      <div className="p-5 sm:p-6 flex flex-col justify-center w-full overflow-hidden">
                        <div className="flex flex-wrap items-center gap-3 text-gray-400 text-[10px] md:text-[11px] font-medium mb-1 md:mb-2 uppercase tracking-wide">
                          <span className="flex items-center gap-1 text-[#fdb913] shrink-0">
                            <i className="fa-regular fa-user"></i> Admin
                          </span>
                          <span className="flex items-center gap-1 shrink-0">
                            <i className="fa-regular fa-calendar-alt"></i>{" "}
                            {item.published_at
                              ? new Date(
                                  item.published_at
                                ).toLocaleDateString("id-ID", {
                                  day: "numeric",
                                  month: "short",
                                  year: "numeric",
                                })
                              : ""}
                          </span>
                        </div>
                        <h4 className="font-black text-sm md:text-base leading-snug text-gray-900 group-hover:text-[#fdb913] transition-colors uppercase">
                          {item.judul}
                        </h4>
                      </div>
                    </Link>
                  ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
