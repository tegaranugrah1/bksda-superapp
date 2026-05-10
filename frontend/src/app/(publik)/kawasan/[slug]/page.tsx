/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import dynamic from "next/dynamic";
import axios from "axios";
import { MapPin, ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";

const API = process.env.NEXT_PUBLIC_API_URL;
const KawasanMap = dynamic(() => import("../_components/KawasanMap"), {
  ssr: false,
});

interface KawasanDetail {
  id: number;
  nama: string;
  slug: string;
  tipe_kawasan?: string;
  thumbnail_path?: string;
  latitude?: string | number;
  longitude?: string | number;
  luas_ha?: string | number;
  deskripsi?: string;
}

export default function KawasanDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const [data, setData] = useState<KawasanDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    axios
      .get(`${API}/cms/public/kawasan/${slug}`)
      .then((r) => setData(r.data?.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading)
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="w-8 h-8 animate-spin text-green-600" />
      </div>
    );
  if (!data)
    return (
      <div className="text-center py-32 text-gray-400">
        Kawasan tidak ditemukan.
      </div>
    );

  const hasCoordinates = data.latitude && data.longitude;

  return (
    <div className="max-w-4xl mx-auto px-4 py-12 space-y-8">
      {/* Navigasi Kembali */}
      <Link
        href="/kawasan"
        className="inline-flex items-center gap-2 text-green-700 font-bold text-sm hover:text-green-600"
      >
        <ArrowLeft className="w-4 h-4" /> Kembali ke Daftar Kawasan
      </Link>

      {/* Thumbnail */}
      {data.thumbnail_path && (
        <div className="h-64 md:h-96 rounded-2xl overflow-hidden shadow-lg">
          <img
            src={`${process.env.NEXT_PUBLIC_STORAGE_URL}/${data.thumbnail_path}`}
            alt={data.nama}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {/* Judul + Metadata */}
      <div>
        <p className="text-sm font-bold text-green-600 uppercase">
          {data.tipe_kawasan || "Kawasan Konservasi"}
        </p>
        <h1 className="text-3xl md:text-4xl font-black text-gray-900 mt-1">
          {data.nama}
        </h1>
        <div className="flex flex-wrap gap-4 mt-3 text-sm text-gray-500">
          {data.luas_ha && (
            <span className="flex items-center gap-1">
              📐 {Number(data.luas_ha).toLocaleString()} Hektar
            </span>
          )}
          {hasCoordinates && (
            <span className="flex items-center gap-1">
              <MapPin className="w-4 h-4" /> {data.latitude}, {data.longitude}
            </span>
          )}
        </div>
      </div>

      {/* Konten Deskripsi */}
      <div
        className="prose prose-green max-w-none text-gray-700 leading-relaxed"
        dangerouslySetInnerHTML={{ __html: data.deskripsi || "" }}
      />

      {/* Peta Lokasi */}
      {hasCoordinates && (
        <div>
          <h3 className="text-lg font-black text-gray-900 mb-4 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-green-600" /> Lokasi di Peta
          </h3>
          <KawasanMap
            center={{
              lat: Number(data.latitude),
              lng: Number(data.longitude),
              nama: data.nama,
            }}
            height="450px"
          />
        </div>
      )}
    </div>
  );
}




