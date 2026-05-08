"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import axios from "axios";
import { ArrowLeft, Loader2, Shield } from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL;

interface TslDetail {
  id: number;
  nama_lokal: string;
  nama_latin?: string;
  slug: string;
  tipe: "satwa" | "tumbuhan";
  status_iucn?: string;
  thumbnail_path?: string;
  deskripsi?: string;
}

function getIucnFull(status: string | null | undefined): {
  bg: string;
  text: string;
  border: string;
  label: string;
} {
  switch (status) {
    case "CR":
      return {
        bg: "bg-red-100",
        text: "text-red-700",
        border: "border-red-200",
        label: "Critically Endangered (Kritis)",
      };
    case "EN":
      return {
        bg: "bg-orange-100",
        text: "text-orange-700",
        border: "border-orange-200",
        label: "Endangered (Terancam Punah)",
      };
    case "VU":
      return {
        bg: "bg-yellow-100",
        text: "text-yellow-700",
        border: "border-yellow-200",
        label: "Vulnerable (Rentan)",
      };
    case "NT":
      return {
        bg: "bg-blue-100",
        text: "text-blue-700",
        border: "border-blue-200",
        label: "Near Threatened (Hampir Terancam)",
      };
    case "LC":
      return {
        bg: "bg-green-100",
        text: "text-green-700",
        border: "border-green-200",
        label: "Least Concern (Risiko Rendah)",
      };
    default:
      return {
        bg: "bg-gray-100",
        text: "text-gray-500",
        border: "border-gray-200",
        label: "Belum Dinilai IUCN",
      };
  }
}

export default function TslDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const [data, setData] = useState<TslDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    axios
      .get(`${API}/cms/public/tsl/${slug}`)
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
        Spesies tidak ditemukan.
      </div>
    );

  const iucn = getIucnFull(data.status_iucn);

  return (
    <div className="max-w-4xl mx-auto px-4 py-12 space-y-8">
      <Link
        href="/tsl"
        className="inline-flex items-center gap-2 text-green-700 font-bold text-sm hover:text-green-600"
      >
        <ArrowLeft className="w-4 h-4" /> Kembali ke Daftar Spesies
      </Link>

      {/* Foto Spesies */}
      {data.thumbnail_path && (
        <div className="h-64 md:h-96 rounded-2xl overflow-hidden shadow-lg">
          <img
            src={`${process.env.NEXT_PUBLIC_STORAGE_URL}/${data.thumbnail_path}`}
            alt={data.nama_lokal}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {/* Nama + Tipe */}
      <div>
        <span className="text-xs font-bold text-green-600 uppercase">
          {data.tipe === "satwa" ? "🐾 Satwa" : "🌿 Tumbuhan"}
        </span>
        <h1 className="text-3xl md:text-4xl font-black text-gray-900 mt-1">
          {data.nama_lokal}
        </h1>
        {data.nama_latin && (
          <p className="text-lg text-gray-500 italic mt-1">{data.nama_latin}</p>
        )}
      </div>

      {/* Kartu Status IUCN */}
      {data.status_iucn && (
        <div
          className={`flex items-center gap-4 p-5 rounded-2xl border ${iucn.bg} ${iucn.border}`}
        >
          <Shield className={`w-10 h-10 ${iucn.text} shrink-0`} />
          <div>
            <p className={`font-black text-sm ${iucn.text}`}>
              Status Konservasi IUCN
            </p>
            <p className={`text-lg font-black ${iucn.text} mt-0.5`}>
              {iucn.label}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Berdasarkan IUCN Red List of Threatened Species™
            </p>
          </div>
        </div>
      )}

      {/* Deskripsi */}
      <div
        className="prose prose-green prose-lg max-w-none text-gray-700"
        dangerouslySetInnerHTML={{ __html: data.deskripsi || "" }}
      />
    </div>
  );
}
