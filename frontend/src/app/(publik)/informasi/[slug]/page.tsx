/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import axios from "axios";
import { Loader2 } from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL;
const STORAGE = process.env.NEXT_PUBLIC_STORAGE_URL;

interface BeritaDetail {
  id: string | number;
  judul: string;
  slug: string;
  konten: string;
  thumbnail_path: string | null;
  category: { nama: string; slug: string } | null;
  published_at: string | null;
  views_count?: number;
  sumber?: string;
  author: { name: string } | null;
}

interface BeritaItem {
  id: string | number;
  judul: string;
  slug: string;
  thumbnail_path: string | null;
  published_at: string | null;
}

export default function InformasiDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const [berita, setBerita] = useState<BeritaDetail | null>(null);
  const [terbaru, setTerbaru] = useState<BeritaItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    Promise.all([
      axios
        .get<{ data: BeritaDetail }>(`${API}/cms/public/informasi/${slug}`)
        .then((r) => r.data?.data),
      axios
        .get<{ data: BeritaItem[] }>(`${API}/cms/public/informasi/terbaru`)
        .then((r) => r.data?.data || []),
    ])
      .then(([detail, recent]) => {
        if (cancelled) return;
        setBerita(detail as BeritaDetail);
        setTerbaru(recent.filter((r: BeritaItem) => r.slug !== slug).slice(0, 5));
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [slug]);

  if (loading)
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="w-8 h-8 animate-spin text-green-600" />
      </div>
    );
  if (!berita)
    return (
      <div className="text-center py-32 text-gray-400">
        Berita tidak ditemukan.
      </div>
    );

  const heroImage = berita.thumbnail_path
    ? `${STORAGE}/${berita.thumbnail_path}`
    : "/assets/images/background/page-title.jpg";

  const publishedDate = berita.published_at
    ? new Date(berita.published_at)
    : null;

  return (
    <div className="min-h-screen bg-[#f8f9fa]">
      {/* ═══ HERO BANNER ═══ */}
      <section className="relative h-[250px] md:h-[320px] overflow-hidden bg-[#1a1a1a]">
        <img
          src={heroImage}
          alt={berita.judul}
          className="absolute inset-0 w-full h-full object-cover opacity-40"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/50 to-black/30" />
        <div className="relative z-10 h-full flex flex-col justify-end max-w-7xl mx-auto px-6 pb-10">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm mb-4">
            <Link href="/" className="text-[#fdb913] hover:text-white font-medium transition-colors">
              Beranda
            </Link>
            <span className="text-gray-400">/</span>
            <Link href="/informasi" className="text-[#fdb913] hover:text-white font-medium transition-colors">
              Informasi
            </Link>
          </div>
          {/* Title */}
          <h1 className="text-2xl md:text-4xl lg:text-5xl font-black text-white leading-tight uppercase max-w-4xl drop-shadow-lg">
            {berita.judul}
          </h1>
        </div>
      </section>

      {/* ═══ CONTENT AREA ═══ */}
      <section className="max-w-7xl mx-auto px-6 py-12">
        <div className="flex flex-col lg:flex-row gap-10">
          {/* ─── LEFT: Main Content ─── */}
          <article className="flex-1 min-w-0">
            {/* Thumbnail with date badge */}
            {berita.thumbnail_path && (
              <div className="relative rounded-2xl overflow-hidden shadow-lg mb-8">
                <img
                  src={`${STORAGE}/${berita.thumbnail_path}`}
                  alt={berita.judul}
                  className="w-full h-auto max-h-[500px] object-cover"
                />
                {/* Date Badge */}
                {publishedDate && (
                  <div className="absolute top-4 right-4 bg-[#fdb913] text-black rounded-lg px-3 py-2 text-center shadow-lg">
                    <span className="block text-2xl font-black leading-none">
                      {publishedDate.getDate()}
                    </span>
                    <span className="block text-[10px] font-bold uppercase tracking-wider">
                      {publishedDate.toLocaleDateString("id-ID", { month: "short" })}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Metadata row */}
            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 mb-6">
              {berita.published_at && (
                <span className="flex items-center gap-1.5">
                  <i className="fa-regular fa-calendar text-[#fdb913]"></i>
                  {new Date(berita.published_at).toLocaleDateString("id-ID", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </span>
              )}
              {berita.author && (
                <span className="flex items-center gap-1.5">
                  <i className="fa-regular fa-user text-[#fdb913]"></i>
                  {berita.author.name}
                </span>
              )}
              <span className="flex items-center gap-1.5">
                <i className="fa-regular fa-eye text-[#fdb913]"></i>
                {berita.views_count || 0} kali dibaca
              </span>
              {berita.sumber && (
                <span className="text-gray-400">Sumber: {berita.sumber}</span>
              )}
            </div>

            {/* Content */}
            <style dangerouslySetInnerHTML={{ __html: `
              .cms-content { overflow-wrap: break-word; word-break: break-word; }
              .cms-content .ql-align-center { text-align: center !important; }
              .cms-content .ql-align-right { text-align: right !important; }
              .cms-content .ql-align-justify { text-align: justify !important; }
              .cms-content p.ql-align-center { text-align: center !important; }
              .cms-content p.ql-align-right { text-align: right !important; }
              .cms-content p.ql-align-justify { text-align: justify !important; }
              .cms-content img { max-width: 100% !important; height: auto !important; border-radius: 12px; margin: 1.5rem 0; }
              .cms-content p { overflow-wrap: break-word; word-break: break-word; margin-bottom: 1rem; line-height: 1.8; }
            `}} />
            <div
              className="cms-content text-gray-700 text-base md:text-lg leading-relaxed"
              dangerouslySetInnerHTML={{ __html: berita.konten }}
            />
          </article>

          {/* ─── RIGHT: Sidebar ─── */}
          <aside className="w-full lg:w-[340px] shrink-0">
            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm sticky top-24">
              <h3 className="font-black text-gray-900 text-sm uppercase tracking-widest mb-5 pb-3 border-b border-gray-100">
                Informasi Terbaru
              </h3>
              <div className="space-y-5">
                {terbaru.map((item) => (
                  <Link
                    key={item.id}
                    href={`/informasi/${item.slug}`}
                    className="flex items-start gap-3 group"
                  >
                    <div className="w-16 h-16 rounded-lg bg-gray-100 overflow-hidden shrink-0">
                      {item.thumbnail_path ? (
                        <img
                          src={`${STORAGE}/${item.thumbnail_path}`}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gray-200" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] text-gray-400 flex items-center gap-1 mb-1">
                        <i className="fa-regular fa-calendar"></i>
                        {item.published_at
                          ? new Date(item.published_at).toLocaleString("id-ID", {
                              year: "numeric",
                              month: "2-digit",
                              day: "2-digit",
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : ""}
                      </p>
                      <p className="text-sm font-bold text-gray-900 line-clamp-2 group-hover:text-[#fdb913] transition-colors uppercase leading-snug">
                        {item.judul}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </section>
    </div>
  );
}
