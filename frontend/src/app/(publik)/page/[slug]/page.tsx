/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import axios from "axios";
import { Loader2, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { sanitizeHtml } from "@/lib/utils";

const API = process.env.NEXT_PUBLIC_API_URL;
const STORAGE = process.env.NEXT_PUBLIC_STORAGE_URL;

interface PageData {
  id: string;
  judul: string;
  slug: string;
  konten: string;
  thumbnail_path?: string;
}

export default function GenericCmsPage() {
  const { slug } = useParams<{ slug: string }>();
  const [page, setPage] = useState<PageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    axios
      .get(`${API}/cms/public/page/${slug}`)
      .then((r) => { if (!cancelled) setPage(r.data?.data || null); })
      .catch(() => { if (!cancelled) setError(true); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [slug]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-green-600" />
      </div>
    );
  }

  if (error || !page) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center">
        <h2 className="text-2xl font-black text-gray-900 mb-3">
          Halaman Tidak Ditemukan
        </h2>
        <p className="text-gray-500 mb-6">
          Halaman yang Anda cari belum tersedia atau telah dihapus.
        </p>
        <Link
          href="/profil"
          className="inline-flex items-center gap-2 text-green-700 font-bold text-sm hover:text-green-600"
        >
          <ArrowLeft className="w-4 h-4" /> Kembali ke Profil
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <div className="relative h-[280px] md:h-[350px] bg-green-900 overflow-hidden flex items-center justify-center">
        {page.thumbnail_path ? (
          <img
            src={`${STORAGE}/${page.thumbnail_path}`}
            alt={page.judul}
            className="absolute inset-0 w-full h-full object-cover opacity-30"
          />
        ) : (
          <img
            src="/assets/header.png"
            alt=""
            className="absolute inset-0 w-full h-full object-cover opacity-20"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-green-900/90 to-green-900/50" />
        <div className="relative z-10 text-center px-4">
          <h1 className="text-3xl md:text-5xl font-black text-white uppercase tracking-wide">
            {page.judul}
          </h1>
          <div className="w-16 h-1.5 bg-green-400 mx-auto rounded-full mt-4" />
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-12 md:py-16">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-400 mb-8">
          <Link href="/" className="hover:text-green-700">
            Beranda
          </Link>
          <span>/</span>
          <Link href="/profil" className="hover:text-green-700">
            Profil
          </Link>
          <span>/</span>
          <span className="text-gray-700 font-medium">{page.judul}</span>
        </div>

        {/* Article Content */}
        <style dangerouslySetInnerHTML={{ __html: `
          .cms-content .ql-align-center { text-align: center !important; }
          .cms-content .ql-align-right { text-align: right !important; }
          .cms-content .ql-align-justify { text-align: justify !important; }
          .cms-content p.ql-align-center { text-align: center !important; }
          .cms-content p.ql-align-right { text-align: right !important; }
          .cms-content p.ql-align-justify { text-align: justify !important; }
        `}} />
        <article
          className="cms-content prose prose-lg prose-green max-w-none
            prose-headings:font-black prose-headings:text-gray-900
            prose-p:text-gray-600 prose-p:leading-relaxed
            prose-img:rounded-xl prose-img:shadow-lg
            prose-a:text-green-700 prose-a:no-underline hover:prose-a:underline
            prose-strong:text-gray-900
            prose-ul:text-gray-600 prose-ol:text-gray-600"
          dangerouslySetInnerHTML={{ __html: sanitizeHtml(page.konten) }}
        />

        {/* Back Link */}
        <div className="mt-12 pt-8 border-t border-gray-100">
          <Link
            href="/profil"
            className="inline-flex items-center gap-2 text-green-700 font-bold text-sm hover:text-green-600"
          >
            <ArrowLeft className="w-4 h-4" /> Kembali ke Profil
          </Link>
        </div>
      </div>
    </div>
  );
}
