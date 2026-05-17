/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import axios from "axios";
import { ArrowLeft, Calendar, Eye, User, Loader2 } from "lucide-react";

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

export default function InformasiDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const [berita, setBerita] = useState<BeritaDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    axios
      .get<{ data: BeritaDetail }>(`${API}/cms/public/informasi/${slug}`)
      .then((r) => {
        if (!cancelled) setBerita(r.data?.data as BeritaDetail);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [slug]);

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

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

  return (
    <div className="min-h-screen bg-[#f8f9fa]">
      {/* ═══ HERO BANNER (Full-width thumbnail as background) ═══ */}
      <section className="relative h-[50vh] md:h-[60vh] overflow-hidden">
        <img
          src={heroImage}
          alt={berita.judul}
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/20" />

        {/* Content overlay */}
        <div className="relative z-10 h-full flex flex-col justify-end">
          <div className="max-w-4xl mx-auto w-full px-6 pb-10 md:pb-14">
            {/* Back button */}
            <Link
              href="/informasi"
              className="inline-flex items-center gap-2 text-[#fdb913] font-bold text-sm uppercase tracking-wider mb-6 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Kembali ke Daftar
            </Link>

            {/* Category badge */}
            {berita.category && (
              <span className="inline-block text-xs font-bold text-black bg-[#fdb913] px-3 py-1 rounded-full uppercase mb-4">
                {berita.category.nama}
              </span>
            )}

            {/* Title */}
            <h1 className="text-3xl md:text-5xl font-black text-white leading-tight drop-shadow-lg">
              {berita.judul}
            </h1>

            {/* Metadata */}
            <div className="flex flex-wrap items-center gap-4 mt-4 text-sm text-gray-300">
              {berita.published_at && (
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-[#fdb913]" />
                  {formatDate(berita.published_at)}
                </span>
              )}
              {berita.author && (
                <span className="flex items-center gap-1.5">
                  <User className="w-4 h-4" /> {berita.author.name}
                </span>
              )}
              <span className="flex items-center gap-1.5">
                <Eye className="w-4 h-4" /> {berita.views_count || 0} kali
                dibaca
              </span>
              {berita.sumber && (
                <span className="text-gray-400">Sumber: {berita.sumber}</span>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ═══ CONTENT CARD ═══ */}
      <section className="relative z-20 -mt-10">
        <div className="max-w-4xl mx-auto px-6">
          <article className="bg-white rounded-3xl shadow-xl p-10 md:p-16 lg:p-20 border border-gray-100">
            <style
              dangerouslySetInnerHTML={{
                __html: `
              .cms-content { overflow-wrap: break-word; word-break: break-word; }
              .cms-content .ql-align-center { text-align: center !important; }
              .cms-content .ql-align-right { text-align: right !important; }
              .cms-content .ql-align-justify { text-align: justify !important; }
              .cms-content p.ql-align-center { text-align: center !important; }
              .cms-content p.ql-align-right { text-align: right !important; }
              .cms-content p.ql-align-justify { text-align: justify !important; }
              .cms-content img { max-width: 100% !important; height: auto !important; border-radius: 12px; margin: 1.5rem 0; }
              .cms-content p { overflow-wrap: break-word; word-break: break-word; margin-bottom: 1rem; }
            `,
              }}
            />
            <div
              className="cms-content prose prose-lg max-w-none text-gray-700 leading-relaxed"
              dangerouslySetInnerHTML={{ __html: berita.konten }}
            />
          </article>

          {/* Bottom spacing */}
          <div className="h-20" />
        </div>
      </section>
    </div>
  );
}
