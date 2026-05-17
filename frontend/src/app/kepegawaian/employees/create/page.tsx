"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Save, Image as ImageIcon, X, ChevronDown, Users } from "lucide-react";
import Image from "next/image";
import { api } from "@/lib/api";
import Link from "next/link";
import { toast } from "sonner";

export default function EmployeeCreatePage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    nip: "",
    nama_lengkap: "",
    jabatan: "",
    pangkat_golongan: "",
    satuan_kerja: "",
    is_active: "1",
  });

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
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
      payload.append("nip", formData.nip);
      payload.append("nama_lengkap", formData.nama_lengkap);
      if (formData.jabatan) payload.append("jabatan", formData.jabatan);
      if (formData.pangkat_golongan) payload.append("pangkat_golongan", formData.pangkat_golongan);
      if (formData.satuan_kerja) payload.append("satuan_kerja", formData.satuan_kerja);
      payload.append("is_active", formData.is_active);

      if (photoFile) {
        payload.append("foto", photoFile);
      }

      const { data } = await api.post("/kepegawaian/employees", payload, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      toast.success("Pegawai berhasil ditambahkan!");
      router.push("/kepegawaian");
    },
    onError: (error: { response?: { data?: { message?: string } } }) => {
      setErrorMsg(error.response?.data?.message || "Koneksi terputus. Gagal menyimpan data ke server.");
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate();
  };

  return (
    <div className="p-6 md:p-10 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 max-w-6xl mx-auto w-full">
        <div className="flex items-center gap-4">
            <Link
                href="/kepegawaian"
                className="p-3 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:text-blue-600 transition-all shadow-sm"
            >
                <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
                <div className="flex items-center gap-2 mb-1">
                    <div className="w-6 h-6 rounded-md bg-blue-600 flex items-center justify-center text-white">
                        <Users className="w-4 h-4" />
                    </div>
                    <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600 dark:text-blue-400">Kepegawaian & SDM</h2>
                </div>
                <h1 className="text-3xl font-black text-zinc-900 dark:text-white tracking-tight">Tambah Pegawai Baru</h1>
            </div>
        </div>
      </div>

      {errorMsg && (
        <div className="max-w-6xl mx-auto w-full p-4 rounded-2xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 text-sm font-semibold animate-in fade-in slide-in-from-top-2 shadow-sm flex items-start gap-3">
          <X className="w-4 h-4 mt-0.5" />
          <div>{errorMsg}</div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="max-w-6xl mx-auto w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[2.5rem] shadow-sm overflow-hidden flex flex-col lg:flex-row relative">
        <div className="lg:w-1/3 bg-zinc-50/50 dark:bg-zinc-950/50 p-10 border-b lg:border-b-0 lg:border-r border-zinc-200 dark:border-zinc-800 flex flex-col items-center gap-6">
             <div className="w-full text-center">
                <h3 className="text-xs font-black text-zinc-900 dark:text-white mb-1 uppercase tracking-[0.2em]">Pas Foto</h3>
                <p className="text-[10px] font-bold text-zinc-500 mb-8 uppercase tracking-widest bg-zinc-100 dark:bg-zinc-800 px-3 py-1 rounded-full inline-block">Max 10MB • Rasio 3:4</p>

                {previewUrl ? (
                    <div className="relative aspect-3/4 w-full max-w-[240px] mx-auto rounded-4xl overflow-hidden shadow-2xl border-4 border-white dark:border-zinc-800 group">
                        <Image src={previewUrl} alt="Preview" fill className="object-cover" unoptimized />
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                            <button type="button" onClick={clearPhoto} className="p-4 rounded-full bg-red-600 text-white shadow-2xl transform hover:scale-110 transition-transform">
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
                        <span className="text-xs font-bold text-zinc-400 group-hover:text-blue-600 transition-colors uppercase tracking-widest">Pilih Foto</span>
                    </div>
                )}

                <input type="file" ref={fileInputRef} onChange={handlePhotoChange} accept="image/*" className="hidden" />
             </div>
        </div>

        <div className="lg:w-2/3 p-10 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <InputGroup label="NIP Induk" value={formData.nip} onChange={(v: string) => setFormData({...formData, nip: v})} placeholder="19800101..." required />
                <InputGroup label="Nama Lengkap" value={formData.nama_lengkap} onChange={(v: string) => setFormData({...formData, nama_lengkap: v})} placeholder="Budi Santoso..." required />
                <InputGroup label="Jabatan" value={formData.jabatan} onChange={(v: string) => setFormData({...formData, jabatan: v})} placeholder="Polhut..." />
                <SelectGroup
                  label="Pangkat/Golongan"
                  value={formData.pangkat_golongan}
                  onChange={(v: string) => setFormData({...formData, pangkat_golongan: v})}
                  options={PANGKAT_PNS}
                  placeholder="Pilih Pangkat/Golongan"
                />
                <div className="md:col-span-2">
                    <InputGroup label="Penempatan Satker" value={formData.satuan_kerja} onChange={(v: string) => setFormData({...formData, satuan_kerja: v})} placeholder="Bidang Wilayah II..." />
                </div>
                <div className="md:col-span-2 space-y-2">
                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Status Kepegawaian</label>
                    <div className="relative">
                        <select
                            value={formData.is_active}
                            onChange={e => setFormData({...formData, is_active: e.target.value})}
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
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest italic">Lengkapi semua data bertanda bintang</p>
                <button
                    type="submit"
                    disabled={mutation.isPending}
                    className="flex items-center gap-3 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 px-10 py-4 rounded-2xl text-sm font-black transition-all hover:scale-[1.02] active:scale-[0.98] shadow-2xl disabled:opacity-50"
                >
                    {mutation.isPending ? "Memproses..." : (
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
                onChange={e => onChange(e.target.value)}
                className="w-full px-6 py-4 rounded-2xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-bold text-sm"
                placeholder={placeholder}
            />
        </div>
    );
}

const PANGKAT_PNS = [
  // Tidak ada pangkat (MMP, honorer, dll)
  "- (Tidak ada pangkat)",
  // PNS - Golongan I
  "Juru Muda (I/a)",
  "Juru Muda Tingkat I (I/b)",
  "Juru (I/c)",
  "Juru Tingkat I (I/d)",
  // PNS - Golongan II
  "Pengatur Muda (II/a)",
  "Pengatur Muda Tingkat I (II/b)",
  "Pengatur (II/c)",
  "Pengatur Tingkat I (II/d)",
  // PNS - Golongan III
  "Penata Muda (III/a)",
  "Penata Muda Tingkat I (III/b)",
  "Penata (III/c)",
  "Penata Tingkat I (III/d)",
  // PNS - Golongan IV
  "Pembina (IV/a)",
  "Pembina Tingkat I (IV/b)",
  "Pembina Utama Muda (IV/c)",
  "Pembina Utama Madya (IV/d)",
  "Pembina Utama (IV/e)",
  // PPPK (Pegawai Pemerintah dengan Perjanjian Kerja)
  "PPPK Golongan I",
  "PPPK Golongan II",
  "PPPK Golongan III",
  "PPPK Golongan IV",
  "PPPK Golongan V",
  "PPPK Golongan VI",
  "PPPK Golongan VII",
  "PPPK Golongan VIII",
  "PPPK Golongan IX",
  "PPPK Golongan X",
  "PPPK Golongan XI",
  "PPPK Golongan XII",
  "PPPK Golongan XIII",
  "PPPK Golongan XIV",
  "PPPK Golongan XV",
  "PPPK Golongan XVI",
  "PPPK Golongan XVII",
];

function SelectGroup({ label, value, onChange, options, placeholder }: {
  label: string;
  value: string;
  onChange: (val: string) => void;
  options: string[];
  placeholder?: string;
}) {
  return (
    <div className="space-y-2">
      <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">{label}</label>
      <div className="relative">
        <select
          value={value}
          onChange={e => onChange(e.target.value)}
          className="w-full px-6 py-4 rounded-2xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-bold text-sm appearance-none cursor-pointer"
        >
          <option value="">{placeholder || "Pilih..."}</option>
          {options.map(opt => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
        <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none">
          <ChevronDown className="w-4 h-4 text-zinc-400" />
        </div>
      </div>
    </div>
  );
}
