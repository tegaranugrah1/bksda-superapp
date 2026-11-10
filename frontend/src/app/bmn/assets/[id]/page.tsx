"use client";

import React, { use, useState, useEffect, useRef, useId } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter, redirect } from "next/navigation";
import { api } from "@/lib/api";
import Link from "next/link";
import {
  ArrowLeft,
  Loader2,
  Package,
  FileText,
  Banknote,
  MapPin,
  Building2,
  Car,
  Landmark,
  UserCheck,
  History,
  Tag as TagIcon,
  Maximize2,
  Warehouse,
  Pencil,
  Check,
  X,
  ChevronRight,
  Camera,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DetailSection,
  DetailRow,
  FormInputRow,
  FormSelectRow,
  FormCurrencyRow,
  FormEmployeeRow,
  AreaRow,
} from "./_components/DetailSection";
import { PhotoGallery, PhotoGalleryRef, driveToThumbnail } from "./_components/PhotoGallery";
import { useRole } from "@/hooks/useRole";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { toast } from "sonner";
import { TagBadge } from "@/app/bmn/_components/TagBadge";
import { TagAssignmentDialog } from "@/app/bmn/_components/TagAssignmentDialog";
import { type IBmnTag } from "@/app/bmn/_lib/tag-utils";
import { ALL_LOKASI_RUANG_OPTIONS } from "@/app/bmn/_lib/location-options";
import { cn } from "@/lib/utils";

import "../assets.css";
import "./detail.css";

const LOKASI_RUANG_OPTIONS = ALL_LOKASI_RUANG_OPTIONS;
const KONDISI_OPTIONS = ["Baik", "Rusak Ringan", "Rusak Berat"];

export default function BmnAssetDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  if (id === "create") {
    redirect("/bmn/assets/create");
  }

  return <AssetDetail assetId={id} />;
}

function AssetDetail({ assetId }: { assetId: string }) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { hasPermission } = useRole();
  const canWrite = hasPermission("bmn.asset.update");
  const tabsId = useId();
  const reduceMotion = useReducedMotion();
  const galleryRef = useRef<PhotoGalleryRef>(null);

  const { data: asset, isLoading, isError, refetch } = useQuery({
    queryKey: ["bmn-asset", assetId],
    queryFn: async () => {
      const res = await api.get(`/bmn/assets/${assetId}`);
      return res.data.data;
    },
    refetchOnWindowFocus: true,
  });

  const { data: employees = [] } = useQuery({
    queryKey: ["employees-select"],
    queryFn: async () => {
      const res = await api.get("/kepegawaian/employees/select");
      return res.data.data || [];
    },
    enabled: canWrite,
  });

  const [activeTab, setActiveTab] = useState("identitas");
  const [failedHeroUrl, setFailedHeroUrl] = useState<string | null>(null);
  const [isTagDialogOpen, setIsTagDialogOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState<Record<string, any>>({});

  // Synchronize local form draft with asset when asset loads or changes
  useEffect(() => {
    if (asset && !isEditMode) {
      setFormData(asset);
    }
  }, [asset, isEditMode]);

  const updateField = (field: string, value: any) => {
    setFormData((prev) => {
      const next = { ...prev, [field]: value };
      if (field === "pengguna") next.nama_pengguna = value;
      if (field === "nama_pengguna") next.pengguna = value;
      return next;
    });
  };

  const startEditMode = () => {
    if (asset) {
      setFormData({ ...asset });
    }
    setIsEditMode(true);
    toast.info("Mode Edit Aktif: Ubah data pada tab di bawah, lalu klik 'Simpan Perubahan'.");
  };

  const handleCancelEdit = () => {
    if (asset) {
      setFormData({ ...asset });
    }
    setIsEditMode(false);
    toast.info("Perubahan dibatalkan.");
  };

  const handleSaveAll = async () => {
    setIsSaving(true);
    try {
      const payload: Record<string, any> = {};
      const editableKeys = [
        "status_bmn",
        "merk",
        "tipe",
        "nama",
        "kondisi",
        "no_polisi",
        "no_bpkp",
        "no_stnk",
        "no_mesin",
        "no_rangka",
        "tanggal_pajak_stnk",
        "tanggal_ganti_plat",
        "status_sertifikasi",
        "jenis_sertipikat",
        "no_sertifikat",
        "nilai_perolehan_pertama",
        "nilai_mutasi",
        "nilai_perolehan",
        "nilai_penyusutan",
        "nilai_buku",
        "status_sbsn",
        "status_bmn_idle",
        "status_kemitraan",
        "bpybds",
        "usulan_barang_hilang",
        "usulan_barang_rb",
        "usul_hapus",
        "hibah_dktp",
        "konsensi_jasa",
        "properti_investasi",
        "jenis_dokumen",
        "no_dokumen",
        "status_penggunaan",
        "no_psp",
        "tanggal_psp",
        "status_pmk",
        "alamat",
        "rt_rw",
        "kelurahan_desa",
        "kecamatan",
        "kab_kota",
        "provinsi",
        "kode_pos",
        "lokasi_ruang",
        "sbsk",
        "optimalisasi",
        "penghuni",
        "pengguna",
        "nama_pengguna",
        "employee_id",
      ];

      editableKeys.forEach((key) => {
        if (formData[key] !== undefined) {
          const val = formData[key] === "" ? null : formData[key];
          const oldVal = (asset as any)?.[key] === "" ? null : (asset as any)?.[key];

          const valNorm = val === null || val === undefined ? "" : String(val).trim();
          const oldNorm = oldVal === null || oldVal === undefined ? "" : String(oldVal).trim();

          const isNumeric = valNorm !== "" && oldNorm !== "" && !isNaN(Number(valNorm)) && !isNaN(Number(oldNorm));
          const isDifferent = isNumeric ? Number(valNorm) !== Number(oldNorm) : valNorm !== oldNorm;

          if (isDifferent) {
            payload[key] = val;
          }
        }
      });

      if (payload.pengguna && payload.pengguna !== asset.pengguna) {
        payload.nama_pengguna = payload.pengguna;
      }
      if (payload.nama_pengguna && payload.nama_pengguna !== asset.nama_pengguna) {
        payload.pengguna = payload.nama_pengguna;
      }

      if ("pengguna" in payload || "nama_pengguna" in payload) {
        const empName = payload.pengguna || payload.nama_pengguna;
        if (!empName) {
          payload.employee_id = null;
        } else {
          const matched = employees.find(
            (e: any) =>
              (e.nama_lengkap && e.nama_lengkap.toLowerCase() === empName.toLowerCase()) ||
              (e.name && e.name.toLowerCase() === empName.toLowerCase())
          );
          if (matched) {
            payload.employee_id = matched.id;
          }
        }
      }

      if (Object.keys(payload).length === 0) {
        toast.info("Tidak ada perubahan data yang disimpan.");
        setIsEditMode(false);
        return;
      }

      await api.put(`/bmn/assets/${assetId}`, payload);
      toast.success("Perubahan data aset berhasil disimpan.");
      setIsEditMode(false);
      await refetch();
      await queryClient.invalidateQueries({ queryKey: ["bmn-asset", assetId] });
      await queryClient.invalidateQueries({ queryKey: ["bmn-assets"] });
    } catch {
      toast.error("Gagal menyimpan perubahan aset.");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div data-module="bmn" className="bmn-assets-ui bmn-detail-ui p-8 flex flex-col items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--ds-accent-fg)] mb-3" />
        <p className="text-sm text-[var(--ds-fg-muted)]">Memuat data aset...</p>
      </div>
    );
  }

  if (isError || !asset) {
    return (
      <div data-module="bmn" className="bmn-assets-ui bmn-detail-ui p-8 text-center max-w-md mx-auto mt-12">
        <Package className="w-12 h-12 mx-auto mb-3 text-[var(--ds-fg-muted)]" />
        <h3 className="text-base font-bold text-[var(--ds-fg)] mb-1">Aset tidak ditemukan</h3>
        <p className="text-xs text-[var(--ds-fg-muted)] mb-4">Aset mungkin telah dipindahkan atau dihapus dari sistem.</p>
        <Button asChild variant="outline" size="sm" className="rounded-lg gap-2"><Link href="/bmn/assets"><ArrowLeft className="w-4 h-4" /> Kembali ke Katalog</Link></Button>
      </div>
    );
  }

  const currentData = isEditMode ? formData : asset;

  const formatCurrency = (v: number | string | null | undefined) => {
    const num = Number(v) || 0;
    return num
      ? new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(num)
      : "-";
  };

  // Subtitle rule:
  // "diganti jadi merk atau tipe, tetapi jika merk dan tipe sama, maka hanya merk saja"
  const getMerkTipeSubtitle = () => {
    const merk = currentData.merk?.trim();
    const tipe = currentData.tipe?.trim();

    if (!merk && !tipe) return "Tidak ada keterangan merk/tipe";
    if (!tipe) return merk;
    if (!merk) return tipe;
    if (merk.toLowerCase() === tipe.toLowerCase()) return merk;
    return `${merk} / ${tipe}`;
  };

  // Hero Photo Fallback Hierarchy:
  // 1. Geotag -> 2. Depan -> 3. Belakang -> 4. Kiri -> 5. Kanan
  const resolvedGeotagUrl = asset.foto_geotag_path || asset.foto_geotag_url;
  const heroPhotoCandidate = resolvedGeotagUrl
    ? { url: resolvedGeotagUrl, label: "Foto Utama Geotag", key: "geotag", isGeotag: true }
    : asset.foto_depan_url
    ? { url: asset.foto_depan_url, label: "Foto Tampak Depan", key: "depan", isGeotag: false }
    : asset.foto_belakang_url
    ? { url: asset.foto_belakang_url, label: "Foto Tampak Belakang", key: "belakang", isGeotag: false }
    : asset.foto_kiri_url
    ? { url: asset.foto_kiri_url, label: "Foto Tampak Kiri", key: "kiri", isGeotag: false }
    : asset.foto_kanan_url
    ? { url: asset.foto_kanan_url, label: "Foto Tampak Kanan", key: "kanan", isGeotag: false }
    : null;

  const heroDisplayUrl =
    heroPhotoCandidate?.url && !asset.foto_geotag_path && heroPhotoCandidate.isGeotag
      ? driveToThumbnail(heroPhotoCandidate.url)?.replace("sz=w400", "sz=w1200") || heroPhotoCandidate.url
      : heroPhotoCandidate?.url;

  const tabs = [
    { key: "identitas", label: "Identitas", icon: <FileText className="w-4 h-4" /> },
    { key: "finansial", label: "Finansial & Akuntansi", icon: <Banknote className="w-4 h-4" /> },
    { key: "dokumen", label: "Dokumen Legalitas", icon: <Landmark className="w-4 h-4" /> },
    { key: "lokasi", label: "Lokasi & Penanggung Jawab", icon: <MapPin className="w-4 h-4" /> },
    { key: "organisasi", label: "Organisasi", icon: <UserCheck className="w-4 h-4" /> },
    {
      key: "riwayat",
      label: "Riwayat Perubahan Data",
      icon: <History className="w-4 h-4" />,
      count: asset.history_updates?.length || 0,
    },
  ];

  const calculateAge = () => {
    const currentYear = new Date().getFullYear();
    const tahun = currentData.tahun_perolehan
      ? Number(currentData.tahun_perolehan)
      : currentData.tanggal_perolehan
      ? new Date(currentData.tanggal_perolehan).getFullYear()
      : null;

    if (tahun && !isNaN(tahun)) {
      const age = currentYear - tahun;
      return age >= 0 ? `${age} Tahun` : "-";
    }

    if (currentData.umur_aset) return `${currentData.umur_aset} Tahun`;
    return "-";
  };

  const allLokasiRuangOptions = Array.from(
    new Set([
      ...(currentData.lokasi_ruang ? [currentData.lokasi_ruang] : []),
      ...LOKASI_RUANG_OPTIONS,
    ])
  );

  return (
    <div data-module="bmn" className="bmn-assets-ui bmn-detail-ui min-h-screen bg-[var(--ds-canvas)]">
      {/* ==================== TOP OPERATIONAL COCKPIT BAR ==================== */}
      <header className="sticky top-0 z-30 bg-[var(--ds-surface)] backdrop-blur-md px-6 lg:px-10 py-3.5 flex items-center justify-between border-b border-[var(--ds-border-subtle)] shadow-xs">
        {/* Navigation & Breadcrumbs */}
        <div className="flex items-center gap-2 sm:gap-3 text-xs flex-wrap min-w-0">
          <button
            aria-label="Kembali ke Data Aset"
            onClick={() => router.back()}
            className="inline-flex items-center gap-1.5 font-semibold text-[var(--ds-fg-muted)] hover:text-[var(--ds-accent-fg)] transition-colors shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Kembali</span>
          </button>
          <span className="text-[var(--ds-fg-muted)] hidden sm:inline">/</span>
          <span className="uppercase tracking-wider font-semibold text-[var(--ds-fg-muted)] truncate max-w-[120px] sm:max-w-xs hidden sm:inline">
            {asset.jenis_bmn || "Aset BMN"}
          </span>
          <span className="text-[var(--ds-fg-muted)] hidden sm:inline">/</span>
          <span className="font-mono font-semibold text-[var(--ds-fg-muted)] hidden sm:inline">
            {asset.kode_barang}
          </span>
          <span className="text-[var(--ds-fg-muted)] hidden sm:inline">/</span>
          <span className="font-mono font-bold text-[var(--ds-accent-fg)] bg-[var(--ds-accent-soft)] px-2 py-0.5 rounded-md text-xs">
            NUP {asset.nup}
          </span>
        </div>

        {/* Right Header Actions */}
        <div className="flex items-center gap-2">
          {canWrite && !isEditMode && (
            <button
              onClick={startEditMode}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors duration-150 shadow-xs bmn-button bmn-primary"
            >
              <Pencil className="w-3.5 h-3.5" />
              <span>Edit Aset</span>
            </button>
          )}

          {canWrite && isEditMode && (
            <>
              <button
                onClick={handleCancelEdit}
                disabled={isSaving}
                className="bmn-button bmn-secondary inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors duration-150 border border-[var(--ds-border-subtle)] text-[var(--ds-fg-muted)] hover:bg-[var(--ds-surface-muted)] disabled:opacity-50"
              >
                <X className="w-3.5 h-3.5" />
                <span>Batal</span>
              </button>
              <button
                onClick={handleSaveAll}
                disabled={isSaving}
                className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors duration-150 shadow-xs bmn-button bmn-primary disabled:opacity-50"
              >
                {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                <span>Simpan Perubahan</span>
              </button>
            </>
          )}
        </div>
      </header>

      {/* ==================== MAIN WORKSPACE ==================== */}
      <main className={cn("p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full flex flex-col gap-6", isEditMode && "max-sm:pb-24")}>
        {/* ==================== SECTION 1: EXECUTIVE OPERATIONS COCKPIT (BENTO MATRIX) ==================== */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
          {/* TILE 1: Primary Geotag Visual Hero Box (Col 5) */}
          <div className="lg:col-span-5 bg-[var(--ds-surface)] border border-[var(--ds-border-subtle)] rounded-2xl p-4 flex flex-col justify-between shadow-xs">
            {heroDisplayUrl && failedHeroUrl !== heroDisplayUrl ? (
              <div className="relative rounded-xl overflow-hidden border border-[var(--ds-border-subtle)] bg-[var(--ds-surface-muted)] flex-1 min-h-[360px] flex flex-col justify-between">
                {/* Asset Hero Image */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={heroDisplayUrl}
                  onError={() => setFailedHeroUrl(heroDisplayUrl)}
                  alt={asset.nama_barang}
                  className="absolute inset-0 w-full h-full object-cover"
                  referrerPolicy={heroDisplayUrl.includes("drive.google.com") ? "no-referrer" : undefined}
                />


                {/* Interactive Corner Top Bar */}
                <div className="relative z-10 p-3 flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--ds-surface)] text-[var(--ds-fg)] text-xs font-semibold border border-[var(--ds-border-subtle)]">
                    <Camera className="w-3.5 h-3.5" />
                    {heroPhotoCandidate?.label || "Foto Utama"}
                  </span>

                  <button
                    onClick={() => heroPhotoCandidate && galleryRef.current?.openLightbox(heroPhotoCandidate.key)}
                    className="bmn-button bmn-secondary w-9 h-9 rounded-lg flex items-center justify-center transition-colors duration-150"
                    title="Perbesar Tampilan Foto"
                  >
                    <Maximize2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Interactive Corner Bottom Bar */}
                <div className="relative z-10 p-3.5 bg-[var(--ds-surface)] text-[var(--ds-fg)] flex flex-col gap-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-[var(--ds-accent-fg)]">
                    <MapPin className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{currentData.lokasi_ruang || "Lokasi belum ditentukan"}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-[var(--ds-fg-muted)] border-t border-[var(--ds-border-subtle)] pt-1.5">
                    <span>
                      {asset.verified_at
                        ? `Diverifikasi: ${new Date(asset.verified_at).toLocaleDateString("id-ID", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}`
                        : "Belum diverifikasi BMN"}
                    </span>
                    <span className="font-mono text-xs bg-[var(--ds-surface-muted)] px-1.5 py-0.5 rounded backdrop-blur-xs">
                      KD: {asset.kode_barang}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              /* Fallback Placeholder when NO photos uploaded */
              <div className="rounded-xl border-2 border-dashed border-[var(--ds-border-subtle)] bg-[var(--ds-surface-muted)] flex-1 min-h-[360px] flex flex-col items-center justify-center p-6 text-center">
                <div className="w-14 h-14 rounded-2xl bg-[var(--ds-accent-soft)] text-[var(--ds-accent-fg)] flex items-center justify-center mb-3">
                  <Camera className="w-7 h-7" />
                </div>
                <h4 className="text-sm font-bold text-[var(--ds-fg)]">{heroDisplayUrl ? "Foto tidak dapat dimuat" : "Belum ada Foto Fisik"}</h4>
                <p className="text-xs text-[var(--ds-fg-muted)] mt-1 max-w-xs leading-relaxed">
                  {heroDisplayUrl ? "Coba buka preview atau periksa foto pada dokumentasi di bawah." : "Foto fisik dan geotag belum diunggah untuk aset ini. Silakan unggah foto pada seksi dokumentasi di bawah."}
                </p>
              </div>
            )}

            {/* Quick Action Under-Image Strip */}
            <div className="flex items-center justify-between mt-3 px-1 text-xs text-[var(--ds-fg-muted)]">
              <span className="flex items-center gap-1 font-medium">
                <Camera className="w-3.5 h-3.5" />
                <span>NUP: {asset.nup}</span>
              </span>
              {heroDisplayUrl && (
                <button
                  type="button"
                  onClick={() => heroPhotoCandidate && galleryRef.current?.openLightbox(heroPhotoCandidate.key)}
                  className="text-[var(--ds-accent-fg)] hover:underline font-semibold flex items-center gap-1"
                >
                  Lihat Resolusi Penuh
                  <ChevronRight className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {/* TILE 2: Core Asset Identity & Metric Cluster (Col 7) */}
          <div className="lg:col-span-7 flex flex-col gap-5">
            {/* Sub-Tile 2A: Asset Title, Classification & Badges */}
            <div className="bg-[var(--ds-surface)] border border-[var(--ds-border-subtle)] rounded-2xl p-5 flex flex-col justify-between flex-1 shadow-xs">
              <div>
                {/* Top Row: Code Badge, Status Flags */}
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-[var(--ds-accent-soft)] text-[var(--ds-accent-fg)] border border-[var(--ds-accent-soft-border)] text-xs font-mono font-bold">
                      #{asset.kode_barang}
                    </span>
                    <span className="text-xs text-[var(--ds-fg-muted)]">
                      NUP: <span className="font-semibold text-[var(--ds-fg)]">{asset.nup}</span>
                    </span>
                    {asset.jenis_bmn && (
                      <>
                        <span className="text-[var(--ds-fg-muted)]">•</span>
                        <span className="text-xs uppercase tracking-wider font-semibold text-[var(--ds-fg-muted)] truncate max-w-xs">
                          {asset.jenis_bmn}
                        </span>
                      </>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {asset.active_loan && (
                      <span data-status="info" className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--ds-status-info-bg)] text-[var(--ds-status-info-fg)] border border-[var(--ds-status-info-border)] text-xs font-bold">
                        <span className="w-2 h-2 rounded-full bg-current" />
                        Dipinjam
                      </span>
                    )}
                    <span data-status={currentData.kondisi === "Baik" ? "success" : currentData.kondisi === "Rusak Ringan" ? "warning" : currentData.kondisi === "Rusak Berat" ? "danger" : "neutral"} className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold">
                      {currentData.kondisi || "Kondisi belum diisi"}
                    </span>
                    <span data-status={currentData.status_bmn === "Aktif" ? "success" : "neutral"} className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold">
                      {currentData.status_bmn || "Status belum diisi"}
                    </span>
                  </div>
                </div>

                {/* Asset Headline */}
                <div className="flex items-start gap-3.5 mb-3">
                  <div className="w-12 h-12 rounded-xl bg-[var(--ds-accent-soft)] border border-[var(--ds-accent-soft-border)] flex items-center justify-center text-[var(--ds-accent-fg)] shrink-0 mt-0.5">
                    {asset.jenis_bmn === "ALAT ANGKUTAN BERMOTOR" ? (
                      <Car className="w-6 h-6" />
                    ) : asset.jenis_bmn === "BANGUNAN DAN GEDUNG" ? (
                      <Building2 className="w-6 h-6" />
                    ) : (
                      <Package className="w-6 h-6" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <h2 className="text-2xl font-bold text-[var(--ds-fg)] tracking-tight leading-tight">
                        {asset.nama_barang}
                      </h2>
                      {asset.jenis_bmn === "ALAT ANGKUTAN BERMOTOR" &&
                        currentData.no_polisi &&
                        currentData.no_polisi.trim() !== "" &&
                        currentData.no_polisi.trim() !== "-" && (
                          <span
                            className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-slate-900 dark:bg-zinc-950 text-white font-mono font-bold text-xs tracking-wider border border-slate-700/80 dark:border-zinc-700 shadow-xs select-all"
                            title={`Nomor Polisi: ${currentData.no_polisi}`}
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-white/60" />
                            {currentData.no_polisi.toUpperCase()}
                          </span>
                        )}
                    </div>
                    {/* Merk & Tipe formatted according to user request */}
                    <p className="text-sm font-medium text-[var(--ds-fg-muted)] mt-1 leading-relaxed">
                      {getMerkTipeSubtitle()}
                    </p>
                  </div>
                </div>
              </div>

              {/* Tags Bar */}
              <div className="pt-3 border-t border-[var(--ds-border-subtle)] flex items-center justify-between flex-wrap gap-2 mt-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-semibold uppercase tracking-wider text-[var(--ds-fg-muted)] flex items-center gap-1">
                    <TagIcon className="w-3.5 h-3.5 text-[var(--ds-accent-fg)]" />
                    Tag Aset:
                  </span>
                  {asset.tags && asset.tags.length > 0 ? (
                    asset.tags.map((tag: IBmnTag) => <TagBadge key={tag.id} tag={tag} size="sm" />)
                  ) : (
                    <span className="text-xs text-[var(--ds-fg-muted)] italic">Belum ada tag</span>
                  )}
                </div>
                {canWrite && (
                  <button
                    onClick={() => setIsTagDialogOpen(true)}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--ds-accent-fg)] hover:underline transition-colors duration-150"
                  >
                    <span>+ Atur Tag</span>
                  </button>
                )}
              </div>
            </div>

            {/* Sub-Tile 2B: Financial & Lifecycle Bento Matrix (3 Interconnected Metric Micro-Tiles) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-[var(--ds-surface)] border border-[var(--ds-border-subtle)] rounded-xl p-3.5 flex flex-col justify-between shadow-xs">
                <div className="text-xs font-bold text-[var(--ds-fg-muted)] uppercase tracking-wider">
                  NILAI PEROLEHAN
                </div>
                <div className="text-base sm:text-lg font-bold text-[var(--ds-fg)] my-1 break-words tabular-nums">
                  {formatCurrency(currentData.nilai_perolehan)}
                </div>
                <div className="text-xs text-[var(--ds-fg-muted)]">Harga Awal Pengadaan</div>
              </div>

              <div className="bg-[var(--ds-surface)] border border-[var(--ds-border-subtle)] rounded-xl p-3.5 flex flex-col justify-between shadow-xs">
                <div className="text-xs font-bold text-[var(--ds-fg-muted)] uppercase tracking-wider">
                  NILAI BUKU
                </div>
                <div className="text-base sm:text-lg font-bold text-[var(--ds-accent-fg)] my-1 break-words tabular-nums">
                  {formatCurrency(currentData.nilai_buku)}
                </div>
                <div className="text-xs text-[var(--ds-fg-muted)]">Sisa Nilai Akuntansi</div>
              </div>

              <div className="bg-[var(--ds-surface)] border border-[var(--ds-border-subtle)] rounded-xl p-3.5 flex flex-col justify-between shadow-xs">
                <div className="text-xs font-bold text-[var(--ds-fg-muted)] uppercase tracking-wider">
                  TAHUN PEROLEHAN
                </div>
                <div className="text-base sm:text-lg font-bold text-[var(--ds-fg)] my-1">
                  {currentData.tahun_perolehan || "-"}
                </div>
                <div className="text-xs text-[var(--ds-fg-muted)]">Usia: {calculateAge()}</div>
              </div>
            </div>

            {/* Sub-Tile 2C: Physical Location & Warehouse Custodian Bento Tile */}
            <div className="bg-[var(--ds-surface)] border border-[var(--ds-border-subtle)] rounded-2xl p-4 flex items-center justify-between flex-wrap gap-3 shadow-xs">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-[var(--ds-surface-muted)] flex items-center justify-center text-[var(--ds-accent-fg)] shrink-0">
                  <Warehouse className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs uppercase font-bold text-[var(--ds-fg-muted)] tracking-wider">
                    LOKASI PENYIMPANAN FISIK
                  </div>
                  <div className="text-sm font-semibold text-[var(--ds-fg)] flex flex-wrap items-center gap-2 mt-0.5">
                    <span>{currentData.lokasi_ruang || "Belum ditentukan"}</span>
                    {(currentData.pengguna || currentData.nama_pengguna) && (
                      <>
                        <span className="text-[var(--ds-fg-muted)]">•</span>
                        <span className="text-xs font-normal text-[var(--ds-fg-muted)]">
                          Pengguna: {currentData.pengguna || currentData.nama_pengguna}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ==================== SECTION 2: PANORAMIC 5-POINT AUDIT PHOTO DOCUMENTATION DECK ==================== */}
        <PhotoGallery
          ref={galleryRef}
          assetId={assetId}
          assetName={asset.nama_barang}
          nup={asset.nup}
          fotoGeotagUrl={asset.foto_geotag_url}
          fotoGeotagPath={asset.foto_geotag_path}
          fotoDepanUrl={asset.foto_depan_url}
          fotoBelakangUrl={asset.foto_belakang_url}
          fotoKiriUrl={asset.foto_kiri_url}
          fotoKananUrl={asset.foto_kanan_url}
          frontLocationNote={asset.lokasi_spesifik || ""}
          onSaveFrontLocation={async (value) => {
            await api.put(`/bmn/assets/${assetId}`, { lokasi_spesifik: value });
            await refetch();
          }}
          fotoBpkb1Url={asset.foto_bpkb_1_url}
          fotoBpkb2Url={asset.foto_bpkb_2_url}
          fotoBpkb3Url={asset.foto_bpkb_3_url}
          fotoBpkb4Url={asset.foto_bpkb_4_url}
          fotoStnk1Url={asset.foto_stnk_1_url}
          fotoStnk2Url={asset.foto_stnk_2_url}
          bpkbDocument={asset.bpkb_document}
          stnkDocument={asset.stnk_document}
          isVehicle={asset.jenis_bmn === "ALAT ANGKUTAN BERMOTOR" && !!asset.no_polisi && asset.no_polisi.trim() !== "-"}
          verifiedAt={asset.verified_at}
          verifiedByName={asset.verified_by_name}
          onRefresh={refetch}
        />

        {/* ==================== SECTION 3: TECHNICAL & COMPLIANCE BENTO PANEL ==================== */}
        <section className="bg-[var(--ds-surface)] border border-[var(--ds-border-subtle)] rounded-2xl p-3 sm:p-6 shadow-xs">
          {/* Tab Navigation Bar with Sliding Indicator */}
          <div role="tablist" aria-label="Informasi aset" className="flex items-center gap-1.5 border-b border-[var(--ds-border-subtle)] overflow-x-auto pb-3">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  role="tab"
                  id={`${tabsId}-${tab.key}`}
                  aria-selected={isActive}
                  aria-controls={`${tabsId}-panel`}
                  tabIndex={isActive ? 0 : -1}
                  onKeyDown={(event) => {
                    const offset = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
                    if (!offset && event.key !== "Home" && event.key !== "End") return;
                    event.preventDefault();
                    const index = event.key === "Home" ? 0 : event.key === "End" ? tabs.length - 1 : (tabs.findIndex(item => item.key === tab.key) + offset + tabs.length) % tabs.length;
                    setActiveTab(tabs[index].key);
                    document.getElementById(`${tabsId}-${tabs[index].key}`)?.focus();
                  }}
                  onClick={() => setActiveTab(tab.key)}
                  className={cn(
                    "relative px-3.5 py-3 rounded-lg text-xs font-semibold flex items-center gap-2 shrink-0 transition-colors select-none cursor-pointer",
                    isActive
                      ? "text-[var(--ds-accent-fg)] bg-[var(--ds-surface-muted)] font-bold"
                      : "text-[var(--ds-fg-muted)] hover:text-[var(--ds-fg)] hover:bg-[var(--ds-surface-muted)]"
                  )}
                >
                  {isActive && (
                    <motion.span
                      layoutId={`${tabsId}-indicator`}
                      initial={false}
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--ds-accent-fg)]"
                      transition={reduceMotion ? { duration: 0 } : { type: "spring", stiffness: 420, damping: 32 }}
                    />
                  )}
                  <span className="relative z-10 flex items-center gap-2">
                    {tab.icon}
                    <span>{tab.label}</span>
                  </span>
                  {typeof tab.count === "number" && tab.count > 0 && (
                    <span
                      className={cn(
                        "relative z-10 px-1.5 py-0.5 rounded-full text-xs font-bold leading-none",
                        isActive
                          ? "bg-[var(--ds-accent-soft)] text-[var(--ds-accent-fg)]"
                          : "bg-[var(--ds-accent-soft)] text-[var(--ds-accent-fg)] border border-[var(--ds-accent-soft-border)]"
                      )}
                    >
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Tab Active Content */}
          <div role="tabpanel" id={`${tabsId}-panel`} aria-labelledby={`${tabsId}-${activeTab}`} tabIndex={0} className="mt-6">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={activeTab}
                initial={{ opacity: reduceMotion ? 1 : 0, y: reduceMotion ? 0 : 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: reduceMotion ? 1 : 0, y: reduceMotion ? 0 : -8 }}
                transition={{ duration: reduceMotion ? 0 : 0.16, ease: "easeOut" }}
                className="bmn-detail-tab-content"
              >
            {activeTab === "identitas" && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <DetailSection title="IDENTITAS BMN" icon={<FileText className="w-4 h-4" />}>
                  <DetailRow label="Jenis BMN" value={currentData.jenis_bmn} />
                  <DetailRow label="Kode Barang" value={currentData.kode_barang} />
                  <DetailRow label="NUP" value={currentData.nup} />
                  <DetailRow label="NUP Lama" value={currentData.nup_lama} />
                  <DetailRow label="Nama Barang" value={currentData.nama_barang} />
                  <FormInputRow
                    label="Status BMN"
                    value={currentData.status_bmn}
                    onChange={(val) => updateField("status_bmn", val)}
                    isEditMode={isEditMode}
                  />
                  <FormInputRow
                    label="Merk"
                    value={currentData.merk}
                    onChange={(val) => updateField("merk", val)}
                    isEditMode={isEditMode}
                  />
                  <FormInputRow
                    label="Tipe"
                    value={currentData.tipe}
                    onChange={(val) => updateField("tipe", val)}
                    isEditMode={isEditMode}
                  />
                  <FormInputRow
                    label="Nama"
                    value={currentData.nama}
                    onChange={(val) => updateField("nama", val)}
                    isEditMode={isEditMode}
                  />
                  <FormSelectRow
                    label="Kondisi"
                    value={currentData.kondisi}
                    onChange={(val) => updateField("kondisi", val)}
                    isEditMode={isEditMode}
                    options={KONDISI_OPTIONS}
                  />
                  <DetailRow label="Umur Aset" value={calculateAge()} />
                  <DetailRow label="Tahun Perolehan" value={currentData.tahun_perolehan} />
                  <DetailRow label="Intra/Extra" value={currentData.intra_extra} />
                  <DetailRow label="Henti Guna" value={currentData.henti_guna} />
                </DetailSection>

                <DetailSection title="KENDARAAN & SERTIFIKAT" icon={<Car className="w-4 h-4" />}>
                  <FormInputRow
                    label="No Polisi"
                    value={currentData.no_polisi}
                    onChange={(val) => updateField("no_polisi", val)}
                    isEditMode={isEditMode}
                  />
                  <FormInputRow
                    label="No BPKB"
                    value={currentData.no_bpkp}
                    onChange={(val) => updateField("no_bpkp", val)}
                    isEditMode={isEditMode}
                  />
                  <FormInputRow
                    label="No STNK"
                    value={currentData.no_stnk}
                    onChange={(val) => updateField("no_stnk", val)}
                    isEditMode={isEditMode}
                  />
                  {currentData.jenis_bmn === "ALAT ANGKUTAN BERMOTOR" && (
                    <>
                      <FormInputRow
                        label="No Mesin"
                        value={currentData.no_mesin}
                        onChange={(val) => updateField("no_mesin", val)}
                        isEditMode={isEditMode}
                      />
                      <FormInputRow
                        label="No Rangka"
                        value={currentData.no_rangka}
                        onChange={(val) => updateField("no_rangka", val)}
                        isEditMode={isEditMode}
                      />
                    </>
                  )}
                  <FormInputRow
                    label="Tanggal Pajak STNK"
                    value={currentData.tanggal_pajak_stnk}
                    onChange={(val) => updateField("tanggal_pajak_stnk", val)}
                    isEditMode={isEditMode}
                    type="date"
                    badge={currentData.tanggal_pajak_stnk ? <StnkCountdown tanggal={currentData.tanggal_pajak_stnk} label="Pajak" /> : undefined}
                  />
                  <FormInputRow
                    label="Tanggal Ganti Plat"
                    value={currentData.tanggal_ganti_plat}
                    onChange={(val) => updateField("tanggal_ganti_plat", val)}
                    isEditMode={isEditMode}
                    type="date"
                    badge={currentData.tanggal_ganti_plat ? <StnkCountdown tanggal={currentData.tanggal_ganti_plat} label="Ganti Plat" /> : undefined}
                  />
                  <FormInputRow
                    label="Status Sertifikasi"
                    value={currentData.status_sertifikasi}
                    onChange={(val) => updateField("status_sertifikasi", val)}
                    isEditMode={isEditMode}
                  />
                  <FormInputRow
                    label="Jenis Sertipikat"
                    value={currentData.jenis_sertipikat}
                    onChange={(val) => updateField("jenis_sertipikat", val)}
                    isEditMode={isEditMode}
                  />
                  <FormInputRow
                    label="No Sertifikat"
                    value={currentData.no_sertifikat}
                    onChange={(val) => updateField("no_sertifikat", val)}
                    isEditMode={isEditMode}
                  />
                  <DetailRow label="Jenis Identitas" value={currentData.jenis_identitas} />
                  <DetailRow label="No Identitas" value={currentData.no_identitas} />
                  <DetailRow
                    label="Status Foto Geotag"
                    value={
                      asset.foto_geotag_path || asset.foto_geotag_url
                        ? "Tersedia (Terverifikasi)"
                        : currentData.status_foto_geotag || "Belum Ada"
                    }
                  />
                  <DetailRow
                    label="Jumlah Foto"
                    value={
                      Math.max(
                        Number(currentData.jumlah_foto) || 0,
                        [
                          asset.foto_geotag_path || asset.foto_geotag_url,
                          asset.foto_depan_url,
                          asset.foto_belakang_url,
                          asset.foto_kiri_url,
                          asset.foto_kanan_url,
                        ].filter(Boolean).length
                      ) || "-"
                    }
                  />
                </DetailSection>
              </div>
            )}

            {activeTab === "finansial" && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <DetailSection title="NILAI & FINANSIAL" icon={<Banknote className="w-4 h-4" />}>
                  <FormCurrencyRow
                    label="Nilai Perolehan Pertama"
                    value={currentData.nilai_perolehan_pertama}
                    onChange={(val) => updateField("nilai_perolehan_pertama", val)}
                    isEditMode={isEditMode}
                  />
                  <FormCurrencyRow
                    label="Nilai Mutasi"
                    value={currentData.nilai_mutasi}
                    onChange={(val) => updateField("nilai_mutasi", val)}
                    isEditMode={isEditMode}
                  />
                  <FormCurrencyRow
                    label="Nilai Perolehan"
                    value={currentData.nilai_perolehan}
                    onChange={(val) => updateField("nilai_perolehan", val)}
                    isEditMode={isEditMode}
                  />
                  <FormCurrencyRow
                    label="Nilai Penyusutan"
                    value={currentData.nilai_penyusutan}
                    onChange={(val) => updateField("nilai_penyusutan", val)}
                    isEditMode={isEditMode}
                  />
                  <FormCurrencyRow
                    label="Nilai Buku"
                    value={currentData.nilai_buku}
                    onChange={(val) => updateField("nilai_buku", val)}
                    isEditMode={isEditMode}
                  />
                  <DetailRow label="Tanggal Perolehan" value={currentData.tanggal_perolehan} />
                  <DetailRow label="Tanggal Buku Pertama" value={currentData.tanggal_buku_pertama} />
                  <DetailRow label="Tanggal Penghapusan" value={currentData.tanggal_pengapusan} />
                </DetailSection>

                <DetailSection title="DIMENSI & LUAS" icon={<Building2 className="w-4 h-4" />}>
                  <AreaRow label="Luas Tanah Seluruhnya" value={currentData.luas_tanah_seluruhnya} />
                  <AreaRow label="Luas Tanah Bangunan" value={currentData.luas_tanah_bangunan} />
                  <AreaRow label="Luas Tanah Sarana" value={currentData.luas_tanah_sarana} />
                  <AreaRow label="Luas Lahan Kosong" value={currentData.luas_lahan_kosong} />
                  <AreaRow label="Luas Bangunan" value={currentData.luas_bangunan} />
                  <AreaRow label="Luas Tapak Bangunan" value={currentData.luas_tapak_bangunan} />
                  <AreaRow label="Luas Pemanfaatan" value={currentData.luas_pemanfaatan} />
                  <DetailRow label="Jumlah Lantai" value={currentData.jumlah_lantai} />
                </DetailSection>
              </div>
            )}

            {activeTab === "dokumen" && (
              <DetailSection title="STATUS & DOKUMEN LEGALITAS" icon={<Landmark className="w-4 h-4" />}>
                <FormInputRow
                  label="Status SBSN"
                  value={currentData.status_sbsn}
                  onChange={(val) => updateField("status_sbsn", val)}
                  isEditMode={isEditMode}
                />
                <FormInputRow
                  label="Status BMN Idle"
                  value={currentData.status_bmn_idle}
                  onChange={(val) => updateField("status_bmn_idle", val)}
                  isEditMode={isEditMode}
                />
                <FormInputRow
                  label="Status Kemitraan"
                  value={currentData.status_kemitraan}
                  onChange={(val) => updateField("status_kemitraan", val)}
                  isEditMode={isEditMode}
                />
                <FormInputRow
                  label="BPYBDS"
                  value={currentData.bpybds}
                  onChange={(val) => updateField("bpybds", val)}
                  isEditMode={isEditMode}
                />
                <FormInputRow
                  label="Usulan Barang Hilang"
                  value={currentData.usulan_barang_hilang}
                  onChange={(val) => updateField("usulan_barang_hilang", val)}
                  isEditMode={isEditMode}
                />
                <FormInputRow
                  label="Usulan Barang RB"
                  value={currentData.usulan_barang_rb}
                  onChange={(val) => updateField("usulan_barang_rb", val)}
                  isEditMode={isEditMode}
                />
                <FormInputRow
                  label="Usul Hapus"
                  value={currentData.usul_hapus}
                  onChange={(val) => updateField("usul_hapus", val)}
                  isEditMode={isEditMode}
                />
                <FormInputRow
                  label="Hibah DKTP"
                  value={currentData.hibah_dktp}
                  onChange={(val) => updateField("hibah_dktp", val)}
                  isEditMode={isEditMode}
                />
                <FormInputRow
                  label="Konsensi Jasa"
                  value={currentData.konsensi_jasa}
                  onChange={(val) => updateField("konsensi_jasa", val)}
                  isEditMode={isEditMode}
                />
                <FormInputRow
                  label="Properti Investasi"
                  value={currentData.properti_investasi}
                  onChange={(val) => updateField("properti_investasi", val)}
                  isEditMode={isEditMode}
                />
                <FormInputRow
                  label="Jenis Dokumen"
                  value={currentData.jenis_dokumen}
                  onChange={(val) => updateField("jenis_dokumen", val)}
                  isEditMode={isEditMode}
                />
                <FormInputRow
                  label="No Dokumen"
                  value={currentData.no_dokumen}
                  onChange={(val) => updateField("no_dokumen", val)}
                  isEditMode={isEditMode}
                />
                <FormInputRow
                  label="Status Penggunaan"
                  value={currentData.status_penggunaan}
                  onChange={(val) => updateField("status_penggunaan", val)}
                  isEditMode={isEditMode}
                />
                <FormInputRow
                  label="No PSP"
                  value={currentData.no_psp}
                  onChange={(val) => updateField("no_psp", val)}
                  isEditMode={isEditMode}
                />
                <FormInputRow
                  label="Tanggal PSP"
                  value={currentData.tanggal_psp}
                  onChange={(val) => updateField("tanggal_psp", val)}
                  isEditMode={isEditMode}
                  type="date"
                />
                <FormInputRow
                  label="Status PMK"
                  value={currentData.status_pmk}
                  onChange={(val) => updateField("status_pmk", val)}
                  isEditMode={isEditMode}
                />
              </DetailSection>
            )}

            {activeTab === "lokasi" && (
              <DetailSection title="LOKASI & PENANGGUNG JAWAB" icon={<MapPin className="w-4 h-4" />}>
                <FormInputRow
                  label="Alamat"
                  value={currentData.alamat}
                  onChange={(val) => updateField("alamat", val)}
                  isEditMode={isEditMode}
                />
                <FormInputRow
                  label="RT/RW"
                  value={currentData.rt_rw}
                  onChange={(val) => updateField("rt_rw", val)}
                  isEditMode={isEditMode}
                />
                <FormInputRow
                  label="Kelurahan/Desa"
                  value={currentData.kelurahan_desa}
                  onChange={(val) => updateField("kelurahan_desa", val)}
                  isEditMode={isEditMode}
                />
                <FormInputRow
                  label="Kecamatan"
                  value={currentData.kecamatan}
                  onChange={(val) => updateField("kecamatan", val)}
                  isEditMode={isEditMode}
                />
                <FormInputRow
                  label="Kab/Kota"
                  value={currentData.kab_kota}
                  onChange={(val) => updateField("kab_kota", val)}
                  isEditMode={isEditMode}
                />
                <DetailRow label="Kode Kab/Kota" value={currentData.kode_kab_kota} />
                <FormInputRow
                  label="Provinsi"
                  value={currentData.provinsi}
                  onChange={(val) => updateField("provinsi", val)}
                  isEditMode={isEditMode}
                />
                <DetailRow label="Kode Provinsi" value={currentData.kode_provinsi} />
                <FormInputRow
                  label="Kode Pos"
                  value={currentData.kode_pos}
                  onChange={(val) => updateField("kode_pos", val)}
                  isEditMode={isEditMode}
                />
                <FormSelectRow
                  label="Lokasi Ruang"
                  value={currentData.lokasi_ruang}
                  onChange={(val) => updateField("lokasi_ruang", val)}
                  isEditMode={isEditMode}
                  options={allLokasiRuangOptions}
                />
                <FormInputRow
                  label="SBSK"
                  value={currentData.sbsk}
                  onChange={(val) => updateField("sbsk", val)}
                  isEditMode={isEditMode}
                />
                <FormInputRow
                  label="Optimalisasi"
                  value={currentData.optimalisasi}
                  onChange={(val) => updateField("optimalisasi", val)}
                  isEditMode={isEditMode}
                />
                <FormEmployeeRow
                  label="Penghuni"
                  value={currentData.penghuni}
                  onChange={(val) => updateField("penghuni", val)}
                  isEditMode={isEditMode}
                  employees={employees}
                />
                <FormEmployeeRow
                  label="Pengguna"
                  value={currentData.pengguna}
                  onChange={(val) => updateField("pengguna", val)}
                  isEditMode={isEditMode}
                  employees={employees}
                />
                <FormEmployeeRow
                  label="Nama Pengguna"
                  value={currentData.nama_pengguna}
                  onChange={(val) => updateField("nama_pengguna", val)}
                  isEditMode={isEditMode}
                  employees={employees}
                />
              </DetailSection>
            )}

            {activeTab === "organisasi" && (
              <DetailSection title="ORGANISASI" icon={<UserCheck className="w-4 h-4" />}>
                <DetailRow label="Kode Satker" value={currentData.kode_satker} />
                <DetailRow label="Nama Satker" value={currentData.nama_satker} />
                <DetailRow label="Kode KPKNL" value={currentData.kode_kpknl} />
                <DetailRow label="Uraian KPKNL" value={currentData.uraian_kpknl} />
                <DetailRow label="Uraian Kanwil DJKN" value={currentData.uraian_kanwil_djkn} />
                <DetailRow label="Nama K/L" value={currentData.nama_kl} />
                <DetailRow label="Nama E1" value={currentData.nama_e1} />
                <DetailRow label="Nama Korwil" value={currentData.nama_korwil} />
                <DetailRow label="Kode Register" value={currentData.kode_register} />
              </DetailSection>
            )}

            {activeTab === "riwayat" && (
              <HistoryTab updates={asset.history_updates || []} isEditMode={isEditMode} />
            )}
              </motion.div>
            </AnimatePresence>
          </div>
        </section>
      </main>

      {/* Dialog Atur Tag */}
      <TagAssignmentDialog
        isOpen={isTagDialogOpen}
        onClose={() => setIsTagDialogOpen(false)}
        title={`Atur Tag: ${asset.nama_barang}`}
        description="Pilih tag yang ingin dipasang pada aset ini."
        initialTagIds={asset.tags?.map((t: IBmnTag) => t.id) || []}
        isBulk={false}
        onSave={async (tagIds) => {
          try {
            await api.post(`/bmn/assets/${assetId}/tags`, { tag_ids: tagIds });
            toast.success("Tag aset berhasil diperbarui.");
            queryClient.invalidateQueries({ queryKey: ["bmn-asset", assetId] });
            queryClient.invalidateQueries({ queryKey: ["bmn-assets"] });
            queryClient.invalidateQueries({ queryKey: ["bmn-tags"] });
          } catch {
            toast.error("Gagal memperbarui tag aset.");
          }
        }}
      />

      {/* Sticky Mobile Edit Actions */}
      {canWrite && isEditMode && (
        <div className="fixed bottom-0 left-0 right-0 z-40 sm:hidden bg-[var(--ds-surface)] backdrop-blur-md border-t border-[var(--ds-border-subtle)] p-3 flex items-center justify-between gap-3 shadow-lg">
          <button
            onClick={handleCancelEdit}
            disabled={isSaving}
            className="bmn-button bmn-secondary flex-1 py-2 rounded-xl text-xs font-semibold border border-[var(--ds-border-subtle)] text-[var(--ds-fg-muted)] hover:bg-[var(--ds-secondary-hover)] disabled:opacity-50"
          >
            Batal
          </button>
          <button
            onClick={handleSaveAll}
            disabled={isSaving}
            className="flex-1 py-2 rounded-xl text-xs font-semibold bmn-button bmn-primary flex items-center justify-center gap-1.5 shadow-xs disabled:opacity-50"
          >
            {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
            Simpan Perubahan
          </button>
        </div>
      )}
    </div>
  );
}

function StnkCountdown({ tanggal, label }: { tanggal: string; label: string }) {
  const today = new Date();
  const target = new Date(tanggal);
  const diffMs = target.getTime() - today.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return (
      <span data-status="danger" className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold">
        🚨 {label} expired {Math.abs(diffDays)} hari lalu
      </span>
    );
  }
  if (diffDays <= 30) {
    return (
      <span data-status="warning" className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold">
        ⚠️ {diffDays} hari lagi
      </span>
    );
  }
  if (diffDays <= 90) {
    return (
      <span data-status="info" className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold">
        {diffDays} hari lagi
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--ds-accent-soft)] text-[var(--ds-accent-fg)]">
      ✓ {diffDays} hari lagi
    </span>
  );
}

interface HistoryUpdate {
  id: string;
  field_changed: string;
  old_value: string | null;
  new_value: string | null;
  alasan_perubahan: string | null;
  created_at: string;
  author?: { id: number; name: string };
}

function HistoryTab({ updates, isEditMode }: { updates: HistoryUpdate[]; isEditMode?: boolean }) {
  return (
    <div className="space-y-4">
      {isEditMode && (
        <div className="p-3.5 bg-[var(--ds-status-warning-bg)] border border-[var(--ds-status-warning-border)] rounded-xl flex items-center gap-3 text-[var(--ds-status-warning-fg)] text-xs">
          <AlertCircle className="w-4 h-4 shrink-0 text-[var(--ds-status-warning-fg)]" />
          <div>
            <span className="font-bold">Mode Edit Sedang Aktif:</span> Perubahan data yang sedang diedit tersimpan dalam draft. Klik tombol <strong>&ldquo;Simpan Perubahan&rdquo;</strong> di header atas untuk menyimpan perubahan dan mencatatnya ke riwayat ini.
          </div>
        </div>
      )}

      {updates.length === 0 ? (
        <div className="bg-[var(--ds-surface)] border border-[var(--ds-border-subtle)] rounded-2xl p-8 text-center">
          <History className="w-10 h-10 mx-auto mb-3 text-[var(--ds-fg-muted)]" />
          <p className="text-sm font-semibold text-[var(--ds-fg-muted)]">Belum ada riwayat perubahan data</p>
          <p className="text-xs text-[var(--ds-fg-muted)] mt-1">
            Setiap kali data aset diperbarui dan disimpan, log kronologis riwayat perubahan (Asset Data Change History) akan otomatis tercatat di sini.
          </p>
        </div>
      ) : (
        <div className="bg-[var(--ds-surface)] border border-[var(--ds-border-subtle)] rounded-2xl overflow-hidden shadow-xs">
          <div className="px-5 py-3.5 border-b border-[var(--ds-border-subtle)] bg-[var(--ds-surface-muted)] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-[var(--ds-accent-fg)]" />
              <h4 className="text-xs font-bold text-[var(--ds-fg)] uppercase tracking-wider">
                Riwayat Perubahan Data Aset (Asset Data Change History)
              </h4>
            </div>
            <span className="text-xs text-[var(--ds-fg-muted)] font-medium">{updates.length} log perubahan</span>
          </div>
          <div className="divide-y divide-[var(--ds-border-subtle)] max-h-[420px] overflow-y-auto">
            {updates.map((update) => (
              <div key={update.id} className="px-5 py-3 hover:bg-[var(--ds-surface-muted)] transition-colors duration-150">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold text-[var(--ds-accent-fg)] bg-[var(--ds-accent-soft)] px-1.5 py-0.5 rounded">
                        {update.field_changed}
                      </span>
                      <span className="text-xs text-[var(--ds-fg-muted)]">oleh {update.author?.name || "System"}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-[var(--ds-status-danger-fg)] line-through truncate max-w-[200px]">{update.old_value || "—"}</span>
                      <span className="text-[var(--ds-fg-muted)]">→</span>
                      <span className="text-[var(--ds-accent-fg)] font-medium truncate max-w-[200px]">
                        {update.new_value || "—"}
                      </span>
                    </div>
                    {update.alasan_perubahan && (
                      <p className="text-xs text-[var(--ds-fg-muted)] mt-1 italic">{update.alasan_perubahan}</p>
                    )}
                  </div>
                  <span className="text-xs text-[var(--ds-fg-muted)] shrink-0">
                    {new Date(update.created_at).toLocaleDateString("id-ID", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
