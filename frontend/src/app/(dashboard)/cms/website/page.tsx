"use client";

import { useState, useEffect, useRef, FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Settings, Save, Loader2, ImagePlus } from "lucide-react";
import { toast } from "sonner";

function Field({
  label,
  field,
  type = "text",
  value,
  onChange,
}: {
  label: string;
  field: string;
  type?: string;
  value: string;
  onChange: (field: string, value: string) => void;
}) {
  if (type === "textarea") {
    return (
      <div>
        <label className="block text-xs font-bold text-zinc-400 uppercase mb-1.5">
          {label}
        </label>
        <textarea
          value={value}
          onChange={(e) => onChange(field, e.target.value)}
          rows={3}
          className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-teal-500 transition-all resize-none"
        />
      </div>
    );
  }
  return (
    <div>
      <label className="block text-xs font-bold text-zinc-400 uppercase mb-1.5">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(field, e.target.value)}
        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-teal-500 transition-all"
      />
    </div>
  );
}

export default function WebsiteSettingsPage() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<Record<string, unknown>>({});
  const [logo, setLogo] = useState<File | null>(null);
  const [favicon, setFavicon] = useState<File | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const prevDataRef = useRef<unknown>(null);

  // Tarik data pengaturan yang sudah ada
  const { data, isLoading } = useQuery({
    queryKey: ["cms-website-settings"],
    queryFn: async () => (await api.get("/cms/admin/website")).data?.data,
  });

  // Isi form saat data berubah - hanya jika data benar-benar berbeda
  useEffect(() => {
    if (data && data !== prevDataRef.current) {
      prevDataRef.current = data;
      setForm(data as Record<string, unknown>);
    }
  }, [data]);

  const handleChange = (key: string, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const payload = new FormData();
      const fields = [
        "nama_instansi",
        "alamat",
        "telepon",
        "email",
        "fax",
        "tentang",
        "facebook",
        "instagram",
        "youtube",
        "twitter",
      ];
      fields.forEach((f) => {
        if (form[f]) payload.append(f, String(form[f]));
      });
      if (logo) payload.append("logo", logo);
      if (favicon) payload.append("favicon", favicon);

      await api.put("/cms/admin/website", payload, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      toast.success("Pengaturan website berhasil disimpan.");
      queryClient.invalidateQueries({ queryKey: ["cms-website-settings"] });
    } catch {
      toast.error("Gagal menyimpan pengaturan.");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading)
    return (
      <div className="p-10 text-center">
        <Loader2 className="w-8 h-8 animate-spin text-teal-500 mx-auto" />
      </div>
    );

  return (
    <div className="p-6 md:p-10 max-w-3xl animate-in fade-in slide-in-from-bottom-4 duration-500">
      <h1 className="text-3xl font-black text-white flex items-center gap-3 mb-2">
        <Settings className="w-8 h-8 text-teal-500" /> Pengaturan Website
      </h1>
      <p className="text-zinc-400 text-sm mb-8">
        Konfigurasi identitas dan kontak website publik BKSDA.
      </p>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Identitas */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5 space-y-4">
          <p className="text-xs font-black text-zinc-500 uppercase tracking-widest">
            Identitas Instansi
          </p>
          <Field
            label="Nama Instansi"
            field="nama_instansi"
            value={String(form.nama_instansi ?? "")}
            onChange={handleChange}
          />
          <Field
            label="Alamat"
            field="alamat"
            type="textarea"
            value={String(form.alamat ?? "")}
            onChange={handleChange}
          />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Field
              label="Telepon"
              field="telepon"
              value={String(form.telepon ?? "")}
              onChange={handleChange}
            />
            <Field
              label="Email"
              field="email"
              type="email"
              value={String(form.email ?? "")}
              onChange={handleChange}
            />
            <Field
              label="Fax"
              field="fax"
              value={String(form.fax ?? "")}
              onChange={handleChange}
            />
          </div>
          <Field
            label="Tentang (Footer)"
            field="tentang"
            type="textarea"
            value={String(form.tentang ?? "")}
            onChange={handleChange}
          />
        </div>

        {/* Sosial Media */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5 space-y-4">
          <p className="text-xs font-black text-zinc-500 uppercase tracking-widest">
            Sosial Media
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field
              label="Facebook"
              field="facebook"
              type="url"
              value={String(form.facebook ?? "")}
              onChange={handleChange}
            />
            <Field
              label="Instagram"
              field="instagram"
              type="url"
              value={String(form.instagram ?? "")}
              onChange={handleChange}
            />
            <Field
              label="YouTube"
              field="youtube"
              type="url"
              value={String(form.youtube ?? "")}
              onChange={handleChange}
            />
            <Field
              label="Twitter / X"
              field="twitter"
              type="url"
              value={String(form.twitter ?? "")}
              onChange={handleChange}
            />
          </div>
        </div>

        {/* Logo & Favicon */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5 space-y-4">
          <p className="text-xs font-black text-zinc-500 uppercase tracking-widest">
            Branding
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-zinc-400 uppercase mb-1.5">
                Logo
              </label>
              <label className="flex items-center gap-2 bg-zinc-900 border-2 border-dashed border-zinc-700 rounded-xl px-4 py-4 cursor-pointer hover:border-teal-500 transition-all">
                <ImagePlus className="w-5 h-5 text-zinc-500" />
                <span className="text-sm text-zinc-500">
                  {logo ? logo.name : "Pilih logo..."}
                </span>
                <input
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={(e) => setLogo(e.target.files?.[0] || null)}
                />
              </label>
            </div>
            <div>
              <label className="block text-xs font-bold text-zinc-400 uppercase mb-1.5">
                Favicon
              </label>
              <label className="flex items-center gap-2 bg-zinc-900 border-2 border-dashed border-zinc-700 rounded-xl px-4 py-4 cursor-pointer hover:border-teal-500 transition-all">
                <ImagePlus className="w-5 h-5 text-zinc-500" />
                <span className="text-sm text-zinc-500">
                  {favicon ? favicon.name : "Pilih favicon..."}
                </span>
                <input
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={(e) => setFavicon(e.target.files?.[0] || null)}
                />
              </label>
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={isSaving}
          className="flex items-center gap-2 bg-teal-600 hover:bg-teal-500 text-white px-6 py-3 rounded-xl font-bold text-sm transition-all disabled:opacity-50"
        >
          {isSaving ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Save className="w-5 h-5" />
          )}{" "}
          Simpan Pengaturan
        </button>
      </form>
    </div>
  );
}
