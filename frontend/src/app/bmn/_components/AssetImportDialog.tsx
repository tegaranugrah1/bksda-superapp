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
import { Upload, Loader2, AlertCircle } from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { AxiosError } from "axios";
import { useRouter } from "next/navigation";

interface AssetImportDialogProps {
  onImportSuccess?: () => void;
}

export function AssetImportDialog({ onImportSuccess }: AssetImportDialogProps) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const router = useRouter();

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
      const res = await api.post("/bmn/import-review/upload", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      toast.success(res.data.message || "File berhasil diproses. Redirecting ke halaman review...");
      setOpen(false);
      setFile(null);
      onImportSuccess?.();

      // Redirect to review page
      const batchId = res.data.batch?.id;
      if (batchId) {
        router.push(`/bmn/import-review/${batchId}`);
      } else {
        router.push("/bmn/import-review");
      }
    } catch (error: unknown) {
      const axiosError = error as AxiosError<{ error: string }>;
      const message = axiosError.response?.data?.error || "Gagal mengimpor data aset.";
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
          <Upload className="w-4 h-4 text-emerald-500" /> Impor Excel
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-zinc-950 border-zinc-800 text-white sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-black flex items-center gap-2">
            <Upload className="w-5 h-5 text-emerald-500" /> Impor Massal Aset
          </DialogTitle>
          <DialogDescription className="text-zinc-400">
            Unggah file Excel (.xlsx) lalu review perubahan sebelum diterapkan ke database.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 py-4">
          <div className="grid gap-2">
            <Label htmlFor="file-upload" className="text-zinc-400 text-xs font-bold uppercase tracking-wider">
              Pilih Berkas
            </Label>
            <Input
              id="file-upload"
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileChange}
              className="bg-zinc-900 border-zinc-800 focus:border-emerald-500 transition-all cursor-pointer file:text-emerald-500 file:font-bold file:mr-4"
            />
          </div>

          <div className="bg-emerald-500/5 border border-emerald-500/20 p-4 rounded-xl space-y-2">
            <h4 className="text-xs font-bold text-emerald-400 flex items-center gap-2 uppercase tracking-widest">
              <AlertCircle className="w-4 h-4" /> Aturan Format
            </h4>
            <ul className="text-[10px] text-zinc-400 list-disc list-inside space-y-1">
              <li>Header kolom wajib ada di baris pertama.</li>
              <li>Kolom wajib: <code className="text-emerald-500">kode_barang</code>, <code className="text-emerald-500">nup</code>, <code className="text-emerald-500">nama_barang</code>.</li>
              <li>Data akan di-review dulu sebelum masuk database.</li>
              <li>Aset yang sudah ada akan ditandai sebagai &quot;update&quot;.</li>
              <li>Maksimal ukuran file: 20MB.</li>
            </ul>
          </div>
        </div>

        <DialogFooter className="gap-3 sm:gap-0">
          <Button
            variant="ghost"
            onClick={() => setOpen(false)}
            className="text-zinc-500 hover:text-white hover:bg-zinc-900"
          >
            Batal
          </Button>
          <Button
            onClick={handleUpload}
            disabled={!file || isUploading}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition-all min-w-[120px]"
          >
            {isUploading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Memproses...
              </>
            ) : (
              "Upload & Review"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
