"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, Loader2, CheckCircle2, Camera } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const JENIS_BMN_OPTIONS = [
  "ALAT ANGKUTAN BERMOTOR",
  "ALAT BESAR",
  "ALAT PERSENJATAAN",
  "BANGUNAN AIR",
  "BANGUNAN DAN GEDUNG",
  "MESIN PERALATAN KHUSUS TIK",
  "MESIN PERALATAN NON TIK",
  "RUMAH NEGARA",
  "TANAH",
];

const KONDISI_OPTIONS = ["Baik", "Rusak Ringan", "Rusak Berat"];

const LOKASI_RUANG_OPTIONS = [
  // Kantor Balai
  "Kantor Balai KSDA Kalimantan Timur",
  "Urusan Umum dan Perlengkapan",
  "Urusan Kepegawaian",
  "Urusan Program dan Perencanaan",
  "Urusan Keuangan",
  "Urusan Evlab",
  "Urusan Teknis",
  "Urusan Perlindungan",
  "Urusan IKN",
  // Wilayah I
  "Seksi KSDA Wilayah I (Berau)",
  "Resor 01. Berau",
  "Resor 02. Pulau Semama dan Pulau Sangalaki",
  "Resor 03. Tanjung Selor",
  "Resor 04. Tarakan",
  // Wilayah II
  "Seksi KSDA Wilayah II (Tenggarong)",
  "Resor 05. Samarinda",
  "Resor 06. Padang Luway",
  "Resor 07. Muara Kaman Sedulang",
  "Resor 08. Sangatta",
  "Resor 09. Suaka Badak Kelian",
  // Wilayah III
  "Seksi KSDA Wilayah III (Balikpapan)",
  "Resor 10. Balikpapan",
  "Resor 11. Teluk Adang",
  "Resor 12. Teluk Apar",
  "Resor 13. Paser",
  "Resor 14. Ibu Kota Nusantara",
];

// Locked org fields
const ORG_DEFAULTS = {
  kode_satker: "143041600693614000KD",
  nama_satker: "Balai KSDA Kalimantan Timur",
  kode_kpknl: "13102",
  uraian_kpknl: "KPKNL SAMARINDA",
  uraian_kanwil_djkn: "KANTOR WILAYAH DJKN KALIMANTAN TIMUR DAN UTARA",
  nama_kl: "KEMENTERIAN KEHUTANAN",
  nama_e1: "Direktorat Jenderal Konservasi SDA dan Ekosistem",
  nama_korwil: "Wil. Prov. Kalimantan Timur",
};

const STEPS = [
  { id: "identitas", label: "Identitas" },
  { id: "detail", label: "Detail Spesifik" },
  { id: "nilai", label: "Nilai & Tanggal" },
  { id: "lokasi", label: "Lokasi" },
  { id: "foto", label: "Foto" },
];

type FormData = Record<string, string | number | null>;

function getMode(jenis: string): "kendaraan" | "tanah" | "bangunan" | "peralatan" {
  if (jenis === "ALAT ANGKUTAN BERMOTOR") return "kendaraan";
  if (jenis === "TANAH") return "tanah";
  if (["BANGUNAN DAN GEDUNG", "RUMAH NEGARA", "BANGUNAN AIR"].includes(jenis)) return "bangunan";
  return "peralatan";
}

function isRumahNegara(jenis: string) { return jenis === "RUMAH NEGARA"; }
function hasTipe(jenis: string) { return ["ALAT BESAR", "MESIN PERALATAN NON TIK", "BANGUNAN DAN GEDUNG", "RUMAH NEGARA"].includes(jenis); }

export default function BmnCreateAssetPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<FormData>({
    jenis_bmn: "",
    kode_barang: "",
    nup: "",
    nup_lama: "",
    nama_barang: "",
    kondisi: "Baik",
    status_bmn: "Aktif",
    intra_extra: "Intra",
    merk: "",
    tipe: "",
    no_polisi: "",
    no_stnk: "",
    no_bpkb: "",
    no_dokumen: "",
    jenis_dokumen: "",
    status_sertifikasi: "",
    jenis_sertipikat: "",
    no_sertifikat: "",
    nama: "",
    penghuni: "",
    pengguna: "",
    no_identitas: "",
    status_pmk: "",
    nilai_perolehan: 0,
    nilai_buku: 0,
    tanggal_perolehan: "",
    tanggal_buku_pertama: "",
    luas_tanah_seluruhnya: 0,
    luas_tanah_bangunan: 0,
    luas_tanah_sarana: 0,
    luas_lahan_kosong: 0,
    luas_bangunan: 0,
    luas_tapak_bangunan: 0,
    jumlah_lantai: 0,
    alamat: "",
    rt_rw: "",
    kelurahan_desa: "",
    kecamatan: "",
    kab_kota: "",
    provinsi: "KALIMANTAN TIMUR",
    kode_pos: "",
    lokasi_ruang: "",
    status_penggunaan: "",
    nama_pengguna: "",
    foto_geotag_url: "",
    tanggal_pajak_stnk: "",
    tanggal_ganti_plat: "",
  });

  const [photoFiles, setPhotoFiles] = useState<{ depan: File | null; belakang: File | null; kiri: File | null; kanan: File | null }>({
    depan: null, belakang: null, kiri: null, kanan: null,
  });

  const set = (key: string, value: string | number) => setForm(prev => ({ ...prev, [key]: value }));
  const mode = getMode(form.jenis_bmn as string);

  const handleSave = async () => {
    if (!form.jenis_bmn || !form.kode_barang || !form.nup || !form.nama_barang) {
      toast.error("Jenis BMN, Kode Barang, NUP, dan Nama Barang wajib diisi.");
      setStep(0);
      return;
    }
    setSaving(true);
    try {
      // Auto-fill defaults
      const payload: FormData = { ...form, ...ORG_DEFAULTS };
      
      // Auto-calculate tahun_perolehan from tanggal_perolehan
      if (form.tanggal_perolehan) {
        payload.tahun_perolehan = new Date(form.tanggal_perolehan as string).getFullYear();
      }
      // Auto-fill nilai_perolehan_pertama = nilai_perolehan if not set
      if (form.nilai_perolehan && !form.nilai_perolehan_pertama) {
        payload.nilai_perolehan_pertama = form.nilai_perolehan;
      }
      // Auto-fill "Tidak" defaults
      const tidakDefaults = ['henti_guna', 'status_kemitraan', 'bpybds', 'usulan_barang_hilang', 'usulan_barang_rb', 'usul_hapus', 'hibah_dktp', 'konsensi_jasa', 'properti_investasi'];
      tidakDefaults.forEach(f => { if (!payload[f]) payload[f] = "Tidak"; });
      // nama = merk if not set
      if (!payload.nama && payload.merk) payload.nama = payload.merk;
      // merk_tipe = merk + tipe combined
      const merkVal = (payload.merk as string) || '';
      const tipeVal = (payload.tipe as string) || '';
      payload.merk_tipe = [merkVal, tipeVal].filter(Boolean).join(' ') || null;

      const res = await api.post("/bmn/assets", payload);
      const assetId = res.data?.data?.id;

      // Upload photos if any
      if (assetId) {
        const photoTypes = ['depan', 'belakang', 'kiri', 'kanan'] as const;
        for (const type of photoTypes) {
          const file = photoFiles[type];
          if (file) {
            const fd = new FormData();
            fd.append("photo", file);
            fd.append("type", type);
            try {
              await api.post(`/bmn/assets/${assetId}/photo`, fd, {
                headers: { "Content-Type": "multipart/form-data" },
              });
            } catch {
              // Non-blocking: photo upload failure doesn't block asset creation
            }
          }
        }
      }

      toast.success("Aset BMN berhasil didaftarkan.");
      router.push("/bmn/assets");
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string; error?: string } } };
      toast.error(e.response?.data?.message || e.response?.data?.error || "Gagal menyimpan aset.");
    } finally { setSaving(false); }
  };

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/bmn/assets" className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-500">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-slate-900">Tambah Aset BMN</h1>
          <p className="text-sm text-slate-500">Pendaftaran aset baru ke dalam sistem.</p>
        </div>
      </div>

      {/* Stepper */}
      <div className="flex items-center gap-1 bg-white rounded-xl ring-1 ring-slate-200/60 p-1">
        {STEPS.map((s, i) => (
          <button
            key={s.id}
            onClick={() => setStep(i)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all flex-1 justify-center",
              step === i ? "bg-emerald-600 text-white" : i < step ? "text-emerald-600 bg-emerald-50" : "text-slate-400"
            )}
          >
            {i < step ? <CheckCircle2 className="w-3.5 h-3.5" /> : <span className="w-5 h-5 rounded-full border-2 flex items-center justify-center text-[10px] font-bold">{i + 1}</span>}
            {s.label}
          </button>
        ))}
      </div>

      {/* Form Content */}
      <div className="bg-white rounded-2xl ring-1 ring-slate-200/60 p-6 min-h-[400px]">
        {step === 0 && (
          <div className="space-y-5">
            <h2 className="text-sm font-bold text-slate-700 mb-4">Identitas Aset</h2>
            <Field label="Jenis BMN *" value={form.jenis_bmn as string} onChange={v => set("jenis_bmn", v)} type="select" options={JENIS_BMN_OPTIONS} />
            <div className="grid grid-cols-2 gap-4">
              <Field label="Kode Barang *" value={form.kode_barang as string} onChange={v => set("kode_barang", v)} placeholder="3010312003" />
              <Field label="NUP *" value={form.nup as string} onChange={v => set("nup", v)} placeholder="1" />
            </div>
            <Field label="NUP Lama (opsional)" value={form.nup_lama as string} onChange={v => set("nup_lama", v)} placeholder="NUP sebelumnya jika ada" />
            <Field label="Nama Barang *" value={form.nama_barang as string} onChange={v => set("nama_barang", v)} placeholder="Sepeda Motor Patroli" />
            <div className="grid grid-cols-2 gap-4">
              <Field label="Kondisi" value={form.kondisi as string} onChange={v => set("kondisi", v)} type="select" options={KONDISI_OPTIONS} />
              <Field label="Status BMN" value={form.status_bmn as string} onChange={v => set("status_bmn", v)} placeholder="Aktif" />
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-5">
            <h2 className="text-sm font-bold text-slate-700 mb-4">Detail Spesifik — {form.jenis_bmn || "Pilih Jenis BMN dulu"}</h2>

            {mode === "kendaraan" && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Merk" value={form.merk as string} onChange={v => { set("merk", v); set("nama", v); }} placeholder="Honda CRF 150L" />
                  <Field label="Tipe" value={form.tipe as string} onChange={v => set("tipe", v)} placeholder="CRF 150L" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="No Polisi" value={form.no_polisi as string} onChange={v => set("no_polisi", v)} placeholder="KT 1234 AB" />
                  <Field label="No STNK" value={form.no_stnk as string} onChange={v => set("no_stnk", v)} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="No BPKB" value={form.no_bpkb as string} onChange={v => set("no_bpkb", v)} />
                  <Field label="No Dokumen" value={form.no_dokumen as string} onChange={v => set("no_dokumen", v)} />
                </div>
                <Field label="No Sertifikat" value={form.no_sertifikat as string} onChange={v => set("no_sertifikat", v)} />
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Tanggal Pajak STNK" value={form.tanggal_pajak_stnk as string} onChange={v => set("tanggal_pajak_stnk", v)} type="date" />
                  <Field label="Tanggal Ganti Plat" value={form.tanggal_ganti_plat as string} onChange={v => set("tanggal_ganti_plat", v)} type="date" />
                </div>
              </>
            )}

            {mode === "tanah" && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Luas Tanah Seluruhnya (m²)" value={form.luas_tanah_seluruhnya as number} onChange={v => set("luas_tanah_seluruhnya", Number(v))} type="number" />
                  <Field label="Luas Tanah Untuk Bangunan (m²)" value={form.luas_tanah_bangunan as number} onChange={v => set("luas_tanah_bangunan", Number(v))} type="number" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Luas Tanah Untuk Sarana Lingkungan (m²)" value={form.luas_tanah_sarana as number} onChange={v => set("luas_tanah_sarana", Number(v))} type="number" />
                  <Field label="Luas Lahan Kosong (m²)" value={form.luas_lahan_kosong as number} onChange={v => set("luas_lahan_kosong", Number(v))} type="number" />
                </div>
                <Field label="Luas Bangunan (m²)" value={form.luas_bangunan as number} onChange={v => set("luas_bangunan", Number(v))} type="number" />
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Jenis Dokumen" value={form.jenis_dokumen as string} onChange={v => set("jenis_dokumen", v)} placeholder="Sertifikat" />
                  <Field label="No Dokumen / No Sertifikat" value={form.no_sertifikat as string} onChange={v => { set("no_sertifikat", v); set("no_dokumen", v); }} placeholder="16010607400505" />
                </div>
                <Field label="Status Sertifikasi" value={form.status_sertifikasi as string} onChange={v => set("status_sertifikasi", v)} placeholder="Bersertipikat atas nama Pemerintah RI" />
              </>
            )}

            {mode === "bangunan" && (
              <>
                {hasTipe(form.jenis_bmn as string) && (
                  <Field label="Tipe" value={form.tipe as string} onChange={v => set("tipe", v)} placeholder="Permanen / Semi Permanen" />
                )}
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Luas Tanah Seluruhnya (m²)" value={form.luas_tanah_seluruhnya as number} onChange={v => set("luas_tanah_seluruhnya", Number(v))} type="number" />
                  <Field label="Luas Lahan Kosong (m²)" value={form.luas_lahan_kosong as number} onChange={v => set("luas_lahan_kosong", Number(v))} type="number" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Luas Bangunan (m²)" value={form.luas_bangunan as number} onChange={v => set("luas_bangunan", Number(v))} type="number" />
                  <Field label="Luas Tapak Bangunan (m²)" value={form.luas_tapak_bangunan as number} onChange={v => set("luas_tapak_bangunan", Number(v))} type="number" />
                </div>
                {(form.jenis_bmn !== "BANGUNAN AIR") && (
                  <Field label="Jumlah Lantai" value={form.jumlah_lantai as number} onChange={v => set("jumlah_lantai", Number(v))} type="number" />
                )}
                {isRumahNegara(form.jenis_bmn as string) && (
                  <>
                    <h3 className="text-xs font-bold text-slate-500 uppercase mt-4 pt-4 border-t">Penghuni Rumah Negara</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <Field label="Penghuni" value={form.penghuni as string} onChange={v => set("penghuni", v)} />
                      <Field label="Pengguna" value={form.pengguna as string} onChange={v => set("pengguna", v)} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <Field label="Nama Pengguna" value={form.nama_pengguna as string} onChange={v => set("nama_pengguna", v)} />
                      <Field label="No Identitas" value={form.no_identitas as string} onChange={v => set("no_identitas", v)} />
                    </div>
                    <Field label="Status PMK" value={form.status_pmk as string} onChange={v => set("status_pmk", v)} />
                  </>
                )}
              </>
            )}

            {mode === "peralatan" && (
              <>
                <Field label="Merk" value={form.merk as string} onChange={v => { set("merk", v); set("nama", v); }} placeholder="Caterpillar / Canon / HP" />
                {hasTipe(form.jenis_bmn as string) && (
                  <Field label="Tipe" value={form.tipe as string} onChange={v => set("tipe", v)} placeholder="320D / EOS R5" />
                )}
              </>
            )}
          </div>
        )}

        {step === 2 && (
          <div className="space-y-5">
            <h2 className="text-sm font-bold text-slate-700 mb-4">Nilai & Tanggal</h2>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Nilai Perolehan (Rp)" value={form.nilai_perolehan as number} onChange={v => set("nilai_perolehan", Number(v))} type="currency" />
              <Field label="Nilai Buku (Rp)" value={form.nilai_buku as number} onChange={v => set("nilai_buku", Number(v))} type="currency" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Tanggal Perolehan" value={form.tanggal_perolehan as string} onChange={v => set("tanggal_perolehan", v)} type="date" />
              <Field label="Tanggal Buku Pertama" value={form.tanggal_buku_pertama as string} onChange={v => set("tanggal_buku_pertama", v)} type="date" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Status Penggunaan" value={form.status_penggunaan as string} onChange={v => set("status_penggunaan", v)} placeholder="Digunakan sendiri untuk operasional" />
              <Field label="Intra / Extra" value={form.intra_extra as string} onChange={v => set("intra_extra", v)} type="select" options={["Intra", "Extra"]} />
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-5">
            <h2 className="text-sm font-bold text-slate-700 mb-4">Lokasi Penempatan</h2>
            <Field label="Alamat" value={form.alamat as string} onChange={v => set("alamat", v)} placeholder="Jl. Rimbawan III" />
            <div className="grid grid-cols-3 gap-4">
              <Field label="RT/RW" value={form.rt_rw as string} onChange={v => set("rt_rw", v)} placeholder="01/02" />
              <Field label="Kelurahan/Desa" value={form.kelurahan_desa as string} onChange={v => set("kelurahan_desa", v)} />
              <Field label="Kecamatan" value={form.kecamatan as string} onChange={v => set("kecamatan", v)} />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <Field label="Kab/Kota" value={form.kab_kota as string} onChange={v => set("kab_kota", v)} placeholder="KOTA SAMARINDA" />
              <Field label="Provinsi" value={form.provinsi as string} onChange={v => set("provinsi", v)} />
              <Field label="Kode Pos" value={form.kode_pos as string} onChange={v => set("kode_pos", v)} />
            </div>
            <Field label="Lokasi Ruang" value={form.lokasi_ruang as string} onChange={v => set("lokasi_ruang", v)} type="select" options={LOKASI_RUANG_OPTIONS} />
          </div>
        )}

        {step === 4 && (
          <div className="space-y-5">
            <h2 className="text-sm font-bold text-slate-700 mb-4">Foto Aset</h2>
            <Field label="Link Foto Geotag (Google Drive)" value={form.foto_geotag_url as string} onChange={v => set("foto_geotag_url", v)} placeholder="https://drive.google.com/file/d/..." />
            <div className="grid grid-cols-2 gap-4">
              <PhotoInput label="Foto Tampak Depan" value={photoFiles.depan} onChange={(f) => setPhotoFiles(prev => ({ ...prev, depan: f }))} />
              <PhotoInput label="Foto Tampak Belakang" value={photoFiles.belakang} onChange={(f) => setPhotoFiles(prev => ({ ...prev, belakang: f }))} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <PhotoInput label="Foto Tampak Kiri" value={photoFiles.kiri} onChange={(f) => setPhotoFiles(prev => ({ ...prev, kiri: f }))} />
              <PhotoInput label="Foto Tampak Kanan" value={photoFiles.kanan} onChange={(f) => setPhotoFiles(prev => ({ ...prev, kanan: f }))} />
            </div>
            <p className="text-xs text-slate-400">Format: JPG, PNG, WebP. Maks 5MB per foto. Foto opsional — bisa diupload nanti di halaman detail.</p>
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0} className="rounded-xl">
          Sebelumnya
        </Button>
        <div className="flex gap-2">
          {step < STEPS.length - 1 ? (
            <Button onClick={() => setStep(step + 1)} className="rounded-xl bg-emerald-600 hover:bg-emerald-500">
              Selanjutnya
            </Button>
          ) : (
            <Button onClick={handleSave} disabled={saving} className="rounded-xl bg-emerald-600 hover:bg-emerald-500 gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Simpan Aset
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// Reusable field component
function Field({ label, value, onChange, type = "text", placeholder, options }: {
  label: string; value: string | number; onChange: (v: string) => void;
  type?: "text" | "number" | "date" | "select" | "textarea" | "currency"; placeholder?: string; options?: string[];
}) {
  if (type === "select" && options) {
    return (
      <div className="space-y-1.5">
        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">{label}</label>
        <select value={String(value)} onChange={e => onChange(e.target.value)} className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500">
          <option value="">Pilih...</option>
          {options.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      </div>
    );
  }
  if (type === "textarea") {
    return (
      <div className="space-y-1.5">
        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">{label}</label>
        <textarea value={String(value || "")} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={3} className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 resize-none" />
      </div>
    );
  }
  if (type === "currency") {
    const numVal = Number(value) || 0;
    const displayVal = numVal === 0 ? "" : numVal.toLocaleString("id-ID");
    return (
      <div className="space-y-1.5">
        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">{label}</label>
        <div className="flex items-center h-10 px-3 rounded-xl border border-slate-200 bg-white focus-within:ring-2 focus-within:ring-emerald-500/20 focus-within:border-emerald-500">
          <span className="text-xs text-slate-400 mr-2">Rp</span>
          <input
            type="text"
            value={displayVal}
            onChange={e => { const raw = e.target.value.replace(/\D/g, ""); onChange(raw); }}
            placeholder={placeholder || "0"}
            className="flex-1 text-sm bg-transparent outline-none"
          />
        </div>
      </div>
    );
  }
  return (
    <div className="space-y-1.5">
      <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">{label}</label>
      <input type={type} value={String(value || "")} onChange={e => onChange(e.target.value)} placeholder={placeholder} className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" />
    </div>
  );
}

function PhotoInput({ label, value, onChange }: { label: string; value: File | null; onChange: (f: File | null) => void }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">{label}</label>
      <div className="relative">
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={(e) => onChange(e.target.files?.[0] || null)}
          className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 file:text-emerald-600 file:font-semibold file:mr-3 file:border-0 file:bg-transparent"
        />
        {value && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-emerald-600 font-medium flex items-center gap-1">
            <Camera className="w-3 h-3" /> {value.name.slice(0, 15)}...
          </span>
        )}
      </div>
    </div>
  );
}
