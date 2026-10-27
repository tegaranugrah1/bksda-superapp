"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Save,
  Image as ImageIcon,
  X,
  ChevronDown,
  UserPlus,
  ShieldCheck,
  Briefcase,
  UserCheck,
  Upload,
  Trash2,
  ShieldAlert,
} from "lucide-react";
import Image from "next/image";
import { api } from "@/lib/api";
import Link from "next/link";
import { toast } from "sonner";
import { useRole } from "@/hooks/useRole";
import {
  SATUAN_KERJA_OPTIONS as SATUAN_KERJA,
  PANGKAT_PNS_OPTIONS,
  PANGKAT_PPPK_OPTIONS,
  JENIS_PEGAWAI_OPTIONS,
  detectJenisFromNipInput,
  buildMmpDefaultJabatan,
  isAutoMmpJabatan,
  type JenisPegawai,
} from "../../_lib";

const CATEGORY_STYLES: Record<
  JenisPegawai,
  {
    icon: typeof ShieldCheck;
    activeCard: string;
    iconBadge: string;
    dot: string;
  }
> = {
  PNS: {
    icon: ShieldCheck,
    activeCard:
      "bg-blue-50/70 dark:bg-blue-500/10 border-blue-600 dark:border-blue-500 ring-2 ring-blue-500/15",
    iconBadge:
      "bg-blue-600/10 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400 border-blue-200/60 dark:border-blue-500/20",
    dot: "bg-blue-600",
  },
  PPPK: {
    icon: Briefcase,
    activeCard:
      "bg-amber-50/70 dark:bg-amber-500/10 border-amber-500 dark:border-amber-500 ring-2 ring-amber-500/15",
    iconBadge:
      "bg-amber-500/10 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400 border-amber-200/60 dark:border-amber-500/20",
    dot: "bg-amber-500",
  },
  MMP: {
    icon: UserCheck,
    activeCard:
      "bg-emerald-50/70 dark:bg-emerald-500/10 border-emerald-600 dark:border-emerald-500 ring-2 ring-emerald-500/15",
    iconBadge:
      "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400 border-emerald-200/60 dark:border-emerald-500/20",
    dot: "bg-emerald-600",
  },
};

export default function EmployeeCreatePage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { canWrite } = useRole();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [jenisPegawai, setJenisPegawai] = useState<JenisPegawai>("PNS");

  const [formData, setFormData] = useState({
    nip: "",
    nama_lengkap: "",
    jabatan: "",
    pangkat_golongan: "",
    satuan_kerja: "",
    is_active: "1",
  });

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const handleJenisChange = (nextJenis: JenisPegawai) => {
    setJenisPegawai(nextJenis);
    setFormData((prev) => {
      if (nextJenis === "MMP") {
        return {
          ...prev,
          nip: "",
          pangkat_golongan: "",
          jabatan: isAutoMmpJabatan(prev.jabatan)
            ? buildMmpDefaultJabatan(prev.satuan_kerja)
            : prev.jabatan,
        };
      }

      const validPangkat =
        nextJenis === "PPPK" ? PANGKAT_PPPK_OPTIONS : PANGKAT_PNS_OPTIONS;
      return {
        ...prev,
        pangkat_golongan: validPangkat.includes(prev.pangkat_golongan)
          ? prev.pangkat_golongan
          : "",
        jabatan: isAutoMmpJabatan(prev.jabatan) ? "" : prev.jabatan,
      };
    });
  };

  const handleNipChange = (val: string) => {
    const detected = detectJenisFromNipInput(val);
    if (detected === "MMP") {
      handleJenisChange("MMP");
      return;
    }
    if (detected && detected !== jenisPegawai) {
      setJenisPegawai(detected);
      const validPangkat =
        detected === "PPPK" ? PANGKAT_PPPK_OPTIONS : PANGKAT_PNS_OPTIONS;
      setFormData((prev) => ({
        ...prev,
        nip: val,
        pangkat_golongan: validPangkat.includes(prev.pangkat_golongan)
          ? prev.pangkat_golongan
          : "",
      }));
      return;
    }
    setFormData((prev) => ({ ...prev, nip: val }));
  };

  const handleSatkerChange = (val: string) => {
    setFormData((prev) => ({
      ...prev,
      satuan_kerja: val,
      jabatan:
        jenisPegawai === "MMP" && isAutoMmpJabatan(prev.jabatan)
          ? buildMmpDefaultJabatan(val)
          : prev.jabatan,
    }));
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!validTypes.includes(file.type)) {
      setErrorMsg("Gagal: Format foto wajib berupa JPG, PNG, atau WEBP.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setErrorMsg("Gagal: Ukuran foto melampaui batas maksimal 10 MB.");
      return;
    }

    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setErrorMsg(null);
    setPhotoFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const clearPhoto = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPhotoFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const mutation = useMutation({
    mutationFn: async () => {
      const payload = new FormData();
      payload.append("jenis_pegawai", jenisPegawai);
      if (jenisPegawai !== "MMP") {
        payload.append("nip", formData.nip.trim());
      }
      payload.append("nama_lengkap", formData.nama_lengkap.trim());
      if (formData.jabatan.trim()) payload.append("jabatan", formData.jabatan.trim());
      if (jenisPegawai !== "MMP" && formData.pangkat_golongan) {
        payload.append("pangkat_golongan", formData.pangkat_golongan);
      }
      if (formData.satuan_kerja) payload.append("satuan_kerja", formData.satuan_kerja);
      payload.append("is_active", formData.is_active);

      if (photoFile) {
        payload.append("foto", photoFile);
      }

      const { data } = await api.post("/kepegawaian/employees", payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      queryClient.invalidateQueries({ queryKey: ["kepegawaian-dashboard-stats"] });
      toast.success("Pegawai berhasil ditambahkan!");
      router.push("/kepegawaian/employees");
    },
    onError: (error: { response?: { data?: { message?: string } } }) => {
      setErrorMsg(
        error.response?.data?.message || "Koneksi terputus. Gagal menyimpan data ke server."
      );
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canWrite) return;
    mutation.mutate();
  };

  if (!canWrite) {
    return (
      <div className="p-5 md:p-7">
        <div className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800/80 rounded-2xl p-8 text-center space-y-4 shadow-2xs">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-200/60 dark:border-rose-500/20 flex items-center justify-center mx-auto">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Akses Terbatas
            </h2>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
              Hanya Administrator Kepegawaian yang memiliki izin untuk menambahkan data personil baru.
            </p>
          </div>
          <Link
            href="/kepegawaian/employees"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 text-white dark:bg-white dark:text-zinc-900 text-xs font-bold"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali ke Daftar Pegawai</span>
          </Link>
        </div>
      </div>
    );
  }

  const activePangkatOptions =
    jenisPegawai === "PPPK" ? PANGKAT_PPPK_OPTIONS : PANGKAT_PNS_OPTIONS;

  return (
    <div className="w-full p-5 md:p-7 space-y-5 text-slate-900 dark:text-zinc-100">
      {/* 1. Unified Clean Enterprise Header Bar */}
      <div className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800/80 rounded-2xl p-4 md:px-6 md:py-4 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-blue-600/10 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400 border border-blue-200/60 dark:border-blue-500/20 flex items-center justify-center shrink-0">
            <UserPlus className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-blue-600 dark:text-blue-400">
              SDM &amp; Kepegawaian
            </span>
            <h1 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              Tambah Pegawai Baru
            </h1>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
              Input data personil PNS, PPPK (P3K), atau Masyarakat Mitra Polhut (MMP).
            </p>
          </div>
        </div>

        <Link
          href="/kepegawaian/employees"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200/80 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 text-xs font-bold transition-colors shrink-0 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Daftar</span>
        </Link>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200/80 dark:border-rose-500/20 text-rose-700 dark:text-rose-300 text-xs font-semibold flex items-center justify-between gap-3">
          <span>{errorMsg}</span>
          <button
            type="button"
            onClick={() => setErrorMsg(null)}
            className="p-1 rounded-lg hover:bg-rose-100 dark:hover:bg-rose-950 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 2. Form Layout: Left (Pas Foto Card) + Right (Biodata Card) */}
      <form
        onSubmit={handleSubmit}
        className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start"
      >
        {/* Left Card: Pas Foto (4 cols) */}
        <div className="lg:col-span-4 bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800/80 rounded-2xl p-5 shadow-2xs flex flex-col items-center text-center space-y-4">
          <div className="w-full flex items-center justify-between border-b border-slate-100 dark:border-zinc-800/80 pb-3">
            <div className="text-left">
              <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Pas Foto Pegawai
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                Opsional • JPG, PNG, WEBP (Maks 10 MB)
              </p>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300">
              Rasio 3:4
            </span>
          </div>

          {previewUrl ? (
            <div className="w-full space-y-3">
              <div className="relative aspect-3/4 w-full max-w-[210px] mx-auto rounded-2xl overflow-hidden border border-slate-200 dark:border-zinc-800 shadow-sm">
                <Image src={previewUrl} alt="Preview Foto Pegawai" fill className="object-cover" unoptimized />
              </div>
              <div className="flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200/80 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 text-xs font-bold transition-colors cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Ganti Foto</span>
                </button>
                <button
                  type="button"
                  onClick={clearPhoto}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-500/10 dark:hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-200/60 dark:border-rose-800/50 text-xs font-bold transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Hapus</span>
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="aspect-3/4 w-full max-w-[210px] mx-auto rounded-2xl border-2 border-dashed border-slate-200 dark:border-zinc-800 hover:border-blue-500 hover:bg-blue-50/30 dark:hover:bg-blue-500/5 flex flex-col items-center justify-center gap-3 p-4 cursor-pointer transition-all group"
            >
              <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-zinc-800 flex items-center justify-center group-hover:bg-blue-100 dark:group-hover:bg-blue-950 transition-colors">
                <ImageIcon className="w-6 h-6 text-slate-400 group-hover:text-blue-600 transition-colors" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-700 dark:text-zinc-300 group-hover:text-blue-600 transition-colors">
                  Klik untuk Unggah Foto
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Tersimpan otomatis ke penyimpanan S3 / RustFS
                </p>
              </div>
            </button>
          )}

          <input
            type="file"
            ref={fileInputRef}
            onChange={handlePhotoChange}
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
          />
        </div>

        {/* Right Card: Form Biodata & Penempatan (8 cols) */}
        <div className="lg:col-span-8 bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800/80 rounded-2xl p-5 md:p-6 shadow-2xs space-y-6">
          {/* Kategori / Jenis Pegawai */}
          <div className="space-y-2.5">
            <label className="block text-[11px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">
              Kategori / Jenis Pegawai <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {JENIS_PEGAWAI_OPTIONS.map((opt) => {
                const isSelected = jenisPegawai === opt.value;
                const style = CATEGORY_STYLES[opt.value];
                const Icon = style.icon;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => handleJenisChange(opt.value)}
                    className={`flex flex-col items-start p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                      isSelected
                        ? style.activeCard
                        : "bg-slate-50/60 dark:bg-zinc-800/40 border-slate-200/80 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700"
                    }`}
                  >
                    <div className="flex items-center justify-between w-full mb-1.5">
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-7 h-7 rounded-lg border flex items-center justify-center shrink-0 ${style.iconBadge}`}
                        >
                          <Icon className="w-3.5 h-3.5" />
                        </div>
                        <span className="text-xs font-bold text-slate-900 dark:text-white">
                          {opt.label}
                        </span>
                      </div>
                      <span
                        className={`w-2.5 h-2.5 rounded-full ${
                          isSelected ? style.dot : "bg-slate-300 dark:bg-zinc-700"
                        }`}
                      />
                    </div>
                    <span className="text-[11px] text-slate-500 dark:text-zinc-400 leading-snug">
                      {opt.desc}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {jenisPegawai === "MMP" && (
            <div className="px-4 py-3 rounded-xl bg-emerald-50/80 dark:bg-emerald-500/10 border border-emerald-200/80 dark:border-emerald-500/20 text-emerald-800 dark:text-emerald-300 text-xs font-medium">
              Personil <strong>MMP (Masyarakat Mitra Polhut)</strong> tidak memiliki NIP maupun
              Pangkat/Golongan. Sistem akan otomatis membuat kode internal unik yang tampil sebagai{" "}
              <code className="px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 font-mono font-bold">
                -
              </code>{" "}
              pada daftar pegawai dan Surat Tugas.
            </div>
          )}

          {/* Fields Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {jenisPegawai !== "MMP" && (
              <InputGroup
                label={jenisPegawai === "PPPK" ? "NIPPPK" : "NIP"}
                value={formData.nip}
                onChange={handleNipChange}
                placeholder={
                  jenisPegawai === "PPPK"
                    ? "Contoh: 19930425 202421 2 053"
                    : "Contoh: 19800101 200501 1 001"
                }
                required
              />
            )}

            <div className={jenisPegawai === "MMP" ? "md:col-span-2" : ""}>
              <InputGroup
                label="Nama Lengkap (beserta gelar)"
                value={formData.nama_lengkap}
                onChange={(v: string) => setFormData({ ...formData, nama_lengkap: v })}
                placeholder="Contoh: Budi Santoso, S.Hut."
                required
              />
            </div>

            <div className={jenisPegawai === "MMP" ? "md:col-span-2" : ""}>
              <InputGroup
                label="Jabatan"
                value={formData.jabatan}
                onChange={(v: string) => setFormData({ ...formData, jabatan: v })}
                placeholder={
                  jenisPegawai === "MMP"
                    ? "Contoh: MMP Resor KSDA Wilayah..."
                    : "Contoh: Polisi Kehutanan Ahli Pertama"
                }
              />
            </div>

            {jenisPegawai !== "MMP" && (
              <SelectGroup
                label={
                  jenisPegawai === "PPPK"
                    ? "Golongan PPPK"
                    : "Pangkat / Golongan PNS"
                }
                value={formData.pangkat_golongan}
                onChange={(v: string) => setFormData({ ...formData, pangkat_golongan: v })}
                options={activePangkatOptions}
                placeholder={
                  jenisPegawai === "PPPK"
                    ? "Pilih Golongan PPPK (I–XVII)"
                    : "Pilih Pangkat/Golongan PNS (I/a–IV/e)"
                }
              />
            )}

            <div className="md:col-span-2">
              <SelectGroup
                label="Penempatan Satuan Kerja / Resor"
                value={formData.satuan_kerja}
                onChange={handleSatkerChange}
                options={SATUAN_KERJA}
                placeholder="Pilih Penempatan Satuan Kerja..."
              />
            </div>

            {/* Status Kepegawaian (Clean 2-button Segmented Toggle) */}
            <div className="md:col-span-2 space-y-1.5">
              <label className="block text-[11px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">
                Status Kepegawaian
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, is_active: "1" })}
                  className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                    formData.is_active === "1"
                      ? "bg-emerald-50 dark:bg-emerald-500/15 border-emerald-500 text-emerald-700 dark:text-emerald-300"
                      : "bg-slate-50 dark:bg-zinc-800/50 border-slate-200/80 dark:border-zinc-800 text-slate-500 dark:text-zinc-400 hover:border-slate-300"
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span>Pegawai Aktif</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, is_active: "0" })}
                  className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                    formData.is_active === "0"
                      ? "bg-rose-50 dark:bg-rose-500/15 border-rose-500 text-rose-700 dark:text-rose-300"
                      : "bg-slate-50 dark:bg-zinc-800/50 border-slate-200/80 dark:border-zinc-800 text-slate-500 dark:text-zinc-400 hover:border-slate-300"
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-rose-500" />
                  <span>Non-Aktif</span>
                </button>
              </div>
            </div>
          </div>

          {/* Action Footer */}
          <div className="pt-4 border-t border-slate-100 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <p className="text-[11px] font-medium text-slate-400 dark:text-zinc-500">
              Kolom bertanda <span className="text-rose-500 font-bold">*</span> wajib diisi.
            </p>
            <div className="flex items-center gap-2.5">
              <Link
                href="/kepegawaian/employees"
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200/80 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 text-xs font-bold transition-colors cursor-pointer"
              >
                Batal
              </Link>
              <button
                type="submit"
                disabled={mutation.isPending}
                className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition-colors shadow-sm shadow-blue-600/20 disabled:opacity-50 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>{mutation.isPending ? "Menyimpan..." : "Simpan Pegawai"}</span>
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}

interface InputGroupProps {
  label: string;
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  required?: boolean;
}

function InputGroup({ label, value, onChange, placeholder, required = false }: InputGroupProps) {
  return (
    <div className="space-y-1.5">
      <label className="block text-[11px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">
        {label} {required && <span className="text-rose-500">*</span>}
      </label>
      <input
        required={required}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-200/80 dark:border-zinc-700 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-semibold text-xs text-slate-900 dark:text-white"
        placeholder={placeholder}
      />
    </div>
  );
}

function SelectGroup({
  label,
  value,
  onChange,
  options,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (val: string) => void;
  options: string[];
  placeholder?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-[11px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">
        {label}
      </label>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-200/80 dark:border-zinc-700 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-semibold text-xs text-slate-900 dark:text-white appearance-none cursor-pointer"
        >
          <option value="">{placeholder || "Pilih..."}</option>
          {options.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
        <div className="absolute inset-y-0 right-3.5 flex items-center pointer-events-none">
          <ChevronDown className="w-4 h-4 text-slate-400" />
        </div>
      </div>
    </div>
  );
}
