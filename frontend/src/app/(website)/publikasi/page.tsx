"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import {
  BookOpen,
  FileImage,
  Image,
  Scale,
  Download,
  Loader2,
  ExternalLink,
} from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL;
const STORAGE = process.env.NEXT_PUBLIC_STORAGE_URL;

// Konfigurasi 4 Tab
const TABS = [
  { key: "buku", label: "Buku", icon: BookOpen, endpoint: "/cms/public/buku" },
  {
    key: "leaflet",
    label: "Leaflet",
    icon: FileImage,
    endpoint: "/cms/public/leaflet",
  },
  {
    key: "poster",
    label: "Poster",
    icon: Image,
    endpoint: "/cms/public/poster",
  },
  {
    key: "regulasi",
    label: "Regulasi",
    icon: Scale,
    endpoint: "/cms/public/regulasi",
  },
] as const;

type TabKey = (typeof TABS)[number]["key"];

interface PublicationItem {
  id: number;
  judul: string;
  thumbnail_path?: string;
  cover_path?: string;
  file_path?: string;
  penulis?: string;
  penerbit?: string;
  tahun_terbit?: string | number;
  nomor?: string;
  tahun?: string | number;
  deskripsi?: string;
}

export default function PublikasiPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("buku");
  const [data, setData] = useState<PublicationItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Tarik data setiap kali tab berubah
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    const tab = TABS.find((t) => t.key === activeTab)!;
    axios
      .get(`${API}${tab.endpoint}`)
      .then((r) => setData(r.data?.data || []))
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, [activeTab]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-12 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl md:text-4xl font-black text-gray-900 flex items-center gap-3">
          <BookOpen className="w-9 h-9 text-green-600" /> Publikasi
        </h1>
        <p className="text-gray-500 mt-2">
          Unduh buku, brosur, poster, dan dokumen regulasi terbitan BKSDA.
        </p>
      </div>

      {/* Tab Switcher */}
      <div className="flex flex-wrap gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold transition-all ${
                activeTab === tab.key
                  ? "bg-white text-green-700 shadow-md"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <Icon className="w-4 h-4" /> {tab.label}
            </button>
          );
        })}
      </div>

      {/* Konten Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-green-600" />
        </div>
      ) : data.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <BookOpen className="w-12 h-12 mx-auto mb-3 text-gray-200" />
          <p>Belum ada publikasi {activeTab}.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {data.map((item) => (
            <PublikasiCard key={item.id} item={item} type={activeTab} />
          ))}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════
// KOMPONEN KARTU UNIVERSAL (Dipakai Keempat Tab)
// ══════════════════════════════════════════════════

interface CardProps {
  item: PublicationItem;
  type: TabKey;
}

function PublikasiCard({ item, type }: CardProps) {
  const STORAGE = process.env.NEXT_PUBLIC_STORAGE_URL;

  // Tentukan path thumbnail & file download berdasarkan tipe
  const thumbnailPath =
    item.thumbnail_path || item.cover_path || item.file_path;
  const downloadPath = item.file_path;
  const downloadUrl = downloadPath ? `${STORAGE}/${downloadPath}` : null;

  return (
    <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all group flex flex-col">
      {/* Thumbnail / Sampul */}
      <div className="h-52 bg-gray-50 overflow-hidden">
        {thumbnailPath ? (
          <img
            src={`${STORAGE}/${thumbnailPath}`}
            alt={item.judul}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <BookOpen className="w-12 h-12 text-gray-200" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-4 flex-1 flex flex-col">
        <h3 className="font-bold text-gray-900 text-sm line-clamp-2">
          {item.judul}
        </h3>

        {/* Metadata Spesifik per Tipe */}
        {type === "buku" && (
          <div className="mt-2 space-y-0.5 text-xs text-gray-400">
            {item.penulis && <p>✍️ {item.penulis}</p>}
            {item.penerbit && <p>🏢 {item.penerbit}</p>}
            {item.tahun_terbit && <p>📅 {item.tahun_terbit}</p>}
          </div>
        )}

        {type === "regulasi" && (
          <div className="mt-2 space-y-0.5 text-xs text-gray-400">
            {item.nomor && <p>📜 No. {item.nomor}</p>}
            {item.tahun && <p>📅 Tahun {item.tahun}</p>}
          </div>
        )}

        {(type === "leaflet" || type === "poster") && item.deskripsi && (
          <p className="text-xs text-gray-400 mt-2 line-clamp-2">
            {item.deskripsi}
          </p>
        )}

        {/* Spacer agar tombol selalu di bawah */}
        <div className="flex-1" />

        {/* Tombol Download */}
        {downloadUrl ? (
          <a
            href={downloadUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-500 text-white px-4 py-2.5 rounded-xl font-bold text-sm transition-all"
          >
            <Download className="w-4 h-4" /> Unduh
          </a>
        ) : (
          <div className="mt-4 flex items-center justify-center gap-2 bg-gray-100 text-gray-400 px-4 py-2.5 rounded-xl text-sm cursor-not-allowed">
            <ExternalLink className="w-4 h-4" /> Tidak Tersedia
          </div>
        )}
      </div>
    </div>
  );
}
