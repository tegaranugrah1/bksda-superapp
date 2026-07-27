"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Send, CheckCircle2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { createSuratKeluar } from "../../_lib/surat-api";

export default function CreateSuratKeluarPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    no_surat: "",
    kode_klasifikasi: "KAP.06.01",
    tanggal_surat: new Date().toISOString().split("T")[0],
    tujuan_surat: "",
    perihal: "",
    sifat: "Biasa",
    lampiran: "1 Berkas",
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.no_surat || !formData.tujuan_surat || !formData.perihal) {
      toast.error("Mohon lengkapi nomor surat, tujuan, dan perihal.");
      return;
    }

    setIsSubmitting(true);
    try {
      const fd = new FormData();
      fd.append("no_surat", formData.no_surat);
      fd.append("kode_klasifikasi", formData.kode_klasifikasi);
      fd.append("tanggal_surat", formData.tanggal_surat);
      fd.append("tujuan_surat", formData.tujuan_surat);
      fd.append("perihal", formData.perihal);
      fd.append("sifat", formData.sifat);
      fd.append("lampiran", formData.lampiran);
      if (selectedFile) {
        fd.append("file_surat", selectedFile);
      }

      await createSuratKeluar(fd);
      toast.success("Surat Keluar berhasil disimpan.");
      router.push("/surat/keluar");
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Gagal menyimpan Surat Keluar.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/surat/keluar">
          <Button variant="outline" size="sm" className="h-9 w-9 p-0 rounded-xl">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <div className="flex items-center gap-2">
            <Send className="h-4 w-4 text-blue-600" />
            <h1 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
              Input Surat Keluar Baru
            </h1>
          </div>
          <p className="text-xs text-zinc-500">
            Pencatatan & Pengagendaan naskah dinas keluar resmi.
          </p>
        </div>
      </div>

      {/* Form Card */}
      <form onSubmit={handleSubmit} className="space-y-4 rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Nomor Surat Keluar *</label>
            <Input
              value={formData.no_surat}
              onChange={(e) => setFormData({ ...formData, no_surat: e.target.value })}
              placeholder="Contoh: S.450/KSDAE/TU/KAP.06.01/B/07/2026"
              className="mt-1 text-xs font-semibold"
              required
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Tanggal Surat *</label>
            <Input
              type="date"
              value={formData.tanggal_surat}
              onChange={(e) => setFormData({ ...formData, tanggal_surat: e.target.value })}
              className="mt-1 text-xs"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Kode Klasifikasi</label>
            <Input
              value={formData.kode_klasifikasi}
              onChange={(e) => setFormData({ ...formData, kode_klasifikasi: e.target.value })}
              placeholder="KAP.06.01"
              className="mt-1 text-xs"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Sifat Surat</label>
            <select
              value={formData.sifat}
              onChange={(e) => setFormData({ ...formData, sifat: e.target.value })}
              className="mt-1 flex h-9 w-full rounded-md border border-zinc-200 bg-transparent px-3 py-1 text-xs shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-500"
            >
              <option value="Biasa">Biasa</option>
              <option value="Penting">Penting</option>
              <option value="Sangat Penting">Sangat Penting</option>
              <option value="Rahasia">Rahasia</option>
              <option value="Segera">Segera</option>
              <option value="Kilat">Kilat</option>
            </select>
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Tujuan / Penerima Surat *</label>
          <Input
            value={formData.tujuan_surat}
            onChange={(e) => setFormData({ ...formData, tujuan_surat: e.target.value })}
            placeholder="Contoh: Kepala Balai Besar KSDA Jawa Timur"
            className="mt-1 text-xs"
            required
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Perihal Surat *</label>
          <Textarea
            value={formData.perihal}
            onChange={(e) => setFormData({ ...formData, perihal: e.target.value })}
            placeholder="Ringkasan atau perihal surat keluar..."
            rows={3}
            className="mt-1 text-xs"
            required
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Jumlah Lampiran</label>
          <Input
            value={formData.lampiran}
            onChange={(e) => setFormData({ ...formData, lampiran: e.target.value })}
            placeholder="1 (Satu) Berkas"
            className="mt-1 text-xs"
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">Unggah Berkas Naskah Dinas (PDF/Gambar)</label>
          <div className="flex items-center gap-3 p-3 border border-dashed border-zinc-300 rounded-xl bg-zinc-50/50">
            <Upload className="h-5 w-5 text-zinc-400 shrink-0" />
            <input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.webp"
              onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
              className="text-xs text-zinc-600 file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
          </div>
        </div>

        <div className="pt-4 flex items-center justify-end gap-3 border-t border-zinc-100 dark:border-zinc-800">
          <Link href="/surat/keluar">
            <Button type="button" variant="ghost" className="h-9 text-xs">
              Batal
            </Button>
          </Link>
          <Button
            type="submit"
            disabled={isSubmitting}
            className="h-9 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl"
          >
            <CheckCircle2 className="mr-1.5 h-4 w-4" />
            Simpan Surat Keluar
          </Button>
        </div>
      </form>
    </div>
  );
}
