"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import axios from "axios";
import {
  Newspaper,
  Search,
  Loader2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL;

interface BeritaItem {
  id: string | number;
  judul: string;
  slug: string;
  thumbnail_path: string | null;
  category: { nama: string; slug: string } | null;
  published_at: string | null;
  views_count?: number;
  sumber?: string;
}

interface CategoryItem {
  id: string | number;
  nama: string;
  slug: string;
  tipe: string;
}

interface PaginatedResponse {
  data: BeritaItem[];
  last_page: number;
}

interface QueryParams {
  page: number;
  search?: string;
  category_slug?: string;
}

interface ListState {
  berita: BeritaItem[];
  lastPage: number;
  loading: boolean;
}

export default function InformasiListPage() {
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [state, setState] = useState<ListState>({
    berita: [],
    lastPage: 1,
    loading: true,
  });
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("");

  // Tarik daftar Kategori (sekali saat halaman dimuat)
  useEffect(() => {
    axios
      .get(`${API}/cms/public/categories?tipe=informasi`)
      .then((r) => setCategories(r.data?.data || []))
      .catch(() => {});
  }, []);

  // Tarik daftar Berita (setiap kali filter/page berubah)
  useEffect(() => {
    const params: QueryParams = { page };
    if (search) params.search = search;
    if (activeCategory) params.category_slug = activeCategory;

    setState((s) => ({ ...s, loading: true }));

    axios
      .get<PaginatedResponse>(`${API}/cms/public/informasi`, { params })
      .then((r) => {
        setState({
          berita: r.data?.data || [],
          lastPage: r.data?.last_page || 1,
          loading: false,
        });
      })
      .catch(() => {
        setState((s) => ({ ...s, loading: false }));
      });
  }, [page, search, activeCategory]);

  // Debounce pencarian (tunggu 500ms setelah berhenti mengetik)
  const [searchInput, setSearchInput] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

  return (
    <div className="max-w-7xl mx-auto px-4 py-12 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl md:text-4xl font-black text-gray-900 flex items-center gap-3">
          <Newspaper className="w-9 h-9 text-green-600" /> Informasi & Berita
        </h1>
        <p className="text-gray-500 mt-2">
          Siaran pers, pengumuman, dan kegiatan terbaru BKSDA.
        </p>
      </div>

      {/* Bar Filter: Kategori + Pencarian */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gray-50 rounded-2xl p-4 border border-gray-100">
        {/* Tab Kategori */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => {
              setActiveCategory("");
              setPage(1);
            }}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
              !activeCategory
                ? "bg-green-600 text-white shadow-md"
                : "bg-white text-gray-600 hover:bg-green-50 border border-gray-200"
            }`}
          >
            Semua
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => {
                setActiveCategory(cat.slug);
                setPage(1);
              }}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                activeCategory === cat.slug
                  ? "bg-green-600 text-white shadow-md"
                  : "bg-white text-gray-600 hover:bg-green-50 border border-gray-200"
              }`}
            >
              {cat.nama}
            </button>
          ))}
        </div>
        {/* Pencarian */}
        <div className="relative w-full md:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Cari judul berita..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-all"
          />
        </div>
      </div>

      {/* Grid Berita */}
      {state.loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-green-600" />
        </div>
      ) : state.berita.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <Newspaper className="w-12 h-12 mx-auto mb-3 text-gray-200" />
          <p>Tidak ada berita yang ditemukan.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {state.berita.map((item) => (
            <Link
              key={item.id}
              href={`/informasi/${item.slug}`}
              className="group bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all hover:-translate-y-1"
            >
              {/* Thumbnail */}
              <div className="h-48 bg-gray-100 overflow-hidden">
                {item.thumbnail_path ? (
                  <img
                    src={`${process.env.NEXT_PUBLIC_STORAGE_URL}/${item.thumbnail_path}`}
                    alt={item.judul}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-green-50">
                    <Newspaper className="w-12 h-12 text-green-200" />
                  </div>
                )}
              </div>
              {/* Meta */}
              <div className="p-5">
                <div className="flex items-center gap-2 mb-2">
                  {item.category && (
                    <span className="text-[10px] font-bold text-green-700 bg-green-100 px-2 py-0.5 rounded-full uppercase">
                      {item.category.nama}
                    </span>
                  )}
                  <span className="text-xs text-gray-400">
                    {item.published_at ? formatDate(item.published_at) : ""}
                  </span>
                </div>
                <h3 className="font-bold text-gray-900 line-clamp-2 group-hover:text-green-700 transition-colors">
                  {item.judul}
                </h3>
                <p className="text-sm text-gray-400 mt-2 flex items-center gap-1">
                  👁️ {item.views_count || 0} kali dibaca
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Pagination */}
      {state.lastPage > 1 && (
        <div className="flex items-center justify-center gap-2 pt-4">
          <button
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
            className="flex items-center gap-1 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition-all"
          >
            <ChevronLeft className="w-4 h-4" /> Sebelumnya
          </button>
          <span className="px-4 py-2 text-sm text-gray-500">
            Hal. {page} / {state.lastPage}
          </span>
          <button
            disabled={page >= state.lastPage}
            onClick={() => setPage((p) => p + 1)}
            className="flex items-center gap-1 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition-all"
          >
            Selanjutnya <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
