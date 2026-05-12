"use client";

import { use } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import Link from "next/link";
import { ArrowLeft, Loader2, Package, FileText, Banknote, MapPin, Building2, Car, Landmark, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DetailSection, DetailRow, CurrencyRow, AreaRow, BadgeRow } from "./_components/DetailSection";

export default function BmnAssetDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  // Redirect to create page if id is "create"
  if (id === "create") {
    router.replace("/bmn/assets/create");
    return null;
  }

  return <AssetDetail assetId={id} />;
}

function AssetDetail({ assetId }: { assetId: string }) {
  const { data: asset, isLoading, isError } = useQuery({
    queryKey: ["bmn-asset", assetId],
    queryFn: async () => {
      const res = await api.get(`/bmn/assets/${assetId}`);
      return res.data.data;
    },
  });

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

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/bmn/assets" className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-500 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-slate-900 truncate">{asset.nama_barang}</h1>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">{asset.kode_barang}</span>
            <span className="text-xs text-slate-400">NUP: {asset.nup}</span>
            {asset.jenis_bmn && <span className="text-xs text-slate-400">• {asset.jenis_bmn}</span>}
          </div>
        </div>
        <BadgeRow label="" value={asset.kondisi} variant={kondisiVariant} />
      </div>

      {/* Sections Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Identitas BMN */}
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

        {/* Finansial */}
        <DetailSection title="Nilai & Finansial" icon={<Banknote className="w-4 h-4" />}>
          <CurrencyRow label="Nilai Perolehan Pertama" value={asset.nilai_perolehan_pertama} />
          <CurrencyRow label="Nilai Mutasi" value={asset.nilai_mutasi} />
          <CurrencyRow label="Nilai Perolehan" value={asset.nilai_perolehan} />
          <CurrencyRow label="Nilai Penyusutan" value={asset.nilai_penyusutan} />
          <CurrencyRow label="Nilai Buku" value={asset.nilai_buku} />
          <DetailRow label="Tanggal Perolehan" value={asset.tanggal_perolehan} />
          <DetailRow label="Tanggal Buku Pertama" value={asset.tanggal_buku_pertama} />
          <DetailRow label="Tanggal Penghapusan" value={asset.tanggal_pengapusan} />
          <DetailRow label="Tahun Perolehan" value={asset.tahun_perolehan} />
        </DetailSection>

        {/* Status & Dokumen */}
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

        {/* Kendaraan & Sertifikat */}
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

        {/* Lokasi */}
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

        {/* Luas */}
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

        {/* Organisasi */}
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
      </div>
    </div>
  );
}
