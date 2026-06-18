"use client";

import { useState, FormEvent, useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter, useParams } from "next/navigation";
import { api } from "@/lib/api";
import { sanitizeHtml } from "@/lib/utils";
import { Newspaper, Save, ArrowLeft, Loader2, ImagePlus } from "lucide-react";
import { toast } from "sonner";
import dynamic from "next/dynamic";

// Dynamic Import: Rich Text Editor hanya dimuat di sisi klien
const ReactQuill = dynamic(() => import("react-quill-new"), { ssr: false });
import "react-quill-new/dist/quill.snow.css";

interface Category {
  id: number;
  nama: string;
}

interface InformasiData {
  id: number;
  judul: string;
  konten: string;
  category_id: number | null;
  sumber: string;
  is_published: boolean;
  thumbnail_path: string | null;
}

// Quill toolbar modules with justify alignment
const QUILL_MODULES = {
  toolbar: [
    [{ header: [1, 2, 3, false] }],
    ["bold", "italic", "underline", "strike"],
    [{ align: [] }],
    [{ list: "ordered" }, { list: "bullet" }],
    [{ indent: "-1" }, { indent: "+1" }],
    ["blockquote", "code-block"],
    ["link", "image"],
    [{ color: [] }, { background: [] }],
    ["clean"],
  ],
};

const QUILL_FORMATS = [
  "header",
  "bold",
  "italic",
  "underline",
  "strike",
  "align",
  "list",
  "indent",
  "blockquote",
  "code-block",
  "link",
  "image",
  "color",
  "background",
];

export default function EditInformasiPage() {
  const router = useRouter();
  const params = useParams();
  const queryClient = useQueryClient();
  const id = params.id as string;

  const modules = useMemo(() => QUILL_MODULES, []);

  const { data: informasi, isLoading: isLoadingInformasi } =
    useQuery<InformasiData>({
      queryKey: ["cms-informasi-edit", id],
      queryFn: async () => {
        const res = await api.get(`/cms/admin/informasi/${id}`);
        return res.data?.data || res.data;
      },
    });

  const [judul, setJudul] = useState("");
  const [konten, setKonten] = useState("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [sumber, setSumber] = useState("");
  const [isPublished, setIsPublished] = useState(false);
  const [thumbnail, setThumbnail] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (informasi) {
      setJudul(informasi.judul ?? "");
      setKonten(informasi.konten ?? "");
      setCategoryId(informasi.category_id?.toString() ?? "");
      setSumber(informasi.sumber ?? "");
      setIsPublished(informasi.is_published ?? false);
      if (informasi.thumbnail_path) {
        setThumbnailPreview(
          `${process.env.NEXT_PUBLIC_STORAGE_URL}/${informasi.thumbnail_path}`
        );
      }
    }
  }, [informasi]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const { data: categories } = useQuery({
    queryKey: ["cms-categories"],
    queryFn: async () => {
      const res = await api.get<{ data: Category[] }>("/cms/admin/categories");
      return res.data?.data || [];
    },
  });

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
      payload.append("_method", "PUT");
      payload.append("judul", judul);
      payload.append("konten", sanitizeHtml(konten));
      if (categoryId) payload.append("category_id", categoryId);
      if (sumber) payload.append("sumber", sumber);
      payload.append("is_published", isPublished ? "1" : "0");
      if (thumbnail) payload.append("thumbnail", thumbnail);

      await api.post(`/cms/admin/informasi/${id}`, payload, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      toast.success(
        isPublished
          ? "Berita berhasil diperbarui dan diterbitkan!"
          : "Berita berhasil diperbarui."
      );
      queryClient.invalidateQueries({ queryKey: ["cms-informasi"] });
      queryClient.invalidateQueries({ queryKey: ["cms-informasi-edit", id] });
      router.push("/cms/informasi");
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || "Gagal memperbarui berita.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoadingInformasi) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-teal-500" />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-10 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.back()}
          className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-zinc-500 dark:text-zinc-400" />
        </button>
        <div>
          <h1 className="text-2xl font-black text-zinc-900 dark:text-white flex items-center gap-3">
            <Newspaper className="w-7 h-7 text-teal-500" /> Edit Berita
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400 text-sm mt-1">
            Perbarui konten berita di bawah.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="max-w-4xl mx-auto space-y-6">
        {/* Judul */}
        <div>
          <label className="block text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase mb-1.5">
            Judul Berita *
          </label>
          <input
            type="text"
            value={judul}
            onChange={(e) => setJudul(e.target.value)}
            maxLength={500}
            placeholder="Contoh: BKSDA Lepasliarkan 5 Ekor Elang Jawa ke Habitat Asli"
            className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-900 dark:text-white focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all placeholder:text-zinc-400 dark:placeholder:text-zinc-600"
          />
        </div>

        {/* Kategori + Sumber */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase mb-1.5">
              Kategori
            </label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-900 dark:text-white focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all"
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
            <label className="block text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase mb-1.5">
              Sumber
            </label>
            <input
              type="text"
              value={sumber}
              onChange={(e) => setSumber(e.target.value)}
              maxLength={255}
              placeholder="Opsional: Kompas.com"
              className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-900 dark:text-white focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all placeholder:text-zinc-400 dark:placeholder:text-zinc-600"
            />
          </div>
        </div>

        {/* Thumbnail */}
        <div>
          <label className="block text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase mb-1.5">
            Thumbnail
          </label>
          <div className="flex items-start gap-4">
            <label className="flex-1 flex items-center justify-center gap-3 bg-zinc-50 dark:bg-zinc-900 border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded-xl px-4 py-6 cursor-pointer hover:border-teal-500 transition-all group">
              <ImagePlus className="w-6 h-6 text-zinc-400 dark:text-zinc-500 group-hover:text-teal-400 transition-colors" />
              <span className="text-sm text-zinc-500 group-hover:text-zinc-700 dark:group-hover:text-zinc-300">
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
                className="w-24 h-24 rounded-xl object-cover border border-zinc-200 dark:border-zinc-700"
              />
            )}
          </div>
        </div>

        {/* Rich Text Editor */}
        <div>
          <label className="block text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase mb-1.5">
            Konten Berita *
          </label>
          <div className="rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-800 [&_.ql-toolbar.ql-snow]:!bg-zinc-50 dark:[&_.ql-toolbar.ql-snow]:!bg-zinc-800 [&_.ql-toolbar.ql-snow]:!border-b [&_.ql-toolbar.ql-snow]:!border-zinc-200 dark:[&_.ql-toolbar.ql-snow]:!border-zinc-700 [&_.ql-container.ql-snow]:!border-none [&_.ql-editor]:!bg-white dark:[&_.ql-editor]:!bg-zinc-900 [&_.ql-editor]:!text-zinc-900 dark:[&_.ql-editor]:!text-white [&_.ql-editor]:!min-h-[350px] [&_.ql-editor]:!text-base [&_.ql-editor]:!leading-relaxed [&_.ql-editor.ql-blank::before]:!text-zinc-400 dark:[&_.ql-editor.ql-blank::before]:!text-zinc-600 [&_.ql-snow_.ql-stroke]:!stroke-zinc-600 dark:[&_.ql-snow_.ql-stroke]:!stroke-zinc-400 [&_.ql-snow_.ql-fill]:!fill-zinc-600 dark:[&_.ql-snow_.ql-fill]:!fill-zinc-400 [&_.ql-snow_.ql-picker-label]:!text-zinc-600 dark:[&_.ql-snow_.ql-picker-label]:!text-zinc-400">
            <ReactQuill
              theme="snow"
              value={konten}
              onChange={setKonten}
              modules={modules}
              formats={QUILL_FORMATS}
              placeholder="Tulis konten berita di sini..."
            />
          </div>
        </div>

        {/* Toggle Terbitkan */}
        <div className="flex items-center gap-3 bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4">
          <input
            type="checkbox"
            id="publish"
            checked={isPublished}
            onChange={(e) => setIsPublished(e.target.checked)}
            className="w-4 h-4 rounded accent-teal-500"
          />
          <label
            htmlFor="publish"
            className="text-sm text-zinc-700 dark:text-zinc-300 font-medium cursor-pointer"
          >
            Terbitkan setelah disimpan
          </label>
        </div>

        {/* Tombol Simpan */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex items-center justify-center gap-2 bg-teal-600 hover:bg-teal-500 text-white px-6 py-3 rounded-xl font-bold text-sm transition-all disabled:opacity-50 w-full md:w-auto"
        >
          {isSubmitting ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Save className="w-5 h-5" />
          )}
          {isSubmitting ? "Menyimpan..." : "Perbarui Berita"}
        </button>
      </form>
    </div>
  );
}
