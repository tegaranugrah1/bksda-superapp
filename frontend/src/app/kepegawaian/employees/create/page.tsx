"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Save, Image as ImageIcon, X, ChevronDown, Users } from "lucide-react";
import Image from "next/image";
import { api } from "@/lib/api";
import Link from "next/link";
import { toast } from "sonner";
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

export default function EmployeeCreatePage() {
  const router = useRouter();
  const queryClient = useQueryClient();
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

    setErrorMsg(null);
    setPhotoFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const clearPhoto = () => {
    setPhotoFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const mutation = useMutation({
    mutationFn: async () => {
      const payload = new FormData();
      payload.append("jenis_pegawai", jenisPegawai);
      if (jenisPegawai !== "MMP") {
        payload.append("nip", formData.nip);
      }
      payload.append("nama_lengkap", formData.nama_lengkap);
      if (formData.jabatan) payload.append("jabatan", formData.jabatan);
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
      setErrorMsg(error.response?.data?.message || "Koneksi terputus. Gagal menyimpan data ke server.");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate();
  };

  const activePangkatOptions =
    jenisPegawai === "PPPK" ? PANGKAT_PPPK_OPTIONS : PANGKAT_PNS_OPTIONS;

  return (
    <div className="p-5 md:p-7 space-y-5">
      <div className="max-w-6xl mx-auto w-full bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800/80 rounded-2xl p-4 md:px-6 md:py-4 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-blue-600/10 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400 border border-blue-200/60 dark:border-blue-500/20 flex items-center justify-center shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-blue-600 dark:text-blue-400">
              SDM &amp; Kepegawaian
            </span>
            <h1 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              Tambah Pegawai Baru
            </h1>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
              Input data personil PNS, PPPK, atau Masyarakat Mitra Polhut (MMP).
            </p>
          </div>
        </div>

        <Link
          href="/kepegawaian/employees"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200/80 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 text-xs font-bold transition-colors shrink-0"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Daftar</span>
        </Link>
      </div>

      {errorMsg && (
        <div className="max-w-6xl mx-auto w-full p-4 rounded-2xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 text-sm font-semibold animate-in fade-in slide-in-from-top-2 shadow-sm flex items-start gap-3">
          <X className="w-4 h-4 mt-0.5" />
          <div>{errorMsg}</div>
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="max-w-6xl mx-auto w-full bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800/80 rounded-2xl shadow-2xs overflow-hidden flex flex-col lg:flex-row relative"
      >
        <div className="lg:w-1/3 bg-zinc-50/50 dark:bg-zinc-950/50 p-10 border-b lg:border-b-0 lg:border-r border-zinc-200 dark:border-zinc-800 flex flex-col items-center gap-6">
          <div className="w-full text-center">
            <h3 className="text-xs font-black text-zinc-900 dark:text-white mb-1 uppercase tracking-[0.2em]">
              Pas Foto
            </h3>
            <p className="text-[10px] font-bold text-zinc-500 mb-8 uppercase tracking-widest bg-zinc-100 dark:bg-zinc-800 px-3 py-1 rounded-full inline-block">
              Max 10MB • Rasio 3:4
            </p>

            {previewUrl ? (
              <div className="relative aspect-3/4 w-full max-w-[240px] mx-auto rounded-4xl overflow-hidden shadow-2xl border-4 border-white dark:border-zinc-800 group">
                <Image src={previewUrl} alt="Preview" fill className="object-cover" unoptimized />
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                  <button
                    type="button"
                    onClick={clearPhoto}
                    className="p-4 rounded-full bg-red-600 text-white shadow-2xl transform hover:scale-110 transition-transform"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="aspect-3/4 w-full max-w-[240px] mx-auto rounded-4xl border-2 border-dashed border-zinc-200 dark:border-zinc-800 hover:border-blue-500 hover:bg-blue-50/30 dark:hover:bg-blue-500/5 flex flex-col items-center justify-center gap-4 cursor-pointer transition-all group"
              >
                <div className="w-16 h-16 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                  <ImageIcon className="w-8 h-8 text-zinc-400 group-hover:text-blue-600 transition-colors" />
                </div>
                <span className="text-xs font-bold text-zinc-400 group-hover:text-blue-600 transition-colors uppercase tracking-widest">
                  Pilih Foto
                </span>
              </div>
            )}

            <input
              type="file"
              ref={fileInputRef}
              onChange={handlePhotoChange}
              accept="image/*"
              className="hidden"
            />
          </div>
        </div>

        <div className="lg:w-2/3 p-10 space-y-8">
          {/* Pemilih Jenis Pegawai: PNS | PPPK (P3K) | MMP */}
          <div className="space-y-2.5">
            <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">
              Kategori / Jenis Pegawai <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {JENIS_PEGAWAI_OPTIONS.map((opt) => {
                const isSelected = jenisPegawai === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => handleJenisChange(opt.value)}
                    className={`flex flex-col items-start p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                      isSelected
                        ? "bg-blue-50/80 dark:bg-blue-500/10 border-blue-600 dark:border-blue-500 ring-2 ring-blue-500/20"
                        : "bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700"
                    }`}
                  >
                    <div className="flex items-center justify-between w-full mb-1">
                      <span
                        className={`text-sm font-black tracking-tight ${
                          isSelected
                            ? "text-blue-700 dark:text-blue-300"
                            : "text-zinc-900 dark:text-white"
                        }`}
                      >
                        {opt.label}
                      </span>
                      <span
                        className={`w-2.5 h-2.5 rounded-full ${
                          isSelected ? "bg-blue-600" : "bg-zinc-300 dark:bg-zinc-700"
                        }`}
                      />
                    </div>
                    <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 leading-snug">
                      {opt.desc}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {jenisPegawai === "MMP" && (
            <div className="px-4 py-3 rounded-2xl bg-emerald-50/80 dark:bg-emerald-500/10 border border-emerald-200/80 dark:border-emerald-500/20 text-emerald-800 dark:text-emerald-300 text-xs font-semibold">
              Personil <strong>MMP (Masyarakat Mitra Polhut)</strong> tidak memiliki NIP maupun
              Pangkat/Golongan. Sistem akan otomatis membuat kode internal unik yang tampil sebagai{" "}
              <code className="px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 font-mono">
                -
              </code>{" "}
              pada daftar pegawai dan Surat Tugas.
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {jenisPegawai !== "MMP" && (
              <InputGroup
                label={jenisPegawai === "PPPK" ? "NIPPPK" : "NIP"}
                value={formData.nip}
                onChange={handleNipChange}
                placeholder={
                  jenisPegawai === "PPPK"
                    ? "19930425 202421 2 053..."
                    : "19800101 200501 1 001..."
                }
                required
              />
            )}

            <div className={jenisPegawai === "MMP" ? "md:col-span-2" : ""}>
              <InputGroup
                label="Nama Lengkap"
                value={formData.nama_lengkap}
                onChange={(v: string) => setFormData({ ...formData, nama_lengkap: v })}
                placeholder="Budi Santoso..."
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
                    ? "MMP Resor KSDA Wilayah..."
                    : "Polisi Kehutanan Ahli Pertama..."
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
                label="Penempatan Satker"
                value={formData.satuan_kerja}
                onChange={handleSatkerChange}
                options={SATUAN_KERJA}
                placeholder="Pilih Penempatan..."
              />
            </div>

            <div className="md:col-span-2 space-y-2">
              <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">
                Status Kepegawaian
              </label>
              <div className="relative">
                <select
                  value={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.value })}
                  className="w-full px-6 py-4 rounded-2xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-bold text-sm appearance-none cursor-pointer"
                >
                  <option value="1">🟢 Pegawai Aktif</option>
                  <option value="0">🔴 Non-Aktif</option>
                </select>
                <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none">
                  <ChevronDown className="w-4 h-4 text-zinc-400" />
                </div>
              </div>
            </div>
          </div>

          <div className="pt-8 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest italic">
              Lengkapi semua data bertanda bintang
            </p>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="flex items-center gap-3 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 px-10 py-4 rounded-2xl text-sm font-black transition-all hover:scale-[1.02] active:scale-[0.98] shadow-2xl disabled:opacity-50"
            >
              {mutation.isPending ? (
                "Memproses..."
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  Simpan Pegawai
                </>
              )}
            </button>
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
    <div className="space-y-2">
      <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input
        required={required}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-6 py-4 rounded-2xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-bold text-sm"
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
    <div className="space-y-2">
      <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">
        {label}
      </label>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-6 py-4 rounded-2xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-bold text-sm appearance-none cursor-pointer"
        >
          <option value="">{placeholder || "Pilih..."}</option>
          {options.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
        <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none">
          <ChevronDown className="w-4 h-4 text-zinc-400" />
        </div>
      </div>
    </div>
  );
}
