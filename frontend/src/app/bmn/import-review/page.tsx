"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Upload,
  Loader2,
  FileSpreadsheet,
  CheckCircle2,
  XCircle,
  Clock,
  Eye,
  ShieldAlert,
} from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useRole } from "@/hooks/useRole";

interface ImportBatch {
  id: string;
  filename: string;
  total_rows: number;
  new_rows: number;
  updated_rows: number;
  unchanged_rows: number;
  status: "pending" | "approved" | "rejected" | "expired";
  created_at: string;
  uploader?: { id: number; name: string };
}

export default function ImportReviewPage() {
  const queryClient = useQueryClient();
  const { hasPermission } = useRole();
  const canUpload = hasPermission("bmn.import.review");
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["bmn-import-batches"],
    queryFn: async () => {
      const res = await api.get("/bmn/import-review");
      return res.data;
    },
  });

  const batches: ImportBatch[] = data?.data || [];

  const handleUpload = async () => {
    if (!canUpload) {
      toast.error("Upload import hanya tersedia untuk admin.");
      return;
    }
    if (!file) return;
    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await api.post("/bmn/import-review/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: 120000,
      });
      toast.success(res.data.message);
      setFile(null);
      queryClient.invalidateQueries({ queryKey: ["bmn-import-batches"] });
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      toast.error(error.response?.data?.error || "Gagal upload file.");
    } finally {
      setIsUploading(false);
    }
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge data-status="warning"><Clock className="w-3 h-3 mr-1" />Menunggu Review</Badge>;
      case "approved":
        return <Badge data-status="success"><CheckCircle2 className="w-3 h-3 mr-1" />Disetujui</Badge>;
      case "rejected":
        return <Badge data-status="danger"><XCircle className="w-3 h-3 mr-1" />Ditolak</Badge>;
      default:
        return <Badge data-status="neutral">{status === "expired" ? "Kedaluwarsa" : status}</Badge>;
    }
  };

  return (
    <div data-module="bmn" className="bmn-assets-ui bmn-standard-ui bmn-assets-enter p-4 md:p-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[var(--ds-fg)]">Import Review</h1>
        <p className="text-sm text-[var(--ds-fg-muted)] mt-1">
          Upload Excel → Review perubahan → Approve untuk menerapkan ke database.
        </p>
      </div>

      {canUpload ? (
      <div className="bg-[var(--ds-surface)] border border-[var(--ds-border-subtle)] rounded-2xl p-6">
        <h2 className="text-base font-semibold text-[var(--ds-fg)] mb-4 flex items-center gap-2">
          <Upload className="w-4 h-4 text-[var(--ds-accent-fg)]" />
          Upload File Baru
        </h2>
        <div className="flex flex-col sm:flex-row sm:items-end gap-4">
          <div className="min-w-0 w-full flex-1">
            <Input
              aria-label="File Excel SIMAN"
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="border-[var(--ds-border-subtle)] file:text-[var(--ds-accent-fg)] file:font-semibold"
            />
            <p className="text-xs text-[var(--ds-fg-muted)] mt-1">
              Format: .xlsx / .xls / .csv — Maks 20MB. Kolom wajib: kode_barang, nup, nama_barang.
            </p>
          </div>
          <Button
            onClick={handleUpload}
            disabled={!file || isUploading}
            className="bg-[var(--ds-accent-solid)] hover:bg-[var(--ds-accent-hover)] text-[var(--ds-accent-on-solid)] font-semibold px-6"
          >
            {isUploading ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Memproses...</>
            ) : (
              <><Upload className="w-4 h-4 mr-2" />Upload & Analisis</>
            )}
          </Button>
        </div>
      </div>
      ) : (
        <div className="rounded-2xl border border-[var(--ds-status-warning-border)] bg-[var(--ds-status-warning-bg)] p-5 text-[var(--ds-status-warning-fg)]">
          <div className="flex items-start gap-3">
            <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <h2 className="text-sm font-bold">Upload import hanya untuk admin</h2>
              <p className="mt-1 text-xs leading-relaxed">
                Kamu tetap bisa melihat riwayat import dan hasil review, tetapi perubahan data BMN hanya bisa diunggah dan disetujui oleh admin.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Batch History */}
      <div className="bg-[var(--ds-surface)] border border-[var(--ds-border-subtle)] rounded-2xl p-6">
        <h2 className="text-base font-semibold text-[var(--ds-fg)] mb-4 flex items-center gap-2">
          <FileSpreadsheet className="w-4 h-4 text-[var(--ds-accent-fg)]" />
          Riwayat Import
        </h2>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-[var(--ds-accent-fg)]" />
          </div>
        ) : isError ? (
          <div role="alert" className="py-8 text-center text-[var(--ds-status-danger-fg)]">
            <p>Riwayat impor gagal dimuat.</p>
            <Button variant="outline" className="mt-3" onClick={() => refetch()}>Coba lagi</Button>
          </div>
        ) : batches.length === 0 ? (
          <div className="text-center py-12 text-[var(--ds-fg-muted)]">
            <FileSpreadsheet className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>Belum ada riwayat import.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {batches.map((batch) => (
              <div
                key={batch.id}
                className={cn(
                  "flex flex-col lg:flex-row lg:items-center justify-between gap-3 p-4 rounded-xl border",
                  batch.status === "pending"
                    ? "border-[var(--ds-status-warning-border)] bg-[var(--ds-status-warning-bg)]"
                    : "border-[var(--ds-border-subtle)] bg-[var(--ds-surface-muted)]"
                )}
              >
                <div className="flex min-w-0 items-center gap-4">
                  <div className="w-10 h-10 shrink-0 rounded-lg bg-[var(--ds-accent-soft)] flex items-center justify-center">
                    <FileSpreadsheet className="w-5 h-5 text-[var(--ds-accent-fg)]" />
                  </div>
                  <div className="min-w-0">
                    <p className="break-words font-semibold text-sm text-[var(--ds-fg)]">{batch.filename}</p>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-[var(--ds-fg-muted)]">
                      <span>{batch.total_rows} baris</span>
                      <span className="text-[var(--ds-accent-fg)] font-medium">+{batch.new_rows} baru</span>
                      <span className="text-[var(--ds-status-info-fg)] font-medium">~{batch.updated_rows} update</span>
                      <span className="text-[var(--ds-fg-muted)]">{batch.unchanged_rows} sama</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 shrink-0">
                  {statusBadge(batch.status)}
                  <span className="text-xs text-[var(--ds-fg-muted)]">
                    {new Date(batch.created_at).toLocaleDateString("id-ID", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  {batch.status === "pending" && (
                    <Button asChild size="sm" className="bg-[var(--ds-accent-solid)] hover:bg-[var(--ds-accent-hover)] text-[var(--ds-accent-on-solid)]">
                      <Link href={`/bmn/import-review/${batch.id}`}>
                        <Eye className="w-3.5 h-3.5 mr-1" /> {canUpload ? "Review" : "Lihat"}
                      </Link>
                    </Button>
                  )}
                  {batch.status === "approved" && (
                    <Button asChild size="sm" variant="outline" className="text-[var(--ds-fg-secondary)]">
                      <Link href={`/bmn/import-review/${batch.id}`}>
                        <Eye className="w-3.5 h-3.5 mr-1" /> Lihat
                      </Link>
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
