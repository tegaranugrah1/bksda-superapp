"use client";

import React, { useState, useEffect } from "react";
import {
  Mail,
  AlertTriangle,
  ShieldCheck,
  ArrowRight,
  Loader2,
  RefreshCw,
  Send,
  Pencil,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { api } from "@/lib/api";

interface EmailConnectDialogProps {
  currentEmail?: string | null;
  isVerified?: boolean;
  initialCooldown?: number;
  onSuccess?: () => void;
}

export function EmailConnectDialog({
  currentEmail,
  isVerified = false,
  initialCooldown = 0,
  onSuccess,
}: EmailConnectDialogProps) {
  const [open, setOpen] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showChangeForm, setShowChangeForm] = useState(false);
  const [cooldown, setCooldown] = useState(initialCooldown);

  useEffect(() => {
    setCooldown(initialCooldown);
  }, [initialCooldown]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => (prev > 1 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const isLocalEmail =
    !currentEmail || currentEmail.toLowerCase().endsWith(".local");
  const needsVerification = isLocalEmail || !isVerified;

  useEffect(() => {
    if (open) {
      if (currentEmail && !currentEmail.toLowerCase().endsWith(".local")) {
        setNewEmail(currentEmail);
        setShowChangeForm(false);
      } else {
        setNewEmail("");
        setShowChangeForm(true);
      }
      setErrorMsg(null);
      setCurrentPassword("");
    }
  }, [open, currentEmail]);

  // One-click Resend Verification to existing email (no password needed!)
  const handleResendVerification = async () => {
    setResending(true);
    setErrorMsg(null);
    try {
      const resp = await api.post("/email/verification-notification");
      setCooldown(resp.data?.cooldown_seconds || 60);
      toast.success(
        resp.data?.message || "Tautan verifikasi baru berhasil dikirim ke email Anda!"
      );
      setOpen(false);
      onSuccess?.();
    } catch (err: any) {
      if (err?.response?.status === 429 && err?.response?.data?.retry_after) {
        setCooldown(err.response.data.retry_after);
      }
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        "Gagal mengirim ulang email verifikasi.";
      setErrorMsg(msg);
      toast.error(msg);
    } finally {
      setResending(false);
    }
  };

  // Change Email Submit (requires current password)
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

      setCooldown(resp.data?.cooldown_seconds || 60);
      toast.success(
        resp.data?.message || `Tautan verifikasi berhasil dikirim ke ${emailTrimmed}!`
      );
      setOpen(false);
      setNewEmail("");
      setCurrentPassword("");
      onSuccess?.();
    } catch (err: any) {
      const msg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        "Gagal memperbarui email akun.";
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
        <section
          className="bg-[#fefcf6] border border-[#faecd0] rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs dark:bg-amber-950/20 dark:border-amber-900/50 mb-6"
          data-purpose="verification-warning-banner"
        >
          <div className="flex items-start gap-3.5">
            <div className="w-9 h-9 rounded-xl bg-[#fdf3dc] text-[#92400e] flex items-center justify-center shrink-0 dark:bg-amber-900/30 dark:text-amber-300">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#92400e] dark:text-amber-300 leading-snug">
                {isLocalEmail
                  ? "Hubungkan Akun Gmail Pribadi Anda"
                  : "Email Anda Belum Terverifikasi"}
              </h2>
              <p className="text-xs text-[#92400e]/85 dark:text-amber-200/80 mt-0.5 leading-relaxed">
                {isLocalEmail
                  ? "Akun Anda saat ini menggunakan email placeholder sistem. Hubungkan Gmail Anda untuk menerima notifikasi persetujuan cuti, surat tugas, dan pemulihan kata sandi mandiri."
                  : <>Tautan verifikasi telah dikirim ke <span className="font-semibold text-[#92400e] dark:text-amber-200">{currentEmail}</span>. Segera periksa kotak masuk Gmail Anda agar fitur notifikasi aktif.</>}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {isLocalEmail ? (
              <button
                type="button"
                onClick={() => {
                  setShowChangeForm(true);
                  setOpen(true);
                }}
                className="shrink-0 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-[#c25e00] hover:bg-[#a64e00] text-white font-semibold text-xs transition-colors shadow-xs cursor-pointer"
              >
                <Mail className="w-3.5 h-3.5" />
                <span>Hubungkan Gmail</span>
              </button>
            ) : cooldown > 0 ? (
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  disabled
                  className="shrink-0 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-[#c25e00]/70 text-white font-semibold text-xs shadow-xs cursor-not-allowed opacity-90"
                >
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Tunggu ({cooldown}s)</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowChangeForm(true);
                    setOpen(true);
                  }}
                  className="text-xs border border-amber-300 dark:border-amber-800 text-[#92400e] dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-900/40 bg-white/70 dark:bg-slate-900/70 font-semibold px-3 py-2 rounded-xl cursor-pointer"
                >
                  <Pencil className="w-3.5 h-3.5 inline mr-1" />
                  Ganti Email
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setShowChangeForm(false);
                  setOpen(true);
                }}
                className="shrink-0 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-[#c25e00] hover:bg-[#a64e00] text-white font-semibold text-xs transition-colors shadow-xs cursor-pointer"
              >
                <Mail className="w-3.5 h-3.5" />
                <span>Kirim Ulang / Ganti</span>
              </button>
            )}
          </div>
        </section>
      )}

      {/* Modal Hubungkan / Perbarui Email */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:bg-emerald-400/10 dark:text-emerald-400 mb-2">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <DialogTitle className="text-center text-lg font-bold">
              {isLocalEmail ? "Hubungkan Alamat Email" : "Verifikasi Alamat Email"}
            </DialogTitle>
            <DialogDescription className="text-center text-xs text-slate-500">
              Gunakan akun Gmail pribadi atau dinas aktif Anda. Kami akan mengirimkan tautan konfirmasi untuk mengaktifkannya.
            </DialogDescription>
          </DialogHeader>

          {errorMsg && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-400">
              {errorMsg}
            </div>
          )}

          {/* Skenario 1: Email asli sudah terisi tapi belum diverifikasi */}
          {!isLocalEmail && !showChangeForm ? (
            <div className="space-y-4 pt-2">
              <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/60 space-y-2 text-center">
                <span className="text-xs text-slate-500 dark:text-slate-400 block font-medium">
                  Alamat Email Terdaftar
                </span>
                <span className="text-sm font-bold text-slate-900 dark:text-slate-100 block font-mono">
                  {currentEmail}
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300">
                  <AlertTriangle className="w-3 h-3" />
                  Belum Terverifikasi
                </span>
              </div>

              <div className="space-y-2">
                <Button
                  type="button"
                  onClick={handleResendVerification}
                  disabled={resending || cooldown > 0}
                  className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm gap-2"
                >
                  {resending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Mengirim Tautan Verifikasi...</span>
                    </>
                  ) : cooldown > 0 ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-emerald-200" />
                      <span>Tautan Telah Dikirim (Tunggu {cooldown}s)</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Kirim Ulang Tautan Verifikasi</span>
                    </>
                  )}
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setShowChangeForm(true)}
                  className="w-full text-xs text-slate-500 hover:text-slate-900 dark:hover:text-slate-200 font-semibold"
                >
                  <Pencil className="w-3.5 h-3.5 mr-1.5" />
                  Ganti ke Alamat Email Lain
                </Button>
              </div>
            </div>
          ) : (
            /* Skenario 2: Form Input Email Baru (Wajib kata sandi saat ini) */
            <form onSubmit={handleSubmit} className="space-y-4 pt-2">
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
                  className="h-10 text-sm rounded-xl"
                  autoFocus
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="current-pw" className="text-xs font-semibold flex items-center justify-between">
                  <span>Kata Sandi Akun Saat Ini</span>
                  <span className="text-[10px] text-slate-400 font-normal">Wajib diisi</span>
                </Label>
                <Input
                  id="current-pw"
                  type="password"
                  autoComplete="current-password"
                  placeholder="Masukkan kata sandi login Anda"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                  className="h-10 text-sm rounded-xl"
                />
                <p className="text-[11px] text-slate-400">
                  Diperlukan untuk memverifikasi bahwa perubahan dilakukan oleh pemilik akun sah.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                {!isLocalEmail && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowChangeForm(false)}
                    disabled={loading}
                    className="text-xs rounded-xl"
                  >
                    Kembali
                  </Button>
                )}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setOpen(false)}
                  disabled={loading}
                  className="text-xs rounded-xl"
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={loading}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl"
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
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
