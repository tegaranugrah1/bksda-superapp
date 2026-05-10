/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import axios from "axios";
import {
  TreePine,
  Search,
  Loader2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL;

interface TslItem {
  id: number;
  nama_lokal: string;
  nama_latin?: string;
  slug: string;
  tipe: "satwa" | "tumbuhan";
  status_iucn?: string;
  thumbnail_path?: string;
}

function getIucnStyle(status: string | null | undefined) {
  switch (status) {
    case "CR":
      return { bg: "bg-red-100", text: "text-red-700" };
    case "EN":
      return { bg: "bg-orange-100", text: "text-orange-700" };
    case "VU":
      return { bg: "bg-yellow-100", text: "text-yellow-700" };
    case "NT":
      return { bg: "bg-blue-100", text: "text-blue-700" };
    case "LC":
      return { bg: "bg-green-100", text: "text-green-700" };
    default:
      return { bg: "bg-gray-100", text: "text-gray-500" };
  }
}

export default function TslListPage() {
  const [data, setData] = useState<TslItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [tipe, setTipe] = useState<"" | "satwa" | "tumbuhan">("");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");

  // Debounce pencarian
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Tarik data spesies
  useEffect(() => {
    const params: Record<string, string | number> = { page };
    if (tipe) params.tipe = tipe;
    if (search) params.search = search;

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    axios
      .get(`${API}/cms/public/tsl`, { params })
      .then((r) => {
        const resData = r.data?.data;
        // Handle: paginate mengembalikan { data: [...], last_page: N }
        if (Array.isArray(resData)) {
          setData(resData);
        } else {
          setData(resData?.data || []);
          setLastPage(resData?.last_page || 1);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [page, tipe, search]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-12 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl md:text-4xl font-black text-gray-900 flex items-center gap-3">
          <TreePine className="w-9 h-9 text-green-600" /> Tumbuhan & Satwa Liar
        </h1>
        <p className="text-gray-500 mt-2">
          Ensiklopedia spesies dilindungi di kawasan konservasi BKSDA.
        </p>
      </div>

      {/* Filter: Tab Tipe + Pencarian */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gray-50 rounded-2xl p-4 border border-gray-100">
        <div className="flex gap-2">
          {[
            { value: "", label: "Semua" },
            { value: "satwa", label: "🐾 Satwa" },
            { value: "tumbuhan", label: "🌿 Tumbuhan" },
          ].map((tab) => (
            <button
              key={tab.value}
              onClick={() => {
                setTipe(tab.value as "" | "satwa" | "tumbuhan");
                setPage(1);
              }}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                tipe === tab.value
                  ? "bg-green-600 text-white shadow-md"
                  : "bg-white text-gray-600 hover:bg-green-50 border border-gray-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="relative w-full md:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Cari nama spesies..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-all"
          />
        </div>
      </div>

      {/* Grid Spesies */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-green-600" />
        </div>
      ) : data.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <TreePine className="w-12 h-12 mx-auto mb-3 text-gray-200" />
          <p>Tidak ada spesies ditemukan.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
          {data.map((item) => {
            const iucn = getIucnStyle(item.status_iucn);
            return (
              <Link
                key={item.id}
                href={`/tsl/${item.slug}`}
                className="group bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all hover:-translate-y-1"
              >
                <div className="h-40 bg-green-50 overflow-hidden">
                  {item.thumbnail_path ? (
                    <img
                      src={`${process.env.NEXT_PUBLIC_STORAGE_URL}/${item.thumbnail_path}`}
                      alt={item.nama_lokal}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <TreePine className="w-10 h-10 text-green-200" />
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <p className="font-bold text-gray-900 text-sm line-clamp-1 group-hover:text-green-700 transition-colors">
                    {item.nama_lokal}
                  </p>
                  <p className="text-xs text-gray-400 italic line-clamp-1 mt-0.5">
                    {item.nama_latin || ""}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    {item.status_iucn && (
                      <span
                        className={`text-[10px] font-black px-2 py-0.5 rounded-full ${iucn.bg} ${iucn.text}`}
                      >
                        {item.status_iucn}
                      </span>
                    )}
                    <span className="text-[10px] text-gray-400">
                      {item.tipe === "satwa" ? "🐾 Satwa" : "🌿 Tumbuhan"}
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {lastPage > 1 && (
        <div className="flex items-center justify-center gap-2 pt-4">
          <button
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
            className="flex items-center gap-1 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40"
          >
            <ChevronLeft className="w-4 h-4" /> Sebelumnya
          </button>
          <span className="px-4 py-2 text-sm text-gray-500">
            Hal. {page} / {lastPage}
          </span>
          <button
            disabled={page >= lastPage}
            onClick={() => setPage((p) => p + 1)}
            className="flex items-center gap-1 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40"
          >
            Selanjutnya <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}





