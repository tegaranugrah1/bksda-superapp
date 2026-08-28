"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sparkles, BookmarkPlus, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { VisumSpdData } from "./VisumSpdDocument";

interface VisumSaveAsTemplateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentFormData: VisumSpdData;
  onTemplateSaved: (newTemplateId?: number) => void;
}

export default function VisumSaveAsTemplateModal({
  open,
  onOpenChange,
  currentFormData,
  onTemplateSaved,
}: VisumSaveAsTemplateModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isDefault, setIsDefault] = useState(false);
  const [autoToday, setAutoToday] = useState(true);
  const [saving, setSaving] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Nama template wajib diisi.");
      return;
    }

    setSaving(true);
    try {
      const res = await api.post("/api/keuangan/visum/templates", {
        name: name.trim(),
        description: description.trim() || null,
        is_default: isDefault,
        auto_today_date: autoToday,
        data: currentFormData,
      });

      if (res.data?.success) {
        toast.success(`Template "${name}" berhasil disimpan.`);
        setName("");
        setDescription("");
        setIsDefault(false);
        setAutoToday(true);
        onOpenChange(false);
        onTemplateSaved(res.data?.data?.id);
      }
    } catch (err) {
      console.error(err);
      toast.error("Gagal menyimpan template.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md w-[95vw] rounded-2xl p-6">
        <DialogHeader className="text-left">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-amber-500/10 p-2.5 text-amber-600 dark:text-amber-400">
              <BookmarkPlus className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-zinc-900 dark:text-white">
                Simpan Form Sebagai Template Baru
              </DialogTitle>
              <DialogDescription className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                Simpan data perjalanan dinas saat ini agar dapat digunakan kembali secara cepat.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSave} className="mt-4 space-y-4">
          <div>
            <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              Nama Template *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Contoh: Monitoring Orangutan Berau, Patroli SKW II"
              className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-500/10 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              Deskripsi / Keterangan (Opsional)
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Keterangan singkat lokasi / maksud perjalanan dinas"
              className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-500/10 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
            />
          </div>

          <div className="space-y-2 rounded-xl bg-zinc-50 p-3 dark:bg-zinc-900/50">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="saveAutoToday"
                checked={autoToday}
                onChange={(e) => setAutoToday(e.target.checked)}
                className="h-4 w-4 rounded text-amber-600 focus:ring-amber-500"
              />
              <label htmlFor="saveAutoToday" className="text-xs text-zinc-700 dark:text-zinc-300 cursor-pointer">
                Gunakan Tanggal Hari Ini Secara Otomatis saat template dimuat
              </label>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="saveDefault"
                checked={isDefault}
                onChange={(e) => setIsDefault(e.target.checked)}
                className="h-4 w-4 rounded text-amber-600 focus:ring-amber-500"
              />
              <label htmlFor="saveDefault" className="text-xs text-zinc-700 dark:text-zinc-300 cursor-pointer">
                Jadikan sebagai Template Default Visum SPD
              </label>
            </div>
          </div>

          <DialogFooter className="mt-4 flex gap-2 sm:justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="text-xs"
            >
              Batal
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={saving}
              className="flex items-center gap-1.5 bg-amber-600 text-xs font-semibold text-white hover:bg-amber-700"
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
              <span>Simpan Template</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
