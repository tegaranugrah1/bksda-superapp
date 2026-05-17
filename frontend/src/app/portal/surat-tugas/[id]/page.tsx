"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, FileText, Calendar, MapPin, Users } from "lucide-react";
import { RouteGuard } from "@/components/RouteGuard";
import { api } from "@/lib/api";

interface Employee {
  id: number;
  nama_lengkap: string;
  nip: string;
  jabatan?: string;
  pangkat_golongan?: string;
}

interface SuratTugasDetail {
  id: string;
  nomor_surat: string | null;
  dasar: string | null;
  menimbang: string | null;
  maksud_tujuan: string;
  tempat_tujuan: string | null;
  tanggal_mulai: string;
  tanggal_selesai: string;
  status: string;
  keterangan: string | null;
  transportasi: string | null;
  anggaran_dari: string | null;
  created_at: string;
  employees: Employee[];
  creator?: { id: number; name: string };
  approver?: { id: number; name: string };
}

export default function SuratTugasPreviewPage() {
  const params = useParams();
  const router = useRouter();
  const [data, setData] = useState<SuratTugasDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const resp = await api.get(`/surat-tugas/my/${params.id}`);
        setData(resp.data.data);
      } catch (err: any) {
        setError(err?.response?.data?.message || "Gagal memuat data surat tugas");
      } finally {
        setLoading(false);
      }
    };
    if (params.id) fetchData();
  }, [params.id]);

  if (loading) {
    return (
      <RouteGuard>
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-500 mx-auto mb-3" />
            <p className="text-sm text-slate-500">Memuat surat tugas...</p>
          </div>
        </div>
      </RouteGuard>
    );
  }

  if (error || !data) {
    return (
      <RouteGuard>
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
          <div className="text-center">
            <p className="text-sm text-red-500 mb-4">{error || "Data tidak ditemukan"}</p>
            <Link href="/portal" className="text-emerald-600 hover:underline text-sm">
              &larr; Kembali ke Portal
            </Link>
          </div>
        </div>
      </RouteGuard>
    );
  }

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });

  return (
    <RouteGuard>
      <div className="min-h-screen bg-slate-100 dark:bg-slate-950 py-8 px-4">
        {/* Back link */}
        <div className="max-w-4xl mx-auto mb-4">
          <Link href="/portal" className="inline-flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 hover:text-emerald-600 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Kembali ke Portal
          </Link>
        </div>

        {/* Letter preview */}
        <div className="max-w-4xl mx-auto bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
          {/* Header */}
          <div className="border-b border-slate-200 dark:border-slate-800 p-8 text-center">
            <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wide">
              Surat Tugas
            </h1>
            {data.nomor_surat && (
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Nomor: {data.nomor_surat}
              </p>
            )}
          </div>

          {/* Body */}
          <div className="p-8 space-y-6">
            {/* Menimbang */}
            {data.menimbang && (
              <div>
                <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Menimbang</h3>
                <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-line">{data.menimbang}</p>
              </div>
            )}

            {/* Dasar */}
            {data.dasar && (
              <div>
                <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Dasar</h3>
                <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-line">{data.dasar}</p>
              </div>
            )}

            {/* Maksud & Tujuan */}
            <div>
              <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Maksud & Tujuan</h3>
              <p className="text-sm text-slate-700 dark:text-slate-300">{data.maksud_tujuan}</p>
            </div>

            {/* Info Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
              {data.tempat_tujuan && (
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Tempat Tujuan</p>
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{data.tempat_tujuan}</p>
                  </div>
                </div>
              )}
              <div className="flex items-start gap-2">
                <Calendar className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Tanggal</p>
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    {formatDate(data.tanggal_mulai)} — {formatDate(data.tanggal_selesai)}
                  </p>
                </div>
              </div>
              {data.transportasi && (
                <div className="flex items-start gap-2">
                  <FileText className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Transportasi</p>
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{data.transportasi}</p>
                  </div>
                </div>
              )}
              {data.anggaran_dari && (
                <div className="flex items-start gap-2">
                  <FileText className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Anggaran</p>
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{data.anggaran_dari}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Personil */}
            {data.employees && data.employees.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                  <Users className="w-3.5 h-3.5" />
                  Personil yang Ditugaskan
                </h3>
                <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 dark:bg-slate-800">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 dark:text-slate-400">No</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 dark:text-slate-400">Nama</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 dark:text-slate-400">NIP</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 dark:text-slate-400">Jabatan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                      {data.employees.map((emp, idx) => (
                        <tr key={emp.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                          <td className="px-4 py-2 text-slate-600 dark:text-slate-400">{idx + 1}</td>
                          <td className="px-4 py-2 font-medium text-slate-700 dark:text-slate-300">{emp.nama_lengkap}</td>
                          <td className="px-4 py-2 text-slate-600 dark:text-slate-400">{emp.nip}</td>
                          <td className="px-4 py-2 text-slate-600 dark:text-slate-400">{emp.jabatan || "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Keterangan */}
            {data.keterangan && (
              <div>
                <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Keterangan</h3>
                <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-line">{data.keterangan}</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-slate-200 dark:border-slate-800 p-6 text-center text-xs text-slate-400">
            Dokumen ini dihasilkan oleh sistem BKSDA SuperApp
          </div>
        </div>
      </div>
    </RouteGuard>
  );
}
