/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import axios from "axios";
import {
  ArrowRight,
  MapPin,
  TreePine,
  Newspaper,
  ChevronLeft,
  ChevronRight,
  Play,
  Loader2,
} from "lucide-react";
import PublicNavbar from "./(publik)/_components/PublicNavbar";
import PublicFooter from "./(publik)/_components/PublicFooter";

const API = process.env.NEXT_PUBLIC_API_URL;
const STORAGE = process.env.NEXT_PUBLIC_STORAGE_URL;

// ── Types ──
interface BeritaItem {
  id: string;
  judul: string;
  slug?: string;
  thumbnail_path?: string;
  published_at?: string;
  category?: { nama: string };
}
interface KawasanItem {
  id: string;
  nama: string;
  slug?: string;
  tipe_kawasan?: string;
  luas_ha?: number;
  thumbnail_path?: string;
}
interface TslItem {
  id: string;
  nama_lokal: string;
  nama_latin?: string;
  slug?: string;
  status_iucn?: string;
  thumbnail_path?: string;
  deskripsi?: string;
  tipe?: string;
}
interface KepalaItem {
  id: string;
  nama: string;
  jabatan?: string;
  foto_path?: string;
  sambutan?: string;
}
interface VideoItem {
  id: string;
  judul: string;
  youtube_url?: string;
  thumbnail_path?: string;
}
interface PhotoItem {
  id: string;
  judul: string;
  file_path?: string;
}
interface ProfilItem {
  id: string;
  judul: string;
  slug?: string;
  konten?: string;
  thumbnail_path?: string;
}

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

export default function LandingPage() {
  const [banners, setBanners] = useState<BeritaItem[]>([]);
  const [berita, setBerita] = useState<BeritaItem[]>([]);
  const [kawasan, setKawasan] = useState<KawasanItem[]>([]);
  const [tsl, setTsl] = useState<TslItem[]>([]);
  const [kepala, setKepala] = useState<KepalaItem | null>(null);
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [profil, setProfil] = useState<ProfilItem | null>(null);
  const [loading, setLoading] = useState(true);

  // Banner state
  const [currentSlide, setCurrentSlide] = useState(0);
  // TSL tabs
  const [activeTsl, setActiveTsl] = useState(0);
  // Video carousel
  const [activeVideo, setActiveVideo] = useState(0);

  useEffect(() => {
    axios
      .get(`${API}/cms/public/home`)
      .then((res) => {
        const d = res.data;
        setBanners((d.banners || []).slice(0, 3));
        setBerita(d.news || []);
        setKawasan((d.kawasans || []).slice(0, 3));
        setTsl((d.tsls || []).slice(0, 6));
        setKepala(d.kepala || null);
        setVideos(d.videos || []);
        setPhotos(d.photos || []);
        setProfil(d.profil || null);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Auto-rotate banner
  useEffect(() => {
    if (banners.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentSlide((p) => (p + 1) % banners.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [banners.length]);

  const nextSlide = useCallback(() => {
    setCurrentSlide((p) => (p + 1) % banners.length);
  }, [banners.length]);
  const prevSlide = useCallback(() => {
    setCurrentSlide((p) => (p === 0 ? banners.length - 1 : p - 1));
  }, [banners.length]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-green-600 mx-auto mb-3" />
          <p className="text-sm font-bold text-gray-500 uppercase tracking-widest">
            Memuat...
          </p>
        </div>
      </div>
    );
  }

  const currentVideo = videos[activeVideo];
  const youtubeId = currentVideo
    ? getYoutubeId(currentVideo.youtube_url || "")
    : null;

  // Duplicate photos for marquee effect
  const marqueePhotos = [...photos, ...photos, ...photos];

  return (
    <div className="min-h-screen bg-white">
      <PublicNavbar />

      {/* ═══════════════════════════════════════ */}
      {/* SEKSI 1: HERO BANNER CAROUSEL          */}
      {/* ═══════════════════════════════════════ */}
      <section className="relative h-[520px] md:h-[650px] bg-black overflow-hidden">
        {banners.map((banner, idx) => (
          <div
            key={banner.id}
            className={`absolute inset-0 transition-opacity duration-1000 ${
              idx === currentSlide ? "opacity-100 z-10" : "opacity-0 z-0"
            }`}
          >
            {banner.thumbnail_path ? (
              <img
                src={imgUrl(banner.thumbnail_path)}
                alt={banner.judul}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-green-900 via-green-800 to-emerald-900" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/40" />
          </div>
        ))}

        {/* Banner Content */}
        <div className="relative z-20 max-w-7xl mx-auto px-4 h-full flex flex-col justify-end pb-16 md:pb-20">
          <p className="text-green-300 text-xs md:text-sm font-bold uppercase tracking-[0.2em] mb-3">
            {banners[currentSlide]?.category?.nama || "Informasi Terbaru"}
          </p>
          <h1 className="text-3xl md:text-5xl lg:text-6xl font-black text-white leading-tight max-w-4xl line-clamp-3">
            {banners[currentSlide]?.judul || "BKSDA Kalimantan Timur"}
          </h1>
          <div className="flex items-center gap-4 mt-6">
            <Link
              href={`/informasi/${banners[currentSlide]?.slug || ""}`}
              className="flex items-center gap-2 bg-white text-green-800 px-6 py-3 rounded-xl font-bold text-sm hover:bg-green-50 transition-all shadow-lg"
            >
              Selengkapnya <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Slide Indicators */}
          {banners.length > 1 && (
            <div className="flex items-center gap-2 mt-6">
              {banners.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentSlide(idx)}
                  className={`h-1.5 rounded-full transition-all ${
                    idx === currentSlide
                      ? "w-8 bg-green-400"
                      : "w-3 bg-white/40 hover:bg-white/60"
                  }`}
                />
              ))}
            </div>
          )}
        </div>

        {/* Navigation Arrows */}
        {banners.length > 1 && (
          <>
            <button
              onClick={prevSlide}
              className="absolute left-4 top-1/2 -translate-y-1/2 z-30 w-10 h-10 bg-black/30 hover:bg-black/60 text-white rounded-full flex items-center justify-center transition-all"
              aria-label="Previous slide"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={nextSlide}
              className="absolute right-4 top-1/2 -translate-y-1/2 z-30 w-10 h-10 bg-black/30 hover:bg-black/60 text-white rounded-full flex items-center justify-center transition-all"
              aria-label="Next slide"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </>
        )}
      </section>

      {/* ═══════════════════════════════════════ */}
      {/* SEKSI 2: PROFIL SINGKAT                */}
      {/* ═══════════════════════════════════════ */}
      {profil && (
        <section className="py-16 md:py-24 bg-white">
          <div className="max-w-7xl mx-auto px-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
              <div className="relative aspect-[4/3] rounded-3xl overflow-hidden shadow-2xl">
                {profil.thumbnail_path ? (
                  <img
                    src={imgUrl(profil.thumbnail_path)}
                    alt={profil.judul}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-green-100 flex items-center justify-center">
                    <MapPin className="w-16 h-16 text-green-300" />
                  </div>
                )}
              </div>
              <div>
                <p className="text-green-600 text-xs font-bold uppercase tracking-widest mb-3">
                  Tentang Kami
                </p>
                <h2 className="text-3xl md:text-4xl font-black text-gray-900 mb-6">
                  {profil.judul}
                </h2>
                <div
                  className="text-gray-600 leading-relaxed line-clamp-6 mb-6"
                  dangerouslySetInnerHTML={{
                    __html: (profil.konten || "").substring(0, 400) + "...",
                  }}
                />
                <Link
                  href="/profil"
                  className="inline-flex items-center gap-2 bg-green-700 text-white px-6 py-3 rounded-xl font-bold text-sm hover:bg-green-600 transition-all"
                >
                  Selengkapnya <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ═══════════════════════════════════════ */}
      {/* SEKSI 3: TSL — SATWA LIAR DILINDUNGI   */}
      {/* ═══════════════════════════════════════ */}
      {tsl.length > 0 && (
        <section className="py-16 md:py-24 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4">
            <div className="text-center mb-12">
              <p className="text-green-600 text-xs font-bold uppercase tracking-widest mb-2">
                Keanekaragaman Hayati
              </p>
              <h2 className="text-3xl md:text-4xl font-black text-gray-900">
                Spesies Dilindungi
              </h2>
              <div className="w-16 h-1 bg-green-500 mx-auto mt-4 rounded-full" />
            </div>

            {/* TSL Tab Circles */}
            <div className="flex justify-center flex-wrap gap-6 mb-12">
              {tsl.map((item, idx) => (
                <button
                  key={item.id}
                  onClick={() => setActiveTsl(idx)}
                  className="text-center group"
                >
                  <div
                    className={`relative w-20 h-20 rounded-full overflow-hidden border-4 transition-all duration-300 ${
                      activeTsl === idx
                        ? "border-green-500 scale-110 shadow-lg"
                        : "border-gray-200 opacity-60 hover:opacity-100 hover:scale-105"
                    }`}
                  >
                    {item.thumbnail_path ? (
                      <img
                        src={imgUrl(item.thumbnail_path)}
                        alt={item.nama_lokal}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-green-100 flex items-center justify-center">
                        <TreePine className="w-6 h-6 text-green-400" />
                      </div>
                    )}
                  </div>
                  <p
                    className={`mt-2 text-xs font-bold uppercase transition-colors ${
                      activeTsl === idx ? "text-green-600" : "text-gray-400"
                    }`}
                  >
                    {item.nama_lokal.split(" ")[0]}
                  </p>
                </button>
              ))}
            </div>

            {/* Active TSL Detail */}
            {tsl[activeTsl] && (
              <div className="bg-white rounded-3xl shadow-sm border border-gray-100 flex flex-col md:flex-row items-center overflow-hidden">
                <div className="w-full md:w-1/2 p-8 md:p-12">
                  <h3 className="text-2xl md:text-3xl font-black text-gray-900 mb-2">
                    {tsl[activeTsl].nama_lokal}
                  </h3>
                  <p className="text-sm text-gray-400 italic mb-4">
                    {tsl[activeTsl].nama_latin}
                  </p>
                  {tsl[activeTsl].status_iucn && (
                    <span
                      className={`inline-block text-xs font-black px-2 py-1 rounded mb-4 ${
                        tsl[activeTsl].status_iucn === "CR"
                          ? "bg-red-100 text-red-600"
                          : tsl[activeTsl].status_iucn === "EN"
                            ? "bg-orange-100 text-orange-600"
                            : "bg-yellow-100 text-yellow-700"
                      }`}
                    >
                      IUCN: {tsl[activeTsl].status_iucn}
                    </span>
                  )}
                  <p className="text-gray-600 leading-relaxed line-clamp-4 mb-6">
                    {tsl[activeTsl].deskripsi?.replace(/<[^>]*>/g, "").substring(0, 300) || ""}
                  </p>
                  <Link
                    href={`/tsl/${tsl[activeTsl].slug || tsl[activeTsl].id}`}
                    className="inline-flex items-center gap-2 bg-green-700 text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-green-600 transition-all"
                  >
                    Selengkapnya <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
                <div className="w-full md:w-1/2 aspect-[4/3] relative overflow-hidden">
                  {tsl[activeTsl].thumbnail_path ? (
                    <img
                      src={imgUrl(tsl[activeTsl].thumbnail_path)}
                      alt={tsl[activeTsl].nama_lokal}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-green-100" />
                  )}
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ═══════════════════════════════════════ */}
      {/* SEKSI 4: VIDEO YOUTUBE CAROUSEL        */}
      {/* ═══════════════════════════════════════ */}
      {videos.length > 0 && (
        <section className="py-16 md:py-24 bg-gray-900 relative overflow-hidden">
          {/* Background blur */}
          {currentVideo?.thumbnail_path && (
            <div className="absolute inset-0 z-0 opacity-20">
              <img
                src={imgUrl(currentVideo.thumbnail_path)}
                alt=""
                className="w-full h-full object-cover blur-sm"
              />
            </div>
          )}
          <div className="absolute inset-0 bg-gray-900/80 z-0" />

          <div className="relative z-10 max-w-5xl mx-auto px-4">
            <div className="text-center mb-10">
              <p className="text-green-400 text-xs font-bold uppercase tracking-widest mb-2">
                Video Dokumentasi
              </p>
              <h2 className="text-3xl md:text-4xl font-black text-white">
                {currentVideo?.judul || "Galeri Video"}
              </h2>
              <div className="w-16 h-1 bg-green-500 mx-auto mt-4 rounded-full" />
            </div>

            {/* Video Player */}
            <div className="rounded-2xl overflow-hidden shadow-2xl border-2 border-white/10 aspect-video bg-black">
              {youtubeId ? (
                <iframe
                  className="w-full h-full"
                  src={`https://www.youtube.com/embed/${youtubeId}?rel=0`}
                  title={currentVideo?.judul || "Video"}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-500">
                  <Play className="w-16 h-16" />
                </div>
              )}
            </div>

            {/* Video Thumbnails */}
            {videos.length > 1 && (
              <div className="flex justify-center gap-3 mt-6 overflow-x-auto pb-2">
                {videos.map((vid, idx) => (
                  <button
                    key={vid.id}
                    onClick={() => setActiveVideo(idx)}
                    className={`relative w-24 md:w-32 aspect-video rounded-lg overflow-hidden shrink-0 transition-all border-2 ${
                      activeVideo === idx
                        ? "border-green-400 scale-105 shadow-lg"
                        : "border-white/20 opacity-60 hover:opacity-100"
                    }`}
                  >
                    {vid.thumbnail_path ? (
                      <img
                        src={imgUrl(vid.thumbnail_path)}
                        alt={vid.judul}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                        <Play className="w-4 h-4 text-white" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}

            <div className="text-center mt-8">
              <Link
                href="/galeri"
                className="inline-flex items-center gap-2 text-sm font-bold text-white hover:text-green-400 transition-colors uppercase tracking-wider"
              >
                Lihat Semua Video <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ═══════════════════════════════════════ */}
      {/* SEKSI 5: GALERI FOTO MARQUEE           */}
      {/* ═══════════════════════════════════════ */}
      {photos.length > 0 && (
        <section className="py-16 md:py-24 bg-green-950 overflow-hidden">
          <div className="max-w-7xl mx-auto px-4 mb-12">
            <div className="text-center">
              <p className="text-green-400 text-xs font-bold uppercase tracking-widest mb-2">
                Pesona Keanekaragaman Hayati
              </p>
              <h2 className="text-3xl md:text-4xl font-black text-white">
                Galeri Foto
              </h2>
              <div className="w-16 h-1 bg-green-500 mx-auto mt-4 rounded-full" />
            </div>
          </div>

          {/* Marquee */}
          <div className="relative w-full overflow-hidden">
            <div className="flex gap-4 animate-[marquee_60s_linear_infinite] hover:[animation-play-state:paused]">
              {marqueePhotos.map((photo, idx) => (
                <div
                  key={`${photo.id}-${idx}`}
                  className="w-[260px] md:w-[320px] aspect-[4/5] shrink-0 relative group overflow-hidden rounded-2xl border border-white/10 bg-black"
                >
                  <img
                    src={imgUrl(photo.file_path)}
                    alt={photo.judul}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <div className="absolute bottom-0 left-0 right-0 p-4 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                    <p className="text-white font-bold text-sm line-clamp-2">
                      {photo.judul}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="text-center mt-10">
            <Link
              href="/galeri"
              className="inline-flex items-center gap-2 bg-green-700 text-white px-6 py-3 rounded-xl font-bold text-sm hover:bg-green-600 transition-all"
            >
              Lihat Semua Foto <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </section>
      )}

      {/* ═══════════════════════════════════════ */}
      {/* SEKSI 6: BERITA TERBARU                */}
      {/* ═══════════════════════════════════════ */}
      <section className="py-16 md:py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between mb-10">
            <div>
              <p className="text-green-600 text-xs font-bold uppercase tracking-widest mb-2">
                Informasi & Berita
              </p>
              <h2 className="text-3xl md:text-4xl font-black text-gray-900">
                Berita Terbaru
              </h2>
            </div>
            <Link
              href="/informasi"
              className="hidden md:flex items-center gap-1 text-green-700 font-bold text-sm hover:text-green-600"
            >
              Lihat Semua <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {berita.length === 0 ? (
            <p className="text-gray-400 text-center py-12">
              Belum ada berita.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {berita.slice(0, 4).map((item) => (
                <Link
                  key={item.id}
                  href={`/informasi/${item.slug || item.id}`}
                  className="group bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all hover:-translate-y-1"
                >
                  <div className="h-44 bg-gray-100 overflow-hidden">
                    {item.thumbnail_path ? (
                      <img
                        src={imgUrl(item.thumbnail_path)}
                        alt={item.judul}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-green-50">
                        <Newspaper className="w-10 h-10 text-green-200" />
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    {item.category?.nama && (
                      <span className="text-[10px] font-bold text-green-600 uppercase tracking-wider bg-green-50 px-2 py-0.5 rounded">
                        {item.category.nama}
                      </span>
                    )}
                    <p className="text-xs text-gray-400 font-medium mt-2 mb-1">
                      {item.published_at
                        ? new Date(item.published_at).toLocaleDateString(
                            "id-ID",
                            {
                              day: "numeric",
                              month: "long",
                              year: "numeric",
                            }
                          )
                        : ""}
                    </p>
                    <h3 className="font-bold text-gray-900 text-sm line-clamp-2 group-hover:text-green-700 transition-colors">
                      {item.judul}
                    </h3>
                  </div>
                </Link>
              ))}
            </div>
          )}

          <div className="text-center mt-8 md:hidden">
            <Link
              href="/informasi"
              className="inline-flex items-center gap-2 text-green-700 font-bold text-sm"
            >
              Lihat Semua Berita <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════ */}
      {/* SEKSI 7: KAWASAN KONSERVASI             */}
      {/* ═══════════════════════════════════════ */}
      {kawasan.length > 0 && (
        <section className="py-16 md:py-24 bg-white">
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex items-center justify-between mb-10">
              <div>
                <p className="text-green-600 text-xs font-bold uppercase tracking-widest mb-2">
                  Wilayah Pengelolaan
                </p>
                <h2 className="text-3xl md:text-4xl font-black text-gray-900">
                  Kawasan Konservasi
                </h2>
              </div>
              <Link
                href="/kawasan"
                className="hidden md:flex items-center gap-1 text-green-700 font-bold text-sm hover:text-green-600"
              >
                Semua Kawasan <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {kawasan.map((item) => (
                <Link
                  key={item.id}
                  href={`/kawasan/${item.slug || item.id}`}
                  className="group relative h-72 rounded-2xl overflow-hidden shadow-lg"
                >
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent z-10" />
                  {item.thumbnail_path ? (
                    <img
                      src={imgUrl(item.thumbnail_path)}
                      alt={item.nama}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    />
                  ) : (
                    <div className="w-full h-full bg-green-800" />
                  )}
                  <div className="absolute bottom-0 left-0 right-0 p-6 z-20">
                    <p className="text-green-300 text-xs font-bold uppercase tracking-wider">
                      {item.tipe_kawasan || "Kawasan Konservasi"}
                    </p>
                    <h3 className="text-white font-black text-xl mt-1">
                      {item.nama}
                    </h3>
                    {item.luas_ha && (
                      <p className="text-green-200 text-xs mt-2 flex items-center gap-1">
                        <MapPin className="w-3 h-3" />{" "}
                        {Number(item.luas_ha).toLocaleString()} Hektar
                      </p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ═══════════════════════════════════════ */}
      {/* SEKSI 8: SAMBUTAN KEPALA               */}
      {/* ═══════════════════════════════════════ */}
      {kepala && (
        <section className="py-16 md:py-24 bg-green-900 text-white">
          <div className="max-w-5xl mx-auto px-4 flex flex-col md:flex-row items-center gap-10">
            <div className="w-40 h-40 rounded-full overflow-hidden border-4 border-green-500 shrink-0 shadow-2xl">
              {kepala.foto_path ? (
                <img
                  src={imgUrl(kepala.foto_path)}
                  alt={kepala.nama}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-green-800 flex items-center justify-center text-green-400 text-4xl font-black">
                  {kepala.nama?.charAt(0)}
                </div>
              )}
            </div>
            <div>
              <p className="text-green-300 text-xs font-bold uppercase tracking-widest mb-3">
                Sambutan Kepala Balai
              </p>
              <p className="text-lg md:text-xl leading-relaxed text-green-100 italic line-clamp-4">
                &ldquo;
                {kepala.sambutan ||
                  "Selamat datang di website resmi BKSDA Kalimantan Timur."}
                &rdquo;
              </p>
              <div className="mt-5">
                <p className="font-black text-white text-lg">{kepala.nama}</p>
                <p className="text-green-300 text-sm">
                  {kepala.jabatan || "Kepala BKSDA Kalimantan Timur"}
                </p>
              </div>
            </div>
          </div>
        </section>
      )}

      <PublicFooter />
    </div>
  );
}
