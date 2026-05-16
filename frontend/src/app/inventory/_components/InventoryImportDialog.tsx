"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, Loader2, Info } from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { AxiosError } from "axios";

interface InventoryImportDialogProps {
  onImportSuccess?: () => void;
}

export function InventoryImportDialog({ onImportSuccess }: InventoryImportDialogProps) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      toast.error("Silakan pilih file terlebih dahulu.");
      return;
    }

    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      await api.post("/inventory/items/import", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      toast.success("Katalog Barang sukses diimpor massal.");
      setOpen(false);
      onImportSuccess?.();
    } catch (error: unknown) {
      const axiosError = error as AxiosError<{ message: string }>;
      const message = axiosError.response?.data?.message || "Gagal mengimpor data barang.";
      toast.error(message);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="flex items-center gap-2 bg-zinc-950 border-zinc-800 hover:bg-zinc-900 text-zinc-300 hover:text-white px-4 py-2.5 rounded-xl font-bold text-sm transition-all shadow-lg"
        >
          <Upload className="w-4 h-4 text-orange-500" /> Impor Excel
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-zinc-950 border-zinc-800 text-white sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-black flex items-center gap-2">
            <Upload className="w-5 h-5 text-orange-500" /> Impor Katalog
          </DialogTitle>
          <DialogDescription className="text-zinc-400">
            Unggah file Excel untuk mendaftarkan Master Barang secara massal.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 py-4">
          <div className="grid gap-2">
            <Label htmlFor="inventory-file-upload" className="text-zinc-400 text-xs font-bold uppercase tracking-wider">
              Pilih Berkas (.xlsx)
            </Label>
            <Input
              id="inventory-file-upload"
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileChange}
              className="bg-zinc-900 border-zinc-800 focus:border-orange-500 transition-all cursor-pointer file:text-orange-500 file:font-bold file:mr-4"
            />
          </div>

          <div className="bg-blue-500/5 border border-blue-500/20 p-4 rounded-xl space-y-2">
            <h4 className="text-xs font-bold text-blue-400 flex items-center gap-2 uppercase tracking-widest">
              <Info className="w-3 h-3" /> Format Kolom
            </h4>
            <p className="text-[10px] text-zinc-400 leading-relaxed">
              Pastikan file memiliki heading: <span className="text-zinc-200">kode_barang, nama_barang, kategori, satuan, batas_minimum</span>.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="submit"
            onClick={handleUpload}
            disabled={isUploading || !file}
            className="w-full bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-xl py-6 transition-all shadow-[0_0_20px_rgba(16,185,129,0.2)]"
          >
            {isUploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Mengunggah...
              </>
            ) : (
              "Mulai Impor"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
