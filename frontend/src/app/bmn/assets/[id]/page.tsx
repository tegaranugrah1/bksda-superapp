"use client";

import React, { use, useState, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import Link from "next/link";
import { ArrowLeft, Loader2, Package, FileText, Banknote, MapPin, Building2, Car, Landmark, UserCheck, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DetailSection, DetailRow, EditableRow, EditableSelectRow, EditableEmployeeRow, CurrencyRow, EditableCurrencyRow, AreaRow, BadgeRow } from "./_components/DetailSection";
import { PhotoGallery } from "./_components/PhotoGallery";
import { useRole } from "@/hooks/useRole";
import { toast } from "sonner";

const LOKASI_RUANG_OPTIONS = [
  "Kantor Balai KSDA Kalimantan Timur",
  "Urusan Umum dan Perlengkapan",
  "Urusan Kepegawaian",
  "Urusan Program dan Perencanaan",
  "Urusan Keuangan",
  "Urusan Evlab",
  "Urusan Teknis",
  "Urusan Perlindungan",
  "Urusan IKN",
  "Seksi KSDA Wilayah I (Berau)",
  "Resor 01. Berau",
  "Resor 02. Pulau Semama dan Pulau Sangalaki",
  "Resor 03. Tanjung Selor",
  "Resor 04. Tarakan",
  "Seksi KSDA Wilayah II (Tenggarong)",
  "Resor 05. Samarinda",
  "Resor 06. Padang Luway",
  "Resor 07. Muara Kaman Sedulang",
  "Resor 08. Sangatta",
  "Resor 09. Suaka Badak Kelian",
  "Seksi KSDA Wilayah III (Balikpapan)",
  "Resor 10. Balikpapan",
  "Resor 11. Teluk Adang",
  "Resor 12. Teluk Apar",
  "Resor 13. Paser",
  "Resor 14. Ibu Kota Nusantara",
];

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
  const queryClient = useQueryClient();
  const router = useRouter();
  const { hasPermission } = useRole();
  const canWrite = hasPermission("bmn.asset.update");
  const { data: asset, isLoading, isError, refetch } = useQuery({
    queryKey: ["bmn-asset", assetId],
    queryFn: async () => {
      const res = await api.get(`/bmn/assets/${assetId}`);
      return res.data.data;
    },
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

  const handleFieldSave = useCallback(async (field: string, value: string) => {
    try {
      // Sync pengguna <-> nama_pengguna
      const payload: Record<string, string | null> = { [field]: value || null };
      if (field === "pengguna") payload.nama_pengguna = value || null;
      if (field === "nama_pengguna") payload.pengguna = value || null;

      await api.put(`/bmn/assets/${assetId}`, payload);
      toast.success("Field berhasil diperbarui.");
      queryClient.invalidateQueries({ queryKey: ["bmn-asset", assetId] });
      queryClient.invalidateQueries({ queryKey: ["bmn-assets"] });
    } catch {
      toast.error("Gagal menyimpan perubahan.");
      throw new Error("save failed");
    }
  }, [assetId, queryClient]);

  if (isLoading) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500 mb-3" />
        <p className="text-sm text-zinc-400">Memuat data aset...</p>
      </div>
    );
  }

  if (isError || !asset) {
    return (
      <div className="p-8 text-center">
        <Package className="w-12 h-12 mx-auto mb-3 text-zinc-300 dark:text-zinc-600" />
        <p className="text-slate-500 dark:text-slate-400 mb-3">Aset tidak ditemukan</p>
        <Link href="/bmn/assets"><Button variant="outline" size="sm">Kembali</Button></Link>
      </div>
    );
  }

  const kondisiVariant = asset.kondisi === "Baik" ? "success" : asset.kondisi === "Rusak Ringan" ? "warning" : "danger";
  const kondisiColor = asset.kondisi === "Baik" ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 ring-emerald-200" : asset.kondisi === "Rusak Ringan" ? "bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 ring-amber-200" : "bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 ring-red-200";
  const formatCurrency = (v: number) => v ? new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(v) : "-";

  const tabs = [
    { key: "identitas", label: "Identitas" },
    { key: "finansial", label: "Finansial" },
    { key: "dokumen", label: "Dokumen" },
    { key: "lokasi", label: "Lokasi" },
    { key: "organisasi", label: "Organisasi" },
    { key: "riwayat", label: "Riwayat" },
  ];

  return (
    <div className="p-6 md:p-10 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="max-w-6xl mx-auto space-y-6">
      {/* Back */}
      <button onClick={() => router.back()} className="inline-flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 hover:text-emerald-600 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Kembali ke Katalog
      </button>

      {/* Hero Card */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm ring-1 ring-zinc-200/60 dark:ring-zinc-800 overflow-hidden">
        <div className="p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center shrink-0">
                <Package className="w-7 h-7 text-emerald-600" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">{asset.nama_barang}</h1>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <span className="text-xs font-mono text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded-md ring-1 ring-emerald-200/50">{asset.kode_barang}</span>
                  <span className="text-xs text-slate-400">NUP: {asset.nup}</span>
                  {asset.jenis_bmn && <span className="text-xs text-slate-400">• {asset.jenis_bmn}</span>}
                </div>
              </div>
            </div>
            <div className="flex flex-col items-end gap-1">
              <div className="flex items-center gap-2">
                {asset.active_loan && (
                  <span className="inline-flex px-3 py-1 rounded-full text-xs font-bold ring-1 bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 ring-blue-200 shadow-sm">
                    Dipinjam
                  </span>
                )}
                <span className={`inline-flex px-3 py-1 rounded-full text-xs font-bold ring-1 ${kondisiColor} shadow-sm`}>{asset.kondisi}</span>
              </div>
              {asset.active_loan && asset.active_loan.borrower_name && (
                <span className="text-[10px] font-medium text-blue-600 bg-blue-50/50 px-2 py-0.5 rounded-md mt-0.5 flex items-center gap-1">
                  👤 {asset.active_loan.borrower_name}
                </span>
              )}
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6 pt-5 border-t border-zinc-100 dark:border-zinc-800">
            <QuickStat label="Nilai Perolehan" value={formatCurrency(asset.nilai_perolehan)} />
            <QuickStat label="Nilai Buku" value={formatCurrency(asset.nilai_buku)} />
            <QuickStat label="Tahun" value={asset.tahun_perolehan || "-"} />
            <QuickStat label="Status" value={asset.status_bmn || "Aktif"} />
          </div>

          {/* Extra Info: Lokasi, Pengguna, Kendaraan */}
          {(asset.lokasi_ruang || asset.pengguna || asset.nama_pengguna || asset.jenis_bmn === "ALAT ANGKUTAN BERMOTOR") && (
            <div className="flex flex-wrap gap-x-6 gap-y-1 mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-800">
              {asset.lokasi_ruang && (
                <span className="text-xs text-zinc-500 dark:text-zinc-400"><span className="font-semibold text-zinc-700 dark:text-zinc-300">Lokasi:</span> {asset.lokasi_ruang}</span>
              )}
              {(asset.pengguna || asset.nama_pengguna) && (
                <span className="text-xs text-zinc-500 dark:text-zinc-400"><span className="font-semibold text-zinc-700 dark:text-zinc-300">Pengguna:</span> {asset.pengguna || asset.nama_pengguna}</span>
              )}
              {asset.jenis_bmn === "ALAT ANGKUTAN BERMOTOR" && asset.no_polisi && (
                <span className="text-xs text-zinc-500 dark:text-zinc-400"><span className="font-semibold text-zinc-700 dark:text-zinc-300">No Polisi:</span> {asset.no_polisi}</span>
              )}
              {asset.jenis_bmn === "ALAT ANGKUTAN BERMOTOR" && asset.tanggal_pajak_stnk && (
                <span className="text-xs text-zinc-500 dark:text-zinc-400"><span className="font-semibold text-zinc-700 dark:text-zinc-300">Pajak STNK:</span> {asset.tanggal_pajak_stnk}</span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Photo Gallery */}
      <PhotoGallery
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
        onSaveFrontLocation={(value) => handleFieldSave("lokasi_spesifik", value)}
        fotoBpkb1Url={asset.foto_bpkb_1_url}
        fotoBpkb2Url={asset.foto_bpkb_2_url}
        fotoBpkb3Url={asset.foto_bpkb_3_url}
        fotoBpkb4Url={asset.foto_bpkb_4_url}
        fotoStnk1Url={asset.foto_stnk_1_url}
        fotoStnk2Url={asset.foto_stnk_2_url}
        isVehicle={asset.jenis_bmn === "ALAT ANGKUTAN BERMOTOR" && !!asset.no_polisi && asset.no_polisi.trim() !== "-"}
        verifiedAt={asset.verified_at}
        verifiedByName={asset.verified_by_name}
        onRefresh={refetch}
      />

      {/* Tab Navigation */}
      <div className="flex items-center gap-1 bg-white dark:bg-zinc-900 rounded-xl ring-1 ring-zinc-200/60 dark:ring-zinc-800 p-1 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${activeTab === tab.key ? "bg-emerald-600 text-white shadow-sm" : "text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"}`}
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
            {canWrite ? (
              <>
                <EditableRow label="Status BMN" value={asset.status_bmn} field="status_bmn" onSave={handleFieldSave} />
                <EditableRow label="Merk" value={asset.merk} field="merk" onSave={handleFieldSave} />
                <EditableRow label="Tipe" value={asset.tipe} field="tipe" onSave={handleFieldSave} />
                <EditableRow label="Nama" value={asset.nama} field="nama" onSave={handleFieldSave} />
              </>
            ) : (
              <>
                <DetailRow label="Status BMN" value={asset.status_bmn} />
                <DetailRow label="Merk" value={asset.merk} />
                <DetailRow label="Tipe" value={asset.tipe} />
                <DetailRow label="Nama" value={asset.nama} />
              </>
            )}
            {canWrite ? (
              <EditableSelectRow label="Kondisi" value={asset.kondisi} field="kondisi" onSave={handleFieldSave} options={["Baik", "Rusak Ringan", "Rusak Berat"]} />
            ) : (
              <BadgeRow label="Kondisi" value={asset.kondisi} variant={kondisiVariant} />
            )}
            <DetailRow label="Umur Aset" value={asset.umur_aset ? `${asset.umur_aset} tahun` : null} />
            <DetailRow label="Tahun Perolehan" value={asset.tahun_perolehan} />
            <DetailRow label="Intra/Extra" value={asset.intra_extra} />
            <DetailRow label="Henti Guna" value={asset.henti_guna} />
          </DetailSection>

            <DetailSection title="Kendaraan & Sertifikat" icon={<Car className="w-4 h-4" />}>
              {canWrite ? (
                <>
                  <EditableRow label="No Polisi" value={asset.no_polisi} field="no_polisi" onSave={handleFieldSave} />
                  <EditableRow label="No BPKB" value={asset.no_bpkp} field="no_bpkp" onSave={handleFieldSave} />
                  <EditableRow label="No STNK" value={asset.no_stnk} field="no_stnk" onSave={handleFieldSave} />
                  {(asset.jenis_bmn === "ALAT ANGKUTAN BERMOTOR" && !!asset.no_polisi && asset.no_polisi.trim() !== "-") && (
                    <EditableRow label="No Mesin" value={asset.no_mesin} field="no_mesin" onSave={handleFieldSave} />
                  )}
                  {(asset.jenis_bmn === "ALAT ANGKUTAN BERMOTOR" && !!asset.no_polisi && asset.no_polisi.trim() !== "-") && (
                    <EditableRow label="No Rangka" value={asset.no_rangka} field="no_rangka" onSave={handleFieldSave} />
                  )}
                  <EditableRow label="Tanggal Pajak STNK" value={asset.tanggal_pajak_stnk} field="tanggal_pajak_stnk" onSave={handleFieldSave} type="date" badge={asset.tanggal_pajak_stnk ? <StnkCountdown tanggal={asset.tanggal_pajak_stnk} label="Pajak" /> : undefined} />
                  <EditableRow label="Tanggal Ganti Plat" value={asset.tanggal_ganti_plat} field="tanggal_ganti_plat" onSave={handleFieldSave} type="date" badge={asset.tanggal_ganti_plat ? <StnkCountdown tanggal={asset.tanggal_ganti_plat} label="Ganti Plat" /> : undefined} />
                  <EditableRow label="Status Sertifikasi" value={asset.status_sertifikasi} field="status_sertifikasi" onSave={handleFieldSave} />
                  <EditableRow label="Jenis Sertipikat" value={asset.jenis_sertipikat} field="jenis_sertipikat" onSave={handleFieldSave} />
                  <EditableRow label="No Sertifikat" value={asset.no_sertifikat} field="no_sertifikat" onSave={handleFieldSave} />
                  <EditableRow label="Nama" value={asset.nama} field="nama" onSave={handleFieldSave} />
                </>
              ) : (
                <>
                  <DetailRow label="No Polisi" value={asset.no_polisi} />
                  <DetailRow label="No BPKB" value={asset.no_bpkp} />
                  <DetailRow label="No STNK" value={asset.no_stnk} />
                  {(asset.jenis_bmn === "ALAT ANGKUTAN BERMOTOR" && !!asset.no_polisi && asset.no_polisi.trim() !== "-") && (
                    <DetailRow label="No Mesin" value={asset.no_mesin} />
                  )}
                  {(asset.jenis_bmn === "ALAT ANGKUTAN BERMOTOR" && !!asset.no_polisi && asset.no_polisi.trim() !== "-") && (
                    <DetailRow label="No Rangka" value={asset.no_rangka} />
                  )}
                  <DetailRow label="Tanggal Pajak STNK" value={asset.tanggal_pajak_stnk} badge={asset.tanggal_pajak_stnk ? <StnkCountdown tanggal={asset.tanggal_pajak_stnk} label="Pajak" /> : undefined} />
                  <DetailRow label="Tanggal Ganti Plat" value={asset.tanggal_ganti_plat} badge={asset.tanggal_ganti_plat ? <StnkCountdown tanggal={asset.tanggal_ganti_plat} label="Ganti Plat" /> : undefined} />
                <DetailRow label="Status Sertifikasi" value={asset.status_sertifikasi} />
                <DetailRow label="Jenis Sertipikat" value={asset.jenis_sertipikat} />
                <DetailRow label="No Sertifikat" value={asset.no_sertifikat} />
                <DetailRow label="Nama" value={asset.nama} />
              </>
            )}
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
            {canWrite ? (
              <>
                <EditableCurrencyRow label="Nilai Perolehan Pertama" value={asset.nilai_perolehan_pertama} field="nilai_perolehan_pertama" onSave={handleFieldSave} />
                <EditableCurrencyRow label="Nilai Mutasi" value={asset.nilai_mutasi} field="nilai_mutasi" onSave={handleFieldSave} />
                <EditableCurrencyRow label="Nilai Perolehan" value={asset.nilai_perolehan} field="nilai_perolehan" onSave={handleFieldSave} />
                <EditableCurrencyRow label="Nilai Penyusutan" value={asset.nilai_penyusutan} field="nilai_penyusutan" onSave={handleFieldSave} />
                <EditableCurrencyRow label="Nilai Buku" value={asset.nilai_buku} field="nilai_buku" onSave={handleFieldSave} />
              </>
            ) : (
              <>
                <CurrencyRow label="Nilai Perolehan Pertama" value={asset.nilai_perolehan_pertama} />
                <CurrencyRow label="Nilai Mutasi" value={asset.nilai_mutasi} />
                <CurrencyRow label="Nilai Perolehan" value={asset.nilai_perolehan} />
                <CurrencyRow label="Nilai Penyusutan" value={asset.nilai_penyusutan} />
                <CurrencyRow label="Nilai Buku" value={asset.nilai_buku} />
              </>
            )}
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
          {canWrite ? (
            <>
              <EditableRow label="Status SBSN" value={asset.status_sbsn} field="status_sbsn" onSave={handleFieldSave} />
              <EditableRow label="Status BMN Idle" value={asset.status_bmn_idle} field="status_bmn_idle" onSave={handleFieldSave} />
              <EditableRow label="Status Kemitraan" value={asset.status_kemitraan} field="status_kemitraan" onSave={handleFieldSave} />
              <EditableRow label="BPYBDS" value={asset.bpybds} field="bpybds" onSave={handleFieldSave} />
              <EditableRow label="Usulan Barang Hilang" value={asset.usulan_barang_hilang} field="usulan_barang_hilang" onSave={handleFieldSave} />
              <EditableRow label="Usulan Barang RB" value={asset.usulan_barang_rb} field="usulan_barang_rb" onSave={handleFieldSave} />
              <EditableRow label="Usul Hapus" value={asset.usul_hapus} field="usul_hapus" onSave={handleFieldSave} />
              <EditableRow label="Hibah DKTP" value={asset.hibah_dktp} field="hibah_dktp" onSave={handleFieldSave} />
              <EditableRow label="Konsensi Jasa" value={asset.konsensi_jasa} field="konsensi_jasa" onSave={handleFieldSave} />
              <EditableRow label="Properti Investasi" value={asset.properti_investasi} field="properti_investasi" onSave={handleFieldSave} />
              <EditableRow label="Jenis Dokumen" value={asset.jenis_dokumen} field="jenis_dokumen" onSave={handleFieldSave} />
              <EditableRow label="No Dokumen" value={asset.no_dokumen} field="no_dokumen" onSave={handleFieldSave} />
              <EditableRow label="Status Penggunaan" value={asset.status_penggunaan} field="status_penggunaan" onSave={handleFieldSave} />
              <EditableRow label="No PSP" value={asset.no_psp} field="no_psp" onSave={handleFieldSave} />
              <EditableRow label="Tanggal PSP" value={asset.tanggal_psp} field="tanggal_psp" onSave={handleFieldSave} type="date" />
              <EditableRow label="Status PMK" value={asset.status_pmk} field="status_pmk" onSave={handleFieldSave} />
            </>
          ) : (
            <>
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
              <DetailRow label="Status Penggunaan" value={asset.status_penggunaan} />
              <DetailRow label="No PSP" value={asset.no_psp} />
              <DetailRow label="Tanggal PSP" value={asset.tanggal_psp} />
              <DetailRow label="Status PMK" value={asset.status_pmk} />
            </>
          )}
        </DetailSection>
      )}

      {activeTab === "lokasi" && (
        <DetailSection title="Lokasi" icon={<MapPin className="w-4 h-4" />}>
          {canWrite ? (
            <>
              <EditableRow label="Alamat" value={asset.alamat} field="alamat" onSave={handleFieldSave} />
              <EditableRow label="RT/RW" value={asset.rt_rw} field="rt_rw" onSave={handleFieldSave} />
              <EditableRow label="Kelurahan/Desa" value={asset.kelurahan_desa} field="kelurahan_desa" onSave={handleFieldSave} />
              <EditableRow label="Kecamatan" value={asset.kecamatan} field="kecamatan" onSave={handleFieldSave} />
              <EditableRow label="Kab/Kota" value={asset.kab_kota} field="kab_kota" onSave={handleFieldSave} />
              <DetailRow label="Kode Kab/Kota" value={asset.kode_kab_kota} />
              <EditableRow label="Provinsi" value={asset.provinsi} field="provinsi" onSave={handleFieldSave} />
              <DetailRow label="Kode Provinsi" value={asset.kode_provinsi} />
              <EditableRow label="Kode Pos" value={asset.kode_pos} field="kode_pos" onSave={handleFieldSave} />
              <EditableSelectRow label="Lokasi Ruang" value={asset.lokasi_ruang} field="lokasi_ruang" onSave={handleFieldSave} options={LOKASI_RUANG_OPTIONS} />
              <EditableRow label="SBSK" value={asset.sbsk} field="sbsk" onSave={handleFieldSave} />
              <EditableRow label="Optimalisasi" value={asset.optimalisasi} field="optimalisasi" onSave={handleFieldSave} />
              <EditableEmployeeRow label="Penghuni" value={asset.penghuni} field="penghuni" onSave={handleFieldSave} employees={employees} />
              <EditableEmployeeRow label="Pengguna" value={asset.pengguna} field="pengguna" onSave={handleFieldSave} employees={employees} />
              <EditableEmployeeRow label="Nama Pengguna" value={asset.nama_pengguna} field="nama_pengguna" onSave={handleFieldSave} employees={employees} />
            </>
          ) : (
            <>
              <DetailRow label="Alamat" value={asset.alamat} />
              <DetailRow label="RT/RW" value={asset.rt_rw} />
              <DetailRow label="Kelurahan/Desa" value={asset.kelurahan_desa} />
              <DetailRow label="Kecamatan" value={asset.kecamatan} />
              <DetailRow label="Kab/Kota" value={asset.kab_kota} />
              <DetailRow label="Kode Kab/Kota" value={asset.kode_kab_kota} />
              <DetailRow label="Provinsi" value={asset.provinsi} />
              <DetailRow label="Kode Provinsi" value={asset.kode_provinsi} />
              <DetailRow label="Kode Pos" value={asset.kode_pos} />
              <DetailRow label="Lokasi Ruang" value={asset.lokasi_ruang} />
              <DetailRow label="SBSK" value={asset.sbsk} />
              <DetailRow label="Optimalisasi" value={asset.optimalisasi} />
              <DetailRow label="Penghuni" value={asset.penghuni} />
              <DetailRow label="Pengguna" value={asset.pengguna} />
              <DetailRow label="Nama Pengguna" value={asset.nama_pengguna} />
            </>
          )}
        </DetailSection>
      )}

      {activeTab === "organisasi" && (
        <DetailSection title="Organisasi" icon={<UserCheck className="w-4 h-4" />}>
          <DetailRow label="Kode Satker" value={asset.kode_satker} />
          <DetailRow label="Nama Satker" value={asset.nama_satker} />
          <DetailRow label="Kode KPKNL" value={asset.kode_kpknl} />
          <DetailRow label="Uraian KPKNL" value={asset.uraian_kpknl} />
          <DetailRow label="Uraian Kanwil DJKN" value={asset.uraian_kanwil_djkn} />
          <DetailRow label="Nama K/L" value={asset.nama_kl} />
          <DetailRow label="Nama E1" value={asset.nama_e1} />
          <DetailRow label="Nama Korwil" value={asset.nama_korwil} />
          <DetailRow label="Kode Register" value={asset.kode_register} />
        </DetailSection>
      )}

      {activeTab === "riwayat" && (
        <HistoryTab updates={asset.history_updates || []} />
      )}
      </div>
    </div>
  );
}

function QuickStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="p-3 rounded-xl bg-zinc-50/80 dark:bg-zinc-800/50">
      <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">{label}</p>
      <p className="text-sm font-bold text-zinc-800 dark:text-zinc-200 mt-0.5 truncate">{String(value)}</p>
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
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700 dark:text-red-400">
        🚨 {label} expired {Math.abs(diffDays)} hari lalu
      </span>
    );
  }
  if (diffDays <= 30) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 dark:text-amber-400">
        ⚠️ {diffDays} hari lagi
      </span>
    );
  }
  if (diffDays <= 90) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700 dark:text-blue-400">
        {diffDays} hari lagi
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600">
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

function HistoryTab({ updates }: { updates: HistoryUpdate[] }) {
  if (updates.length === 0) {
    return (
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-8 text-center">
        <History className="w-10 h-10 mx-auto mb-3 text-zinc-300 dark:text-zinc-600" />
        <p className="text-sm text-zinc-400">Belum ada riwayat perubahan untuk aset ini.</p>
        <p className="text-xs text-zinc-300 dark:text-zinc-500 mt-1">Perubahan akan tercatat saat field diedit.</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden">
      <div className="px-5 py-3.5 border-b border-zinc-100 dark:border-zinc-800 bg-gradient-to-r from-zinc-50 dark:from-zinc-800/50 to-white dark:to-zinc-900 flex items-center gap-2.5">
        <span className="p-1.5 rounded-lg bg-violet-50 dark:bg-violet-500/10 text-violet-600"><History className="w-4 h-4" /></span>
        <h3 className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">Riwayat Perubahan</h3>
        <span className="ml-auto text-[10px] text-zinc-400">{updates.length} perubahan</span>
      </div>
      <div className="divide-y divide-zinc-50 dark:divide-zinc-800/50 max-h-[400px] overflow-y-auto">
        {updates.map((update) => (
          <div key={update.id} className="px-5 py-3 hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 transition-colors">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-bold text-violet-600 bg-violet-50 dark:bg-violet-500/10 px-1.5 py-0.5 rounded">{update.field_changed}</span>
                  <span className="text-[9px] text-zinc-400">oleh {update.author?.name || "System"}</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-red-500 line-through wrap-break-word whitespace-pre-wrap max-w-full">{update.old_value || "—"}</span>
                  <span className="text-zinc-300 dark:text-zinc-600">→</span>
                  <span className="text-emerald-600 font-medium wrap-break-word whitespace-pre-wrap max-w-full">{update.new_value || "—"}</span>
                </div>
                {update.alasan_perubahan && (
                  <p className="text-[10px] text-zinc-400 mt-1 italic">{update.alasan_perubahan}</p>
                )}
              </div>
              <span className="text-[9px] text-zinc-400 shrink-0">
                {new Date(update.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
