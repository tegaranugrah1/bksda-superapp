"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, FileText, Calendar, MapPin, Users, Printer, Download } from "lucide-react";
import { RouteGuard } from "@/components/RouteGuard";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { formatNIP, formatDateRangeIndonesian } from "@/lib/letter-utils";

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
  dasar: unknown;
  menimbang: unknown;
  maksud_tujuan: string;
  tempat_tujuan: string | null;
  tanggal_mulai: string;
  tanggal_selesai: string;
  status: string;
  keterangan: string | null;
  transportasi: string | null;
  anggaran_dari: string | null;
  created_at: string;
  jumlah_buruh?: number;
  employees: Employee[];
  creator?: { id: number; name: string };
  approver?: { id: number; name: string };
}


function parseItems(value: unknown): string[] {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (typeof item === "string") return item;
        if (item && typeof item === "object" && "text" in item) return String((item as { text: unknown }).text);
        return String(item);
      })
      .filter(Boolean);
  }
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parseItems(parsed);
      }
    } catch {}
    return [value];
  }
  return [];
}

function SuratTugasPreviewContent() {
  const params = useParams();
  const rawId = Array.isArray(params.id) ? params.id[0] : params.id;
  const cleanId = rawId ? encodeURIComponent(String(rawId)) : "";

  const [data, setData] = useState<SuratTugasDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    if (!cleanId || downloading) return;
    setDownloading(true);
    try {
      const resp = await api.get(`/surat-tugas/my/${cleanId}/download?download=1`, {
        responseType: "blob",
        timeout: 30000,
      });
      const blob = new Blob([resp.data]);
      const blobType = resp.data?.type || resp.headers["content-type"] || "";
      const ext = blobType.includes("pdf") ? "pdf" : blobType.includes("txt") ? "txt" : "pdf";
      let filename = `SuratTugas_${data?.nomor_surat ? data.nomor_surat.replace(/[\/\\:*?"<>|]/g, "_") : cleanId}.${ext}`;
      const contentDisposition = resp.headers["content-disposition"];
      if (contentDisposition) {
        const match = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
        if (match && match[1]) {
          try {
            filename = decodeURIComponent(match[1].replace(/['"]/g, ""));
          } catch {
            filename = match[1].replace(/['"]/g, "");
          }
          filename = filename.replace(/[\/\\:*?"<>|]/g, "_");
        }
      }
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      setTimeout(() => window.URL.revokeObjectURL(url), 1000);
    } catch (err: unknown) {
      let errorMsg = "Gagal mengunduh dokumen surat tugas.";
      const errorObj = err as { response?: { data?: unknown } };
      try {
        if (errorObj.response?.data instanceof Blob) {
          const text = await errorObj.response.data.text();
          const json = JSON.parse(text);
          if (json.message) errorMsg = json.message;
        } else if (typeof errorObj.response?.data === "object" && errorObj.response?.data && "message" in errorObj.response.data) {
          errorMsg = String((errorObj.response.data as { message: unknown }).message);
        }
      } catch {}
      toast.error(errorMsg);
    } finally {
      setDownloading(false);
    }
  };

  useEffect(() => {
    if (!cleanId) {
      setLoading(false);
      setError("ID Surat Tugas tidak valid");
      return;
    }
    const fetchData = async () => {
      try {
        const resp = await api.get(`/surat-tugas/my/${cleanId}`);
        setData(resp.data.data);
      } catch (err: unknown) {
        const error = err as { response?: { data?: { message?: string } } };
        setError(error.response?.data?.message || "Gagal memuat data surat tugas");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [cleanId]);

  if (loading) {
    return (
      <RouteGuard>
        <div data-module="surat-tugas" className="st-ui st-portal-preview min-h-screen flex items-center justify-center bg-[var(--ds-surface)]">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-[var(--ds-status-success-fg)] mx-auto mb-3" />
            <p className="text-sm text-[var(--ds-fg-muted)]">Memuat surat tugas...</p>
          </div>
        </div>
      </RouteGuard>
    );
  }

  if (error || !data) {
    return (
      <RouteGuard>
        <div data-module="surat-tugas" className="st-ui st-portal-preview min-h-screen flex items-center justify-center bg-[var(--ds-surface)]">
          <div className="text-center">
            <p className="text-sm text-[var(--ds-status-danger-fg)] mb-4">{error || "Data tidak ditemukan"}</p>
            <Link href="/portal" className="text-[var(--ds-accent-fg)] underline text-sm">
              &larr; Kembali ke Portal
            </Link>
          </div>
        </div>
      </RouteGuard>
    );
  }

  return (
    <RouteGuard>
      <div data-module="surat-tugas" className="st-ui st-portal-preview min-h-screen st-page-enter bg-[var(--ds-canvas)] py-8 px-4 print:p-0 print:bg-white">
        {/* Top actions bar */}
        <div className="max-w-4xl mx-auto mb-4 flex flex-wrap items-center justify-between gap-3 print:hidden">
          <Link href="/portal" className="inline-flex items-center gap-2 text-sm text-[var(--ds-fg-muted)] hover:text-[var(--ds-status-success-fg)] transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Kembali ke Portal
          </Link>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-[var(--ds-border-subtle)] hover:bg-[var(--ds-surface-muted)] text-[var(--ds-fg-muted)] transition-colors shadow-sm"
            >
              <Printer className="w-3.5 h-3.5" />
              Cetak
            </button>
            <button
              type="button"
              onClick={handleDownload}
              disabled={downloading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-[var(--ds-accent-solid)] hover:bg-[var(--ds-accent-hover)] text-[var(--ds-accent-on-solid)] transition-colors shadow-sm disabled:opacity-50"
            >
              {downloading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5" />
              )}
              Unduh Surat
            </button>
          </div>
        </div>

        {/* Letter preview */}
        <div className="max-w-4xl mx-auto bg-[var(--ds-surface)] rounded-xl shadow-sm border border-[var(--ds-border-subtle)] overflow-hidden print:border-none print:shadow-none">
          {/* Header */}
          <div className="border-b border-[var(--ds-border-subtle)] p-4 sm:p-8 text-center">
            <h1 className="text-lg font-bold text-[var(--ds-fg)] uppercase tracking-wide">
              Surat Tugas
            </h1>
            {data.nomor_surat && (
              <p className="text-sm text-[var(--ds-fg-muted)] mt-1">
                Nomor: {data.nomor_surat}
              </p>
            )}
          </div>

          {/* Body */}
          <div className="p-4 sm:p-8 space-y-6">
            {/* Menimbang */}
            {parseItems(data.menimbang).length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-[var(--ds-fg-muted)] uppercase tracking-wider mb-1">Menimbang</h3>
                <ul className="text-sm text-[var(--ds-fg-muted)] space-y-1 list-disc list-inside">
                  {parseItems(data.menimbang).map((text, idx) => (
                    <li key={idx} className="leading-relaxed">{text}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Dasar */}
            {parseItems(data.dasar).length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-[var(--ds-fg-muted)] uppercase tracking-wider mb-1">Dasar</h3>
                <ul className="text-sm text-[var(--ds-fg-muted)] space-y-1 list-disc list-inside">
                  {parseItems(data.dasar).map((text, idx) => (
                    <li key={idx} className="leading-relaxed">{text}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Maksud & Tujuan */}
            <div>
              <h3 className="text-xs font-semibold text-[var(--ds-fg-muted)] uppercase tracking-wider mb-1">Maksud & Tujuan</h3>
              <p className="text-sm text-[var(--ds-fg-muted)]">{data.maksud_tujuan}</p>
            </div>

            {/* Info Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-[var(--ds-surface)] rounded-lg">
              {data.tempat_tujuan && (
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-[var(--ds-status-success-fg)] mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-[var(--ds-fg-muted)]">Tempat Tujuan</p>
                    <p className="text-sm font-medium text-[var(--ds-fg-muted)]">{data.tempat_tujuan}</p>
                  </div>
                </div>
              )}
              <div className="flex items-start gap-2">
                <Calendar className="w-4 h-4 text-[var(--ds-status-success-fg)] mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-[var(--ds-fg-muted)]">Tanggal</p>
                  <p className="text-sm font-medium text-[var(--ds-fg-muted)]">
                    {formatDateRangeIndonesian(data.tanggal_mulai, data.tanggal_selesai)}
                  </p>
                </div>
              </div>
              {data.transportasi && (
                <div className="flex items-start gap-2">
                  <FileText className="w-4 h-4 text-[var(--ds-status-success-fg)] mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-[var(--ds-fg-muted)]">Transportasi</p>
                    <p className="text-sm font-medium text-[var(--ds-fg-muted)]">{data.transportasi}</p>
                  </div>
                </div>
              )}
              {data.anggaran_dari && (
                <div className="flex items-start gap-2">
                  <FileText className="w-4 h-4 text-[var(--ds-status-success-fg)] mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-[var(--ds-fg-muted)]">Anggaran</p>
                    <p className="text-sm font-medium text-[var(--ds-fg-muted)]">{data.anggaran_dari}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Personil */}
            {data.employees && data.employees.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-[var(--ds-fg-muted)] uppercase tracking-wider mb-2 flex items-center gap-1">
                  <Users className="w-3.5 h-3.5" />
                  Personil yang Ditugaskan
                </h3>
                <div className="border border-[var(--ds-border-subtle)] rounded-lg overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-[var(--ds-surface)]">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-[var(--ds-fg-muted)]">No</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-[var(--ds-fg-muted)]">Nama</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-[var(--ds-fg-muted)]">NIP</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-[var(--ds-fg-muted)]">Jabatan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--ds-border-subtle)]">
                      {data.employees.map((emp, idx) => (
                        <tr key={emp.id} className="hover:bg-[var(--ds-surface-muted)]">
                          <td className="px-4 py-2 text-[var(--ds-fg-muted)]">{idx + 1}</td>
                          <td className="px-4 py-2 font-medium text-[var(--ds-fg-muted)]">{emp.nama_lengkap}</td>
                          <td className="px-4 py-2 text-[var(--ds-fg-muted)]">{formatNIP(emp.nip)}</td>
                          <td className="px-4 py-2 text-[var(--ds-fg-muted)]">{emp.jabatan || "-"}</td>
                        </tr>
                      ))}
                      {Boolean(data.jumlah_buruh && data.jumlah_buruh > 0) &&
                        Array.from({ length: Math.min(Math.max(0, Number(data.jumlah_buruh) || 0), 100) }).map((_, bIdx) => (
                          <tr key={`pm-${bIdx}`} className="hover:bg-[var(--ds-surface-muted)]">
                            <td className="px-4 py-2 text-[var(--ds-fg-muted)]">
                              {(data.employees?.length || 0) + bIdx + 1}
                            </td>
                            <td className="px-4 py-2 font-bold text-[var(--ds-fg-muted)]">PM</td>
                            <td className="px-4 py-2 text-[var(--ds-fg-muted)]">-</td>
                            <td className="px-4 py-2 text-[var(--ds-fg-muted)]">-</td>
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
                <h3 className="text-xs font-semibold text-[var(--ds-fg-muted)] uppercase tracking-wider mb-1">Keterangan</h3>
                <p className="text-sm text-[var(--ds-fg-muted)] whitespace-pre-line">{data.keterangan}</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-[var(--ds-border-subtle)] p-6 text-center text-xs text-[var(--ds-fg-muted)]">
            Dokumen ini dihasilkan oleh sistem BKSDA SuperApp
          </div>
        </div>
      </div>
    </RouteGuard>
  );
}

export default function SuratTugasPreviewPage() {
  const { user } = useAuth();
  return <SuratTugasPreviewContent key={user?.id ?? "guest"} />;
}
