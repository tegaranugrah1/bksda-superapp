"use client";

import React, { useState } from "react";
import { Mail, CheckCircle2, AlertTriangle, ShieldCheck, ArrowRight, Loader2, KeyRound } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { api } from "@/lib/api";

interface EmailConnectDialogProps {
  currentEmail?: string | null;
  isVerified?: boolean;
  onSuccess?: () => void;
}

export function EmailConnectDialog({ currentEmail, isVerified = false, onSuccess }: EmailConnectDialogProps) {
  const [open, setOpen] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const isLocalEmail = !currentEmail || currentEmail.toLowerCase().endsWith(".local");
  const needsVerification = isLocalEmail || !isVerified;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const emailTrimmed = newEmail.trim().toLowerCase();
    if (!emailTrimmed) {
      setErrorMsg("Alamat email wajib diisi.");
      return;
    }
    if (emailTrimmed.endsWith(".local")) {
      setErrorMsg("Alamat email tidak boleh menggunakan domain internal .local.");
      return;
    }
    if (!currentPassword) {
      setErrorMsg("Kata sandi akun saat ini wajib diisi untuk verifikasi keamanan.");
      return;
    }

    setLoading(true);
    try {
      const resp = await api.put("/me/email", {
        email: emailTrimmed,
        current_password: currentPassword,
      });

      toast.success(resp.data?.message || "Tautan verifikasi berhasil dikirim ke email Anda!");
      setOpen(false);
      setNewEmail("");
      setCurrentPassword("");
      onSuccess?.();
    } catch (err: any) {
      const msg = err.response?.data?.message || err.response?.data?.error || "Gagal memperbarui email akun.";
      setErrorMsg(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Banner Notifikasi jika email belum aktif/resmi */}
      {needsVerification && (
        <div className="mb-6 rounded-2xl border border-amber-200/80 bg-linear-to-r from-amber-50 via-amber-50/50 to-orange-50/40 p-4 shadow-sm dark:border-amber-900/40 dark:from-amber-950/30 dark:via-amber-950/20 dark:to-orange-950/10">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:bg-amber-400/10 dark:text-amber-400">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  {isLocalEmail ? "Hubungkan Akun Gmail Pribadi Anda" : "Email Anda Belum Terverifikasi"}
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 max-w-xl">
                  {isLocalEmail
                    ? "Akun Anda saat ini menggunakan email placeholder sistem. Hubungkan Gmail Anda untuk menerima notifikasi persetujuan cuti, surat tugas, dan pemulihan kata sandi mandiri."
                    : `Tautan verifikasi telah dikirim ke ${currentEmail}. Segera periksa kotak masuk Gmail Anda agar fitur notifikasi aktif.`}
                </p>
              </div>
            </div>

            <Button
              onClick={() => setOpen(true)}
              size="sm"
              className="shrink-0 bg-amber-600 hover:bg-amber-700 text-white font-semibold shadow-sm"
            >
              <Mail className="w-4 h-4 mr-2" />
              {isLocalEmail ? "Hubungkan Gmail" : "Ganti / Kirim Ulang"}
            </Button>
          </div>
        </div>
      )}

      {/* Modal Hubungkan / Perbarui Email */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:bg-emerald-400/10 dark:text-emerald-400 mb-2">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <DialogTitle className="text-center text-lg font-bold">
              Hubungkan Alamat Email
            </DialogTitle>
            <DialogDescription className="text-center text-xs text-slate-500">
              Gunakan akun Gmail pribadi atau dinas aktif Anda. Kami akan mengirimkan tautan konfirmasi untuk mengaktifkannya.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            {errorMsg && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-400">
                {errorMsg}
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="new-email" className="text-xs font-semibold">
                Alamat Gmail Baru
              </Label>
              <Input
                id="new-email"
                type="email"
                placeholder="nama.pegawai@gmail.com"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                required
                className="h-10 text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="current-pw" className="text-xs font-semibold">
                Kata Sandi Akun Saat Ini
              </Label>
              <Input
                id="current-pw"
                type="password"
                placeholder="Masukkan kata sandi login Anda"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                className="h-10 text-sm"
              />
              <p className="text-[11px] text-slate-400">
                Wajib diisi untuk memastikan hanya pemilik akun sah yang dapat mengubah email.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setOpen(false)}
                disabled={loading}
              >
                Batal
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={loading}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Menyimpan...
                  </>
                ) : (
                  <>
                    Simpan & Kirim Tautan
                    <ArrowRight className="w-4 h-4 ml-1.5" />
                  </>
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
