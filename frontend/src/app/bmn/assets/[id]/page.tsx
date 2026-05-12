"use client";

import React, { use, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import Link from "next/link";
import { ArrowLeft, Loader2, Package, FileText, Banknote, MapPin, Building2, Car, Landmark, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DetailSection, DetailRow, CurrencyRow, AreaRow, BadgeRow } from "./_components/DetailSection";
import { PhotoGallery } from "./_components/PhotoGallery";

export default function BmnAssetDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  if (id === "create") {
    return <CreateRedirect />;
  }

  return <AssetDetail assetId={id} />;
}

function CreateRedirect() {
  const router = useRouter();
  React.useEffect(() => { router.replace("/bmn/assets/create"); }, [router]);
  return null;
}

function AssetDetail({ assetId }: { assetId: string }) {
  const { data: asset, isLoading, isError, refetch } = useQuery({
    queryKey: ["bmn-asset", assetId],
    queryFn: async () => {
      const res = await api.get(`/bmn/assets/${assetId}`);
      return res.data.data;
    },
  });

  const [activeTab, setActiveTab] = useState("identitas");

  if (isLoading) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500 mb-3" />
        <p className="text-sm text-slate-400">Memuat data aset...</p>
      </div>
    );
  }

  if (isError || !asset) {
    return (
      <div className="p-8 text-center">
        <Package className="w-12 h-12 mx-auto mb-3 text-slate-200" />
        <p className="text-slate-500 mb-3">Aset tidak ditemukan</p>
        <Link href="/bmn/assets"><Button variant="outline" size="sm">Kembali</Button></Link>
      </div>
    );
  }

  const kondisiVariant = asset.kondisi === "Baik" ? "success" : asset.kondisi === "Rusak Ringan" ? "warning" : "danger";
  const kondisiColor = asset.kondisi === "Baik" ? "bg-emerald-50 text-emerald-700 ring-emerald-200" : asset.kondisi === "Rusak Ringan" ? "bg-amber-50 text-amber-700 ring-amber-200" : "bg-red-50 text-red-700 ring-red-200";
  const formatCurrency = (v: number) => v ? new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(v) : "-";

  const tabs = [
    { key: "identitas", label: "Identitas" },
    { key: "finansial", label: "Finansial" },
    { key: "dokumen", label: "Dokumen" },
    { key: "lokasi", label: "Lokasi" },
    { key: "organisasi", label: "Organisasi" },
  ];

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-6xl mx-auto">
      {/* Back */}
      <Link href="/bmn/assets" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-emerald-600 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Kembali ke Katalog
      </Link>

      {/* Hero Card */}
      <div className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-200/60 overflow-hidden">
        <div className="h-2 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500" />
        <div className="p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 flex items-center justify-center shrink-0">
                <Package className="w-7 h-7 text-emerald-600" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900">{asset.nama_barang}</h1>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <span className="text-xs font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md ring-1 ring-emerald-200/50">{asset.kode_barang}</span>
                  <span className="text-xs text-slate-400">NUP: {asset.nup}</span>
                  {asset.jenis_bmn && <span className="text-xs text-slate-400">• {asset.jenis_bmn}</span>}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className={`inline-flex px-3 py-1 rounded-full text-xs font-bold ring-1 ${kondisiColor}`}>{asset.kondisi}</span>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6 pt-5 border-t border-slate-100">
            <QuickStat label="Nilai Perolehan" value={formatCurrency(asset.nilai_perolehan)} />
            <QuickStat label="Nilai Buku" value={formatCurrency(asset.nilai_buku)} />
            <QuickStat label="Tahun" value={asset.tahun_perolehan || "-"} />
            <QuickStat label="Status" value={asset.status_bmn || "Aktif"} />
          </div>
        </div>
      </div>

      {/* Photo Gallery */}
      <PhotoGallery
        assetId={assetId}
        assetName={asset.nama_barang}
        nup={asset.nup}
        fotoGeotagUrl={asset.foto_geotag_url}
        fotoDepanUrl={asset.foto_depan_url}
        fotoBelakangUrl={asset.foto_belakang_url}
        fotoKiriUrl={asset.foto_kiri_url}
        fotoKananUrl={asset.foto_kanan_url}
        onRefresh={refetch}
      />

      {/* Tab Navigation */}
      <div className="flex items-center gap-1 bg-white rounded-xl ring-1 ring-slate-200/60 p-1 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${activeTab === tab.key ? "bg-emerald-600 text-white shadow-sm" : "text-slate-500 hover:bg-slate-50"}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === "identitas" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <DetailSection title="Identitas BMN" icon={<FileText className="w-4 h-4" />}>
            <DetailRow label="Jenis BMN" value={asset.jenis_bmn} />
            <DetailRow label="Kode Barang" value={asset.kode_barang} />
            <DetailRow label="NUP" value={asset.nup} />
            <DetailRow label="NUP Lama" value={asset.nup_lama} />
            <DetailRow label="Nama Barang" value={asset.nama_barang} />
            <DetailRow label="Status BMN" value={asset.status_bmn} />
            <DetailRow label="Merk" value={asset.merk} />
            <DetailRow label="Tipe" value={asset.tipe} />
            <BadgeRow label="Kondisi" value={asset.kondisi} variant={kondisiVariant} />
            <DetailRow label="Umur Aset" value={asset.umur_aset ? `${asset.umur_aset} tahun` : null} />
            <DetailRow label="Intra/Extra" value={asset.intra_extra} />
            <DetailRow label="Henti Guna" value={asset.henti_guna} />
          </DetailSection>

          <DetailSection title="Kendaraan & Sertifikat" icon={<Car className="w-4 h-4" />}>
            <DetailRow label="No Polisi" value={asset.no_polisi} />
            <DetailRow label="No STNK" value={asset.no_stnk} />
            <DetailRow label="Status Sertifikasi" value={asset.status_sertifikasi} />
            <DetailRow label="Jenis Sertipikat" value={asset.jenis_sertipikat} />
            <DetailRow label="No Sertifikat" value={asset.no_sertifikat} />
            <DetailRow label="Nama Pemilik" value={asset.nama_pemilik} />
            <DetailRow label="Jenis Identitas" value={asset.jenis_identitas} />
            <DetailRow label="No Identitas" value={asset.no_identitas} />
            <DetailRow label="Status Foto Geotag" value={asset.status_foto_geotag} />
            <DetailRow label="Jumlah Foto" value={asset.jumlah_foto} />
          </DetailSection>
        </div>
      )}

      {activeTab === "finansial" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <DetailSection title="Nilai & Finansial" icon={<Banknote className="w-4 h-4" />}>
            <CurrencyRow label="Nilai Perolehan Pertama" value={asset.nilai_perolehan_pertama} />
            <CurrencyRow label="Nilai Mutasi" value={asset.nilai_mutasi} />
            <CurrencyRow label="Nilai Perolehan" value={asset.nilai_perolehan} />
            <CurrencyRow label="Nilai Penyusutan" value={asset.nilai_penyusutan} />
            <CurrencyRow label="Nilai Buku" value={asset.nilai_buku} />
            <DetailRow label="Tanggal Perolehan" value={asset.tanggal_perolehan} />
            <DetailRow label="Tanggal Buku Pertama" value={asset.tanggal_buku_pertama} />
            <DetailRow label="Tanggal Penghapusan" value={asset.tanggal_pengapusan} />
          </DetailSection>

          <DetailSection title="Dimensi & Luas" icon={<Building2 className="w-4 h-4" />}>
            <AreaRow label="Luas Tanah Seluruhnya" value={asset.luas_tanah_seluruhnya} />
            <AreaRow label="Luas Tanah Bangunan" value={asset.luas_tanah_bangunan} />
            <AreaRow label="Luas Tanah Sarana" value={asset.luas_tanah_sarana} />
            <AreaRow label="Luas Lahan Kosong" value={asset.luas_lahan_kosong} />
            <AreaRow label="Luas Bangunan" value={asset.luas_bangunan} />
            <AreaRow label="Luas Tapak Bangunan" value={asset.luas_tapak_bangunan} />
            <AreaRow label="Luas Pemanfaatan" value={asset.luas_pemanfaatan} />
            <DetailRow label="Jumlah Lantai" value={asset.jumlah_lantai} />
          </DetailSection>
        </div>
      )}

      {activeTab === "dokumen" && (
        <DetailSection title="Status & Dokumen" icon={<Landmark className="w-4 h-4" />}>
          <DetailRow label="Status SBSN" value={asset.status_sbsn} />
          <DetailRow label="Status BMN Idle" value={asset.status_bmn_idle} />
          <DetailRow label="Status Kemitraan" value={asset.status_kemitraan} />
          <DetailRow label="BPYBDS" value={asset.bpybds} />
          <DetailRow label="Usulan Barang Hilang" value={asset.usulan_barang_hilang} />
          <DetailRow label="Usulan Barang RB" value={asset.usulan_barang_rb} />
          <DetailRow label="Usul Hapus" value={asset.usul_hapus} />
          <DetailRow label="Hibah DKTP" value={asset.hibah_dktp} />
          <DetailRow label="Konsensi Jasa" value={asset.konsensi_jasa} />
          <DetailRow label="Properti Investasi" value={asset.properti_investasi} />
          <DetailRow label="Jenis Dokumen" value={asset.jenis_dokumen} />
          <DetailRow label="No Dokumen" value={asset.no_dokumen} />
          <DetailRow label="No BPKP" value={asset.no_bpkp} />
          <DetailRow label="Status Penggunaan" value={asset.status_penggunaan} />
          <DetailRow label="No PSP" value={asset.no_psp} />
          <DetailRow label="Tanggal PSP" value={asset.tanggal_psp} />
          <DetailRow label="Status PMK" value={asset.status_pmk} />
        </DetailSection>
      )}

      {activeTab === "lokasi" && (
        <DetailSection title="Lokasi" icon={<MapPin className="w-4 h-4" />}>
          <DetailRow label="Alamat" value={asset.alamat} />
          <DetailRow label="RT/RW" value={asset.rt_rw} />
          <DetailRow label="Kelurahan/Desa" value={asset.kelurahan_desa} />
          <DetailRow label="Kecamatan" value={asset.kecamatan} />
          <DetailRow label="Kab/Kota" value={asset.kab_kota} />
          <DetailRow label="Provinsi" value={asset.provinsi} />
          <DetailRow label="Kode Pos" value={asset.kode_pos} />
          <DetailRow label="Lokasi Ruang" value={asset.lokasi_ruang} />
          <DetailRow label="SBSK" value={asset.sbsk} />
          <DetailRow label="Optimalisasi" value={asset.optimalisasi} />
        </DetailSection>
      )}

      {activeTab === "organisasi" && (
        <DetailSection title="Organisasi & Pengguna" icon={<UserCheck className="w-4 h-4" />}>
          <DetailRow label="Kode Satker" value={asset.kode_satker} />
          <DetailRow label="Nama Satker" value={asset.nama_satker} />
          <DetailRow label="Penghuni" value={asset.penghuni} />
          <DetailRow label="Pengguna" value={asset.pengguna} />
          <DetailRow label="Nama Pengguna BMN" value={asset.nama_pengguna_bmn} />
          <DetailRow label="Kode KPKNL" value={asset.kode_kpknl} />
          <DetailRow label="Uraian KPKNL" value={asset.uraian_kpknl} />
          <DetailRow label="Uraian Kanwil DJKN" value={asset.uraian_kanwil_djkn} />
          <DetailRow label="Nama K/L" value={asset.nama_kl} />
          <DetailRow label="Nama E1" value={asset.nama_e1} />
          <DetailRow label="Nama Korwil" value={asset.nama_korwil} />
          <DetailRow label="Kode Register" value={asset.kode_register} />
        </DetailSection>
      )}
    </div>
  );
}

function QuickStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="p-3 rounded-xl bg-slate-50/80">
      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{label}</p>
      <p className="text-sm font-bold text-slate-800 mt-0.5 truncate">{String(value)}</p>
    </div>
  );
}
