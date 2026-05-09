"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import axios from "axios";
import {
  Newspaper,
  ArrowLeft,
  Calendar,
  Eye,
  User,
  Loader2,
} from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL;

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
    // Tarik detail + berita terbaru secara paralel
    Promise.all([
      axios
        .get<{ data: BeritaDetail }>(`${API}/cms/public/informasi/${slug}`)
        .then((r) => r.data?.data),
      axios
        .get<{ data: BeritaItem[] }>(`${API}/cms/public/informasi/terbaru`)
        .then((r) => r.data?.data || []),
    ])
      .then(([detail, recent]) => {
        setBerita(detail as BeritaDetail);
        // Jangan tampilkan berita ini sendiri di sidebar
        setTerbaru(recent.filter((r: BeritaItem) => r.slug !== slug));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
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

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      {/* Navigasi Kembali */}
      <Link
        href="/informasi"
        className="inline-flex items-center gap-2 text-green-700 font-bold text-sm hover:text-green-600 mb-6"
      >
        <ArrowLeft className="w-4 h-4" /> Kembali ke Daftar Berita
      </Link>

      <div className="flex flex-col lg:flex-row gap-10">
        {/* Kolom Utama (Konten Berita) */}
        <article className="flex-1 min-w-0">
          {/* Thumbnail */}
          {berita.thumbnail_path && (
            <div className="h-64 md:h-96 rounded-2xl overflow-hidden shadow-lg mb-6">
              <img
                src={`${process.env.NEXT_PUBLIC_STORAGE_URL}/${berita.thumbnail_path}`}
                alt={berita.judul}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {/* Kategori Badge */}
          {berita.category && (
            <span className="text-xs font-bold text-green-700 bg-green-100 px-3 py-1 rounded-full uppercase">
              {berita.category.nama}
            </span>
          )}

          {/* Judul */}
          <h1 className="text-2xl md:text-4xl font-black text-gray-900 mt-3 leading-tight">
            {berita.judul}
          </h1>

          {/* Metadata */}
          <div className="flex flex-wrap items-center gap-4 mt-4 text-sm text-gray-500">
            {berita.published_at && (
              <span className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />{" "}
                {formatDate(berita.published_at)}
              </span>
            )}
            {berita.author && (
              <span className="flex items-center gap-1">
                <User className="w-4 h-4" /> {berita.author.name}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Eye className="w-4 h-4" /> {berita.views_count || 0} kali dibaca
            </span>
            {berita.sumber && (
              <span className="text-gray-400">Sumber: {berita.sumber}</span>
            )}
          </div>

          {/* Garis Pemisah */}
          <hr className="my-6 border-gray-200" />

          {/* Konten HTML */}
          <div
            className="prose prose-green prose-lg max-w-none text-gray-700"
            dangerouslySetInnerHTML={{ __html: berita.konten }}
          />
        </article>

        {/* Sidebar: Berita Terbaru */}
        <aside className="w-full lg:w-80 shrink-0">
          <div className="bg-gray-50 rounded-2xl p-5 border border-gray-100 sticky top-24">
            <h3 className="font-black text-gray-900 mb-4 flex items-center gap-2">
              <Newspaper className="w-5 h-5 text-green-600" /> Berita Lainnya
            </h3>
            <div className="space-y-4">
              {terbaru.map((item) => (
                <Link
                  key={item.id}
                  href={`/informasi/${item.slug}`}
                  className="flex items-start gap-3 group"
                >
                  <div className="w-16 h-16 rounded-lg bg-green-100 overflow-hidden shrink-0">
                    {item.thumbnail_path ? (
                      <img
                        src={`${process.env.NEXT_PUBLIC_STORAGE_URL}/${item.thumbnail_path}`}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Newspaper className="w-5 h-5 text-green-300" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-gray-900 line-clamp-2 group-hover:text-green-700 transition-colors">
                      {item.judul}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      {item.published_at ? formatDate(item.published_at) : ""}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
