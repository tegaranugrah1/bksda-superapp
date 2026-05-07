
"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Save, Image as ImageIcon, X, ChevronDown } from "lucide-react";
import { api } from "@/lib/api";
import Link from "next/link";

export default function EmployeeCreatePage() {
  const router = useRouter();
  const queryClient = useQueryClient(); // Alat penyapu Cache
  const fileInputRef = useRef<HTMLInputElement>(null);

  // STATE LOKAL
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    nip: "",
    nama_lengkap: "",
    jabatan: "",
    pangkat_golongan: "",
    satuan_kerja: "",
    is_active: "1", // Tipe string karena akan dilampirkan via FormData
  });

  // RULE 7.4, 4.1 & 4.2: FRONTEND FILE VALIDATION
  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setErrorMsg("Gagal: Format foto wajib berupa JPG, PNG, atau WEBP.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) { // 10 MB Limit
      setErrorMsg("Gagal: Ukuran foto melampaui batas maksimal 10 MB.");
      return;
    }

    setErrorMsg(null);
    setPhotoFile(file);

    // Fitur Estetika: Membuat URL Palsu di memori RAM komputer lokal untuk preview instan
    setPreviewUrl(URL.createObjectURL(file));
  };

  const clearPhoto = () => {
    setPhotoFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // RULE 7.2: OPERASI API (MUTASI)
  const mutation = useMutation({
    mutationFn: async () => {
      // Kita butuh koper ekspedisi (FormData) karena kargo kita mengandung barang nyata (File Foto)
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

      // Headers Content-Type wajib diset multipart
      const { data } = await api.post("/kepegawaian/employees", payload, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      return data;
    },
    onSuccess: () => {
      // SULAP CACHE: Beri tahu tabel di Issue 032 untuk me-reset data yang ditarik 60 detik lalu
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      // Giring user kembali ke halaman tabel
      router.push("/kepegawaian");
    },
    onError: (error: { response?: { data?: { message?: string } } }) => {
      // Tangkap muntahan validasi Laravel (Backend Request Rule) dari Issue 025
      setErrorMsg(error.response?.data?.message || "Koneksi terputus. Gagal menyimpan data ke server.");
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault(); // Cegah reload layaknya website tahun 90an
    mutation.mutate();
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">

      {/* AREA HEADER */}
      <div className="flex items-center gap-4">
        <Link
          href="/kepegawaian"
          className="p-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-all shadow-sm group"
        >
          <ArrowLeft className="w-5 h-5 transition-transform group-hover:-translate-x-1" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">Tambah Pegawai Baru</h1>
          <p className="text-zinc-500 dark:text-zinc-400 text-sm mt-0.5">Lengkapi biodata dan unggah identitas pas foto milik pegawai.</p>
        </div>
      </div>

      {/* POPUP PERINGATAN ERROR (Animasi Lembut) */}
      {errorMsg && (
        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 text-sm font-semibold animate-in fade-in slide-in-from-top-2 shadow-sm flex items-start gap-3">
          <div className="p-1 rounded-md bg-red-100 dark:bg-red-500/20 mt-0.5">
             <X className="w-4 h-4" />
          </div>
          <div>{errorMsg}</div>
        </div>
      )}

      {/* KARTU FORMULIR (Layout Terbelah/Split Layout) */}
      <form onSubmit={handleSubmit} className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-4xl shadow-xl shadow-zinc-200/40 dark:shadow-black/40 overflow-hidden flex flex-col md:flex-row">

        {/* KOLOM KIRI KHUSUS FOTO (Premium Aesthetic) */}
        <div className="md:w-[35%] bg-zinc-50/80 dark:bg-zinc-950/80 p-8 md:p-10 border-b md:border-b-0 md:border-r border-zinc-200 dark:border-zinc-800 flex flex-col items-center justify-start gap-6">
           <div className="w-full text-center">
             <h3 className="text-sm font-bold text-zinc-900 dark:text-white mb-1 uppercase tracking-wider">Pas Foto Pegawai</h3>
             <p className="text-[11px] font-medium text-zinc-500 mb-6 uppercase tracking-widest">Max 10MB • Rasio 3:4</p>

             {previewUrl ? (
               // Pratinjau Jika Gambar Sudah Dipilih
               <div className="relative aspect-3/4 w-full max-w-[220px] mx-auto rounded-3xl overflow-hidden shadow-2xl border-8 border-white dark:border-zinc-800 group">
                 {/* eslint-disable-next-line @next/next/no-img-element */}
                 <img src={previewUrl} alt="Preview" className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-110" />

                 {/* Kotak Sampah Transparan */}
                 <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center backdrop-blur-sm">
                    <button
                      type="button"
                      onClick={clearPhoto}
                      className="p-3 rounded-full bg-red-500 hover:bg-red-600 text-white shadow-2xl transition-transform hover:scale-110"
                    >
                      <X className="w-6 h-6" />
                    </button>
                 </div>
               </div>
             ) : (
               // Tombol Interaktif Jika Kosong
               <div
                 onClick={() => fileInputRef.current?.click()}
                 className="aspect-3/4 w-full max-w-[220px] mx-auto rounded-3xl border-2 border-dashed border-zinc-300 dark:border-zinc-700 hover:border-emerald-500 dark:hover:border-emerald-500/50 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 flex flex-col items-center justify-center gap-4 cursor-pointer transition-all duration-300 group shadow-sm"
               >
                 <div className="w-16 h-16 rounded-full bg-zinc-100 dark:bg-zinc-800 group-hover:bg-emerald-100 dark:group-hover:bg-emerald-500/20 flex items-center justify-center transition-colors duration-300">
                   <ImageIcon className="w-8 h-8 text-zinc-400 dark:text-zinc-500 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors" />
                 </div>
                 <span className="text-sm font-bold text-zinc-500 dark:text-zinc-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">Unggah Foto Utama</span>
               </div>
             )}

             <input
               type="file"
               ref={fileInputRef}
               onChange={handlePhotoChange}
               accept="image/jpeg, image/png, image/webp"
               className="hidden"
             />
           </div>
        </div>

        {/* KOLOM KANAN KHUSUS BIODATA */}
        <div className="md:w-[65%] p-8 md:p-10 space-y-6 flex flex-col justify-between">
           <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-7">

             <div className="space-y-2.5">
               <label className="text-xs font-bold text-zinc-600 dark:text-zinc-400 uppercase tracking-widest">NIP Induk <span className="text-red-500 text-base">*</span></label>
               <input
                 required
                 type="text"
                 value={formData.nip}
                 onChange={e => setFormData({...formData, nip: e.target.value})}
                 className="w-full px-4 py-3 rounded-xl bg-zinc-50 dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-800 focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all font-medium text-zinc-900 dark:text-white"
                 placeholder="Cth: 198001012005011001"
               />
             </div>

             <div className="space-y-2.5">
               <label className="text-xs font-bold text-zinc-600 dark:text-zinc-400 uppercase tracking-widest">Nama Pegawai <span className="text-red-500 text-base">*</span></label>
               <input
                 required
                 type="text"
                 value={formData.nama_lengkap}
                 onChange={e => setFormData({...formData, nama_lengkap: e.target.value})}
                 className="w-full px-4 py-3 rounded-xl bg-zinc-50 dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-800 focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all font-medium text-zinc-900 dark:text-white"
                 placeholder="Cth: Budi Santoso, S.HUT."
               />
             </div>

             <div className="space-y-2.5">
               <label className="text-xs font-bold text-zinc-600 dark:text-zinc-400 uppercase tracking-widest">Jabatan</label>
               <input
                 type="text"
                 value={formData.jabatan}
                 onChange={e => setFormData({...formData, jabatan: e.target.value})}
                 className="w-full px-4 py-3 rounded-xl bg-zinc-50 dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-800 focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all font-medium text-zinc-900 dark:text-white"
                 placeholder="Cth: Polhut Penyelia"
               />
             </div>

             <div className="space-y-2.5">
               <label className="text-xs font-bold text-zinc-600 dark:text-zinc-400 uppercase tracking-widest">Pangkat/Golongan</label>
               <input
                 type="text"
                 value={formData.pangkat_golongan}
                 onChange={e => setFormData({...formData, pangkat_golongan: e.target.value})}
                 className="w-full px-4 py-3 rounded-xl bg-zinc-50 dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-800 focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all font-medium text-zinc-900 dark:text-white"
                 placeholder="Cth: Penata / III.c"
               />
             </div>

             <div className="space-y-2.5 md:col-span-2">
               <label className="text-xs font-bold text-zinc-600 dark:text-zinc-400 uppercase tracking-widest">Penempatan Satker</label>
               <input
                 type="text"
                 value={formData.satuan_kerja}
                 onChange={e => setFormData({...formData, satuan_kerja: e.target.value})}
                 className="w-full px-4 py-3 rounded-xl bg-zinc-50 dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-800 focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all font-medium text-zinc-900 dark:text-white"
                 placeholder="Cth: Bidang Wilayah II Tenggarong"
               />
             </div>

             <div className="space-y-2.5 md:col-span-2">
               <label className="text-xs font-bold text-zinc-600 dark:text-zinc-400 uppercase tracking-widest">Status Kepegawaian</label>
               <div className="relative">
                 <select
                   value={formData.is_active}
                   onChange={e => setFormData({...formData, is_active: e.target.value})}
                   className="w-full px-4 py-3 rounded-xl bg-zinc-50 dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-800 focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all font-medium text-zinc-900 dark:text-white appearance-none cursor-pointer"
                 >
                   <option value="1">🟢 Pegawai Aktif Bertugas</option>
                   <option value="0">🔴 Non-Aktif (Pensiun / Cuti / Pindah)</option>
                 </select>
                 <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none">
                    <ChevronDown className="w-4 h-4 text-zinc-500" />
                 </div>
               </div>
             </div>

           </div>

           {/* FOOTER: AREA TOMBOL */}
           <div className="pt-8 mt-4 flex items-center justify-between border-t border-zinc-100 dark:border-zinc-800/50">
             <p className="text-xs text-zinc-400">Tanda <span className="text-red-500">*</span> wajib diisi.</p>
             <button
               type="submit"
               disabled={mutation.isPending}
               className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-8 py-3 rounded-xl text-sm font-bold transition-all duration-300 shadow-xl shadow-emerald-600/20 hover:shadow-emerald-500/40 hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
             >
               {mutation.isPending ? (
                 <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Memproses...
                 </>
               ) : (
                 <>
                   <Save className="w-5 h-5" />
                   Rekam Data
                 </>
               )}
             </button>
           </div>
        </div>

      </form>
    </div>
  );
}
