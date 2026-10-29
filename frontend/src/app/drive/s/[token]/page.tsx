"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { useParams } from "next/navigation";
import {
  Download,
  Lock,
  FileText,
  FileImage,
  FileVideo,
  FileSpreadsheet,
  FileArchive,
  File,
  ShieldCheck,
  AlertCircle,
  Loader2,
  Calendar,
  HardDrive,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import axios from "axios";

function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}

function getFileIcon(mime: string) {
  const m = (mime || "").toLowerCase();
  if (m.includes("image")) return <FileImage className="w-12 h-12 text-emerald-500" />;
  if (m.includes("video")) return <FileVideo className="w-12 h-12 text-purple-500" />;
  if (m.includes("pdf")) return <FileText className="w-12 h-12 text-rose-500" />;
  if (m.includes("sheet") || m.includes("excel") || m.includes("csv"))
    return <FileSpreadsheet className="w-12 h-12 text-green-600" />;
  if (m.includes("zip") || m.includes("tar") || m.includes("rar"))
    return <FileArchive className="w-12 h-12 text-amber-500" />;
  return <File className="w-12 h-12 text-slate-400" />;
}

interface PublicFileInfo {
  token: string;
  file_name: string;
  size_bytes: number;
  mime_type: string;
  requires_password: boolean;
  expires_at: string | null;
  created_at: string;
}

export default function PublicSharePage() {
  const params = useParams();
  const token = params?.token as string;

  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [fileInfo, setFileInfo] = useState<PublicFileInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "https://bksdakaltim.web.id/api";

  useEffect(() => {
    if (!token) return;

    axios
      .get(`${apiUrl}/drive/s/${token}`)
      .then((res) => {
        setFileInfo(res.data);
      })
      .catch((err) => {
        const msg =
          err?.response?.data?.message ||
          "Tautan berkas ini tidak ditemukan, telah dicabut, atau sudah kedaluwarsa.";
        setError(msg);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [token, apiUrl]);

  const handleDownload = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (fileInfo?.requires_password && !password.trim()) {
      setPasswordError("Harap masukkan kata sandi dokumen.");
      return;
    }

    setDownloading(true);
    setPasswordError(null);

    try {
      const res = await axios.post(`${apiUrl}/drive/s/${token}/download`, {
        password: password.trim() || undefined,
      });

      if (res.data?.url) {
        toast.success("Mengunduh berkas...");
        window.location.href = res.data.url;
      }
    } catch (err: any) {
      if (err?.response?.status === 401) {
        setPasswordError(err?.response?.data?.message || "Kata sandi yang Anda masukkan salah.");
      } else if (err?.response?.status === 429) {
        toast.error("Terlalu banyak percobaan. Harap tunggu beberapa saat.");
      } else {
        toast.error(err?.response?.data?.message || "Gagal mengunduh berkas.");
      }
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="min-h-screen bg-linear-to-b from-slate-50 via-slate-100 to-emerald-50 dark:from-slate-950 dark:via-slate-900 dark:to-emerald-950 flex flex-col items-center justify-between p-4 sm:p-6 md:p-10 text-slate-900 dark:text-slate-100">
      {/* Header */}
      <header className="w-full max-w-xl flex items-center justify-between pb-6 border-b border-slate-200/80 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <Image
            src="/logo_bksda.png"
            alt="Logo BKSDA"
            width={36}
            height={36}
            className="object-contain"
            priority
          />
          <div>
            <h1 className="text-sm font-extrabold text-emerald-800 dark:text-emerald-400 leading-tight">
              BKSDA KALIMANTAN TIMUR
            </h1>
            <p className="text-[11px] text-slate-400 font-medium">Layanan Berbagi Dokumen Resmi</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100/80 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 text-xs font-bold border border-emerald-500/20">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Tautan Aman</span>
        </div>
      </header>

      {/* Main Card */}
      <main className="w-full max-w-md my-auto py-8">
        {loading ? (
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-10 text-center shadow-lg space-y-4">
            <Loader2 className="w-10 h-10 text-emerald-600 animate-spin mx-auto" />
            <p className="text-xs font-semibold text-slate-400">Menghubungkan ke BKSDA Cloud Drive...</p>
          </div>
        ) : error ? (
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-rose-200 dark:border-rose-900/50 p-8 text-center shadow-lg space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto">
              <AlertCircle className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Tautan Tidak Dapat Dibuka
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs mx-auto">
                {error}
              </p>
            </div>
          </div>
        ) : fileInfo ? (
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-8 shadow-xl space-y-6">
            {/* File Icon & Info */}
            <div className="text-center space-y-3">
              <div className="w-20 h-20 rounded-3xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto shadow-inner">
                {getFileIcon(fileInfo.mime_type)}
              </div>
              <div className="space-y-1">
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 break-words line-clamp-2 px-2">
                  {fileInfo.file_name}
                </h2>
                <div className="flex items-center justify-center gap-2 text-xs text-slate-400 font-medium">
                  <span>{formatBytes(fileInfo.size_bytes)}</span>
                  <span>•</span>
                  <span>{fileInfo.mime_type.split("/")[1]?.toUpperCase() || "FILE"}</span>
                </div>
              </div>
            </div>

            {/* Expiry Badge */}
            {fileInfo.expires_at && (
              <div className="flex items-center justify-center gap-1.5 text-[11px] font-semibold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-xl py-2 px-3">
                <Calendar className="w-3.5 h-3.5 shrink-0" />
                <span>
                  Berlaku hingga:{" "}
                  {new Date(fileInfo.expires_at).toLocaleDateString("id-ID", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            )}

            {/* Password Form or Direct Download */}
            {fileInfo.requires_password ? (
              <form onSubmit={handleDownload} className="space-y-4">
                <div className="space-y-1.5 text-left">
                  <Label htmlFor="share-password" className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Kata Sandi Dokumen</span>
                  </Label>
                  <Input
                    id="share-password"
                    type="password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setPasswordError(null);
                    }}
                    placeholder="Masukkan kata sandi..."
                    className="rounded-xl text-xs h-10"
                    autoFocus
                  />
                  {passwordError && (
                    <p className="text-[11px] text-rose-500 font-semibold">{passwordError}</p>
                  )}
                </div>

                <Button
                  type="submit"
                  disabled={downloading}
                  className="w-full h-11 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-all gap-2"
                >
                  {downloading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Memverifikasi sandi...</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      <span>Buka & Unduh Berkas</span>
                    </>
                  )}
                </Button>
              </form>
            ) : (
              <Button
                type="button"
                onClick={() => handleDownload()}
                disabled={downloading}
                className="w-full h-11 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-all gap-2"
              >
                {downloading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Menyiapkan unduhan...</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    <span>Unduh Berkas Sekarang</span>
                  </>
                )}
              </Button>
            )}
          </div>
        ) : null}
      </main>

      {/* Footer */}
      <footer className="w-full max-w-xl text-center pt-6 border-t border-slate-200/80 dark:border-slate-800 text-[11px] text-slate-400">
        <p>
          Balai Konservasi Sumber Daya Alam Kalimantan Timur • Sistem Manajemen Dokumen Awan Terpadu
        </p>
      </footer>
    </div>
  );
}
