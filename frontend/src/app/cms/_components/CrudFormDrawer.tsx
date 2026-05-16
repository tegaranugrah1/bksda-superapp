"use client";

import { useState, useEffect, useRef, FormEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { X, Save, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { CrudPageConfig } from "./types";

interface Props {
  open: boolean;
  onClose: () => void;
  config: CrudPageConfig;
  editingRecord: Record<string, unknown> | null;
}

function getInitialFormData(
  editingRecord: Record<string, unknown> | null,
  fields: Props["config"]["fields"],
): Record<string, unknown> {
  if (!editingRecord) return {};
  const initial: Record<string, unknown> = {};
  fields.forEach((f) => {
    if (f.type !== "file") initial[f.key] = editingRecord[f.key] ?? "";
  });
  return initial;
}

export default function CrudFormDrawer({
  open,
  onClose,
  config,
  editingRecord,
}: Props) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<Record<string, unknown>>(() =>
    getInitialFormData(editingRecord, config.fields),
  );
  const [files, setFiles] = useState<Record<string, File>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEditing = !!editingRecord;
  const prevOpenRef = useRef(open);

  // Handle open state changes - only set state when transitioning
  useEffect(() => {
    if (open && !prevOpenRef.current) {
      // Transitioning from closed to open - reset form data
      setFormData(getInitialFormData(editingRecord, config.fields));
      setFiles({});
    }
    prevOpenRef.current = open;
  }, [open, editingRecord, config.fields]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const hasFiles = Object.keys(files).length > 0;

      if (hasFiles) {
        // Jika ada file, gunakan FormData (multipart)
        const formPayload = new FormData();
        Object.entries(formData).forEach(([k, v]) => {
          if (v !== undefined && v !== null) formPayload.append(k, String(v));
        });
        Object.entries(files).forEach(([k, f]) => formPayload.append(k, f));

        if (isEditing && editingRecord) {
          await api.put(
            `${config.apiEndpoint}/${editingRecord.id}`,
            formPayload,
            {
              headers: { "Content-Type": "multipart/form-data" },
            },
          );
          toast.success("Data berhasil diperbarui.");
        } else {
          await api.post(config.apiEndpoint, formPayload, {
            headers: { "Content-Type": "multipart/form-data" },
          });
          toast.success("Data berhasil ditambahkan.");
        }
      } else {
        if (isEditing && editingRecord) {
          await api.put(
            `${config.apiEndpoint}/${editingRecord.id}`,
            formData,
            {},
          );
          toast.success("Data berhasil diperbarui.");
        } else {
          await api.post(config.apiEndpoint, formData, {});
          toast.success("Data berhasil ditambahkan.");
        }
      }

      queryClient.invalidateQueries({
        queryKey: [`cms-crud-${config.apiEndpoint}`],
      });
      onClose();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || "Gagal menyimpan data.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-lg bg-white dark:bg-zinc-900 border-l border-zinc-200 dark:border-zinc-800 h-full overflow-y-auto animate-in slide-in-from-right duration-300 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-black text-zinc-900 dark:text-white">
            {isEditing ? "Edit Data" : "Tambah Data"}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg"
          >
            <X className="w-5 h-5 text-zinc-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {config.fields.map((field) => (
            <div key={field.key}>
              <label className="block text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase mb-1.5">
                {field.label} {field.required && "*"}
              </label>
              {field.type === "textarea" ? (
                <textarea
                  value={String(formData[field.key] ?? "")}
                  onChange={(e) =>
                    setFormData((p) => ({ ...p, [field.key]: e.target.value }))
                  }
                  rows={4}
                  placeholder={field.placeholder}
                  maxLength={field.maxLength}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-teal-500 transition-all resize-none placeholder:text-zinc-600"
                />
              ) : field.type === "select" ? (
                <select
                  value={String(formData[field.key] ?? "")}
                  onChange={(e) =>
                    setFormData((p) => ({ ...p, [field.key]: e.target.value }))
                  }
                  className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-3 text-sm text-zinc-900 dark:text-white focus:outline-none focus:border-teal-500 transition-all"
                >
                  <option value="">— Pilih —</option>
                  {field.options?.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              ) : field.type === "file" ? (
                <input
                  type="file"
                  accept={field.accept || "image/*"}
                  onChange={(e) => {
                    if (e.target.files?.[0])
                      setFiles((p) => ({
                        ...p,
                        [field.key]: e.target.files![0],
                      }));
                  }}
                  className="w-full text-sm text-zinc-400 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-bold file:bg-teal-600 file:text-white hover:file:bg-teal-500 file:cursor-pointer"
                />
              ) : field.type === "checkbox" ? (
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!!formData[field.key]}
                    onChange={(e) =>
                      setFormData((p) => ({
                        ...p,
                        [field.key]: e.target.checked,
                      }))
                    }
                    className="w-4 h-4 rounded accent-teal-500"
                  />
                  <span className="text-sm text-zinc-600 dark:text-zinc-300">
                    {field.placeholder}
                  </span>
                </label>
              ) : (
                <input
                  type={
                    field.type === "url"
                      ? "url"
                      : field.type === "number"
                        ? "number"
                        : "text"
                  }
                  value={String(formData[field.key] ?? "")}
                  onChange={(e) =>
                    setFormData((p) => ({ ...p, [field.key]: e.target.value }))
                  }
                  placeholder={field.placeholder}
                  maxLength={field.maxLength}
                  className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-3 text-sm text-zinc-900 dark:text-white focus:outline-none focus:border-teal-500 transition-all placeholder:text-zinc-400 dark:placeholder:text-zinc-600"
                />
              )}
            </div>
          ))}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full flex items-center justify-center gap-2 bg-teal-600 hover:bg-teal-500 text-white py-3 rounded-xl font-bold text-sm transition-all disabled:opacity-50 mt-4"
          >
            {isSubmitting ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Save className="w-5 h-5" />
            )}
            {isSubmitting ? "Menyimpan..." : "Simpan"}
          </button>
        </form>
      </div>
    </div>
  );
}
