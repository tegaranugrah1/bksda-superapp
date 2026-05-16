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
} from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

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
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["bmn-import-batches"],
    queryFn: async () => {
      const res = await api.get("/bmn/import-review");
      return res.data;
    },
  });

  const batches: ImportBatch[] = data?.data || [];

  const handleUpload = async () => {
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
        return <Badge className="bg-amber-100 text-amber-700 border-amber-200"><Clock className="w-3 h-3 mr-1" />Menunggu Review</Badge>;
      case "approved":
        return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200"><CheckCircle2 className="w-3 h-3 mr-1" />Disetujui</Badge>;
      case "rejected":
        return <Badge className="bg-red-100 text-red-700 border-red-200"><XCircle className="w-3 h-3 mr-1" />Ditolak</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Import Review</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
          Upload Excel → Review perubahan → Approve untuk menerapkan ke database.
        </p>
      </div>

      {/* Upload Section */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6">
        <h2 className="text-base font-semibold text-zinc-800 dark:text-zinc-200 mb-4 flex items-center gap-2">
          <Upload className="w-4 h-4 text-emerald-600" />
          Upload File Baru
        </h2>
        <div className="flex items-end gap-4">
          <div className="flex-1">
            <Input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="border-zinc-200 dark:border-zinc-700 file:text-emerald-600 file:font-semibold"
            />
            <p className="text-xs text-zinc-400 mt-1">
              Format: .xlsx / .xls / .csv — Maks 20MB. Kolom wajib: kode_barang, nup, nama_barang.
            </p>
          </div>
          <Button
            onClick={handleUpload}
            disabled={!file || isUploading}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-6"
          >
            {isUploading ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Memproses...</>
            ) : (
              <><Upload className="w-4 h-4 mr-2" />Upload & Analisis</>
            )}
          </Button>
        </div>
      </div>

      {/* Batch History */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6">
        <h2 className="text-base font-semibold text-zinc-800 dark:text-zinc-200 mb-4 flex items-center gap-2">
          <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
          Riwayat Import
        </h2>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
          </div>
        ) : batches.length === 0 ? (
          <div className="text-center py-12 text-zinc-400">
            <FileSpreadsheet className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>Belum ada riwayat import.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {batches.map((batch) => (
              <div
                key={batch.id}
                className={cn(
                  "flex items-center justify-between p-4 rounded-xl border transition-all",
                  batch.status === "pending"
                    ? "border-amber-200 dark:border-amber-500/20 bg-amber-50/50 dark:bg-amber-500/5"
                    : "border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/30"
                )}
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-500/10 flex items-center justify-center">
                    <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-zinc-800 dark:text-zinc-200">{batch.filename}</p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                      <span>{batch.total_rows} baris</span>
                      <span className="text-emerald-600 font-medium">+{batch.new_rows} baru</span>
                      <span className="text-blue-600 font-medium">~{batch.updated_rows} update</span>
                      <span className="text-zinc-400">{batch.unchanged_rows} sama</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {statusBadge(batch.status)}
                  <span className="text-xs text-zinc-400">
                    {new Date(batch.created_at).toLocaleDateString("id-ID", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  {batch.status === "pending" && (
                    <Link href={`/bmn/import-review/${batch.id}`}>
                      <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white">
                        <Eye className="w-3.5 h-3.5 mr-1" /> Review
                      </Button>
                    </Link>
                  )}
                  {batch.status === "approved" && (
                    <Link href={`/bmn/import-review/${batch.id}`}>
                      <Button size="sm" variant="outline" className="text-zinc-600 dark:text-zinc-300">
                        <Eye className="w-3.5 h-3.5 mr-1" /> Lihat
                      </Button>
                    </Link>
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
