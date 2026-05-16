"use client";

import { useState, FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Newspaper, Save, ArrowLeft, Loader2, ImagePlus } from "lucide-react";
import { toast } from "sonner";
import dynamic from "next/dynamic";

// Dynamic Import: Rich Text Editor hanya dimuat di sisi klien (Menghindari SSR crash)
const ReactQuill = dynamic(() => import("react-quill-new"), { ssr: false });
import "react-quill-new/dist/quill.snow.css";

interface Category {
  id: number;
  nama: string;
}

export default function CreateInformasiPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [judul, setJudul] = useState("");
  const [konten, setKonten] = useState("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [sumber, setSumber] = useState("");
  const [isPublished, setIsPublished] = useState(false);
  const [thumbnail, setThumbnail] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Ambil daftar Kategori untuk Dropdown
  const { data: categories } = useQuery({
    queryKey: ["cms-categories"],
    queryFn: async () => {
      const res = await api.get<{ data: Category[] }>("/cms/admin/categories");
      return res.data?.data || [];
    },
  });

  // Preview Thumbnail secara lokal (Tanpa upload dulu)
  const handleThumbnailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setThumbnail(file);
      setThumbnailPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!judul.trim()) {
      toast.error("Judul berita wajib diisi.");
      return;
    }
    if (!konten.trim()) {
      toast.error("Konten berita wajib diisi.");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = new FormData();
      payload.append("judul", judul);
      payload.append("konten", konten);
      if (categoryId) payload.append("category_id", categoryId);
      if (sumber) payload.append("sumber", sumber);
      payload.append("is_published", isPublished ? "1" : "0");
      if (thumbnail) payload.append("thumbnail", thumbnail);

      await api.post("/cms/admin/informasi", payload, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      toast.success(
        isPublished
          ? "Berita berhasil diterbitkan!"
          : "Berita disimpan sebagai Draft.",
      );
      queryClient.invalidateQueries({ queryKey: ["cms-informasi"] });
      router.push("/cms/informasi");
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || "Gagal menyimpan berita.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-6 md:p-10 max-w-4xl animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={() => router.back()}
          className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-zinc-400" />
        </button>
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-3">
            <Newspaper className="w-7 h-7 text-teal-500" /> Tulis Berita Baru
          </h1>
          <p className="text-zinc-500 text-sm mt-1">
            Isi formulir di bawah untuk membuat konten berita.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Judul */}
        <div>
          <label className="block text-xs font-bold text-zinc-400 uppercase mb-1.5">
            Judul Berita *
          </label>
          <input
            type="text"
            value={judul}
            onChange={(e) => setJudul(e.target.value)}
            maxLength={500}
            placeholder="Contoh: BKSDA Lepasliarkan 5 Ekor Elang Jawa ke Habitat Asli"
            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-teal-500 transition-all placeholder:text-zinc-600"
          />
        </div>

        {/* Kategori + Sumber (2 Kolom) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-zinc-400 uppercase mb-1.5">
              Kategori
            </label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-teal-500 transition-all"
            >
              <option value="">— Pilih Kategori —</option>
              {categories?.map((cat: Category) => (
                <option key={cat.id} value={cat.id}>
                  {cat.nama}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-zinc-400 uppercase mb-1.5">
              Sumber
            </label>
            <input
              type="text"
              value={sumber}
              onChange={(e) => setSumber(e.target.value)}
              maxLength={255}
              placeholder="Opsional: Kompas.com"
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-teal-500 transition-all placeholder:text-zinc-600"
            />
          </div>
        </div>

        {/* Thumbnail Upload + Preview */}
        <div>
          <label className="block text-xs font-bold text-zinc-400 uppercase mb-1.5">
            Thumbnail
          </label>
          <div className="flex items-start gap-4">
            <label className="flex-1 flex items-center justify-center gap-3 bg-zinc-900 border-2 border-dashed border-zinc-700 rounded-xl px-4 py-6 cursor-pointer hover:border-teal-500 transition-all group">
              <ImagePlus className="w-6 h-6 text-zinc-500 group-hover:text-teal-400 transition-colors" />
              <span className="text-sm text-zinc-500 group-hover:text-zinc-300">
                {thumbnail ? thumbnail.name : "Klik untuk unggah gambar"}
              </span>
              <input
                type="file"
                className="hidden"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleThumbnailChange}
              />
            </label>
            {thumbnailPreview && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={thumbnailPreview}
                alt="Preview"
                className="w-24 h-24 rounded-xl object-cover border border-zinc-700"
              />
            )}
          </div>
        </div>

        {/* Rich Text Editor */}
        <div>
          <label className="block text-xs font-bold text-zinc-400 uppercase mb-1.5">
            Konten Berita *
          </label>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden [&_.ql-toolbar]:!bg-zinc-800 [&_.ql-toolbar]:!border-zinc-700 [&_.ql-container]:!border-zinc-700 [&_.ql-editor]:!text-white [&_.ql-editor]:!min-h-[300px]">
            <ReactQuill
              theme="snow"
              value={konten}
              onChange={setKonten}
              placeholder="Tulis konten berita di sini..."
            />
          </div>
        </div>

        {/* Toggle Terbitkan */}
        <div className="flex items-center gap-3 bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
          <input
            type="checkbox"
            id="publish"
            checked={isPublished}
            onChange={(e) => setIsPublished(e.target.checked)}
            className="w-4 h-4 rounded accent-teal-500"
          />
          <label
            htmlFor="publish"
            className="text-sm text-zinc-300 font-medium cursor-pointer"
          >
            Langsung terbitkan setelah disimpan
          </label>
        </div>

        {/* Tombol Simpan */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex items-center justify-center gap-2 bg-teal-600 hover:bg-teal-500 text-white px-6 py-3 rounded-xl font-bold text-sm transition-all disabled:opacity-50"
        >
          {isSubmitting ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Save className="w-5 h-5" />
          )}
          {isSubmitting
            ? "Menyimpan..."
            : isPublished
              ? "Terbitkan Berita"
              : "Simpan sebagai Draft"}
        </button>
      </form>
    </div>
  );
}
