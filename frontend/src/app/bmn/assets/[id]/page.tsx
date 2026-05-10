"use client";

import { useState, useEffect, use } from "react";
import { useForm } from "react-hook-form";
import { api } from "@/lib/api";
import { useRouter } from "next/navigation";
import {
  Save,
  ArrowLeft,
  Loader2,
  FileText,
  Wallet,
  MapPin,
  AlertTriangle,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

interface FormData {
  kode_barang: string;
  nup: string;
  nama_barang: string;
  merk_tipe: string;
  tahun_perolehan: number;
  kondisi: string;
  nilai_perolehan: number;
  nilai_buku: number;
  lokasi_spesifik: string;
  keterangan: string;
  keterangan_audit: string;
}

export default function BmnAssetFormPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: assetId } = use(params);
  const isEditMode = assetId !== "create";
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("identitas");

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    defaultValues: {
      kode_barang: "",
      nup: "",
      nama_barang: "",
      merk_tipe: "",
      tahun_perolehan: new Date().getFullYear(),
      kondisi: "Baik",
      nilai_perolehan: 0,
      nilai_buku: 0,
      lokasi_spesifik: "",
      keterangan: "",
      keterangan_audit: "",
    },
  });

  useEffect(() => {
    if (!isEditMode) return;
    const fetchAsset = async () => {
      setIsLoading(true);
      try {
        const res = await api.get(`/bmn/assets/${assetId}`);
        reset(res.data.data);
      } catch {
        toast.error("Gagal menarik arsip aset dari Database.");
      } finally {
        setIsLoading(false);
      }
    };
    void fetchAsset();
  }, [assetId, isEditMode, reset]);

  const onSubmit = async (data: FormData) => {
    setIsLoading(true);
    try {
      if (isEditMode) {
        if (!data.keterangan_audit) {
          toast.error(
            "Wajib mengisi Alasan Revisi (Audit) saat mengubah data Aset BMN!",
          );
          setIsLoading(false);
          return;
        }
        await api.put(`/bmn/assets/${assetId}`, data);
        toast.success("Catatan revisi berhasil diabadikan.");
      } else {
        await api.post("/bmn/assets", data);
        toast.success("Registrasi BMN Baru telah sukses dibukukan.");
      }
      router.push("/bmn/assets");
    } catch (error: unknown) {
      const err = error as {
        response?: { data?: { message?: string; error?: string } };
      };
      const errMsg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        "Terjadi benturan sistem.";
      toast.error(errMsg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center gap-4 border-b border-zinc-800 pb-6">
        <Link
          href="/bmn/assets"
          className="p-2 bg-zinc-900 hover:bg-zinc-800 rounded-xl transition-colors border border-zinc-800"
        >
          <ArrowLeft className="w-5 h-5 text-zinc-400" />
        </Link>
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            {isEditMode
              ? "Revisi Buku Induk Aset"
              : "Pendaftaran Aset BMN Baru"}
          </h1>
          <p className="text-zinc-500 text-sm mt-1">
            Pastikan KODE BARANG dan NUP selaras dengan Surat Keputusan (SK)
            BPK.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="flex gap-2 p-1 bg-zinc-950/50 border border-zinc-800 rounded-xl overflow-x-auto">
          {[
            { key: "identitas", label: "1. Identitas Fisik", icon: FileText },
            { key: "valuasi", label: "2. Kondisi & Valuasi", icon: Wallet },
            { key: "lokasi", label: "3. Lokasi", icon: MapPin },
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => setActiveTab(key)}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${activeTab === key ? "bg-zinc-800 text-emerald-400 shadow-md" : "text-zinc-500 hover:text-zinc-300"}`}
            >
              <Icon className="w-4 h-4" /> {label}
            </button>
          ))}
        </div>

        <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6 md:p-8 shadow-2xl min-h-100">
          <div
            className={
              activeTab === "identitas"
                ? "block animate-in fade-in duration-300"
                : "hidden"
            }
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-400 uppercase">
                  Kode Barang <span className="text-red-500">*</span>
                </label>
                <input
                  {...register("kode_barang", { required: true })}
                  className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-3 text-white focus:ring-1 focus:ring-emerald-500 outline-none"
                  placeholder="Misal: 3.02.01.01.001"
                />
                {errors.kode_barang && (
                  <p className="text-red-400 text-xs">Wajib diisi</p>
                )}
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-400 uppercase">
                  NUP <span className="text-red-500">*</span>
                </label>
                <input
                  {...register("nup", { required: true })}
                  className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-3 text-white font-mono focus:ring-1 focus:ring-emerald-500 outline-none"
                  placeholder="Misal: 0001"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="text-xs font-bold text-zinc-400 uppercase">
                  Nama Barang <span className="text-red-500">*</span>
                </label>
                <input
                  {...register("nama_barang", { required: true })}
                  className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-3 text-white focus:ring-1 focus:ring-emerald-500 outline-none"
                  placeholder="Misal: Sepeda Motor Trail Honda CRF 150L"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-400 uppercase">
                  Merk / Tipe
                </label>
                <input
                  {...register("merk_tipe")}
                  className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-3 text-white focus:ring-1 focus:ring-emerald-500 outline-none"
                  placeholder="Misal: Honda / CRF"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-400 uppercase">
                  Tahun Perolehan
                </label>
                <input
                  type="number"
                  {...register("tahun_perolehan")}
                  className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-3 text-white focus:ring-1 focus:ring-emerald-500 outline-none"
                />
              </div>
            </div>
          </div>

          <div
            className={
              activeTab === "valuasi"
                ? "block animate-in fade-in duration-300"
                : "hidden"
            }
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2 md:col-span-2">
                <label className="text-xs font-bold text-zinc-400 uppercase">
                  Kondisi Fisik <span className="text-red-500">*</span>
                </label>
                <select
                  {...register("kondisi")}
                  className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-3 text-white focus:ring-1 focus:ring-emerald-500 outline-none appearance-none"
                >
                  <option value="Baik">Baik (Berfungsi Penuh)</option>
                  <option value="Rusak Ringan">
                    Rusak Ringan (Butuh Servis Minor)
                  </option>
                  <option value="Rusak Berat">
                    Rusak Berat (Tidak Layak Pakai)
                  </option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-400 uppercase">
                  Nilai Perolehan (Rp) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  {...register("nilai_perolehan", { required: true })}
                  className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-3 text-white font-mono focus:ring-1 focus:ring-emerald-500 outline-none"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-400 uppercase">
                  Nilai Buku (Rp)
                </label>
                <input
                  type="number"
                  step="0.01"
                  {...register("nilai_buku")}
                  className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-3 text-white font-mono focus:ring-1 focus:ring-emerald-500 outline-none"
                />
              </div>
            </div>
          </div>

          <div
            className={
              activeTab === "lokasi"
                ? "block animate-in fade-in duration-300"
                : "hidden"
            }
          >
            <div className="grid grid-cols-1 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-400 uppercase">
                  Lokasi Spesifik
                </label>
                <input
                  {...register("lokasi_spesifik")}
                  className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-3 text-white focus:ring-1 focus:ring-emerald-500 outline-none"
                  placeholder="Misal: Gudang Belakang / Loker Resort 2"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-400 uppercase">
                  Keterangan Umum
                </label>
                <textarea
                  {...register("keterangan")}
                  rows={3}
                  className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-3 text-white focus:ring-1 focus:ring-emerald-500 outline-none resize-none"
                  placeholder="Spesifikasi warna, plat nomor, no rangka..."
                />
              </div>
            </div>
          </div>

          {isEditMode && (
            <div className="mt-8 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex gap-4 animate-in slide-in-from-bottom-2">
              <AlertTriangle className="w-6 h-6 text-red-500 mt-1 shrink-0" />
              <div className="flex-1 space-y-2">
                <label className="text-xs font-black text-red-400 uppercase tracking-wider">
                  Rekam Jejak Audit (Wajib){" "}
                  <span className="text-white">*</span>
                </label>
                <p className="text-xs text-red-500/80 mb-2">
                  Isi alasan mengapa data fisik aset ini diubah untuk keperluan
                  audit.
                </p>
                <input
                  {...register("keterangan_audit")}
                  className="w-full bg-red-950/30 border border-red-500/30 rounded-lg px-4 py-2.5 text-red-200 focus:ring-1 focus:ring-red-500 outline-none placeholder:text-red-500/40 text-sm"
                  placeholder="Misal: Depresiasi nilai harga penyusutan tahun 2026..."
                />
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end pt-4">
          <button
            type="submit"
            disabled={isLoading}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-8 py-3 rounded-xl font-bold transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] disabled:opacity-50"
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Save className="w-5 h-5" />
            )}
            {isEditMode ? "Simpan Revisi Aset" : "Terbitkan Registrasi Aset"}
          </button>
        </div>
      </form>
    </div>
  );
}
