/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import axios from "axios";
import { MapPin, TreePine, Loader2 } from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL;

// KRUSIAL: Import Peta secara dinamis (ssr: false) agar tidak crash!
const KawasanMap = dynamic(() => import("./_components/KawasanMap"), {
  ssr: false,
});

interface Kawasan {
  id: number;
  nama: string;
  slug: string;
  tipe_kawasan?: string;
  thumbnail_path?: string;
  latitude?: string | number;
  longitude?: string | number;
  luas_ha?: string | number;
}

export default function KawasanListPage() {
  const [kawasan, setKawasan] = useState<Kawasan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios
      .get(`${API}/cms/public/kawasan`)
      .then((r) => setKawasan(r.data?.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Siapkan data marker untuk peta (hanya kawasan yang punya koordinat)
  const markers = kawasan
    .filter((k) => k.latitude && k.longitude)
    .map((k) => ({
      lat: Number(k.latitude),
      lng: Number(k.longitude),
      nama: k.nama,
      slug: k.slug,
    }));

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="w-8 h-8 animate-spin text-green-600" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-12 space-y-10">
      {/* Header */}
      <div>
        <h1 className="text-3xl md:text-4xl font-black text-gray-900 flex items-center gap-3">
          <MapPin className="w-9 h-9 text-green-600" /> Kawasan Konservasi
        </h1>
        <p className="text-gray-500 mt-2 max-w-2xl">
          Kami mengelola {kawasan.length} kawasan konservasi meliputi cagar
          alam, suaka margasatwa, dan taman wisata alam.
        </p>
      </div>

      {/* Peta Interaktif — Semua Kawasan Ditandai */}
      {markers.length > 0 && <KawasanMap markers={markers} height="400px" />}

      {/* Grid Kartu */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {kawasan.map((item) => (
          <Link
            key={item.id}
            href={`/kawasan/${item.slug}`}
            className="group bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all hover:-translate-y-1"
          >
            <div className="h-48 bg-green-50 overflow-hidden">
              {item.thumbnail_path ? (
                <img
                  src={`${process.env.NEXT_PUBLIC_STORAGE_URL}/${item.thumbnail_path}`}
                  alt={item.nama}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <TreePine className="w-12 h-12 text-green-200" />
                </div>
              )}
            </div>
            <div className="p-5">
              <p className="text-xs font-bold text-green-600 uppercase">
                {item.tipe_kawasan || "Kawasan Konservasi"}
              </p>
              <h3 className="font-black text-gray-900 text-lg mt-1 group-hover:text-green-700 transition-colors">
                {item.nama}
              </h3>
              {item.luas_ha && (
                <p className="text-sm text-gray-400 mt-2 flex items-center gap-1">
                  📐 {Number(item.luas_ha).toLocaleString()} Hektar
                </p>
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}





