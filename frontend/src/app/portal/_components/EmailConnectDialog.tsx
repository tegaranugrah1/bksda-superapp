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
    } catch (err: unknown) {
      const errorObj = err as {
        response?: {
          status?: number;
          data?: { message?: string; error?: string; retry_after?: number };
        };
      };
      if (errorObj?.response?.status === 429 && errorObj?.response?.data?.retry_after) {
        setCooldown(errorObj?.response?.data?.retry_after);
      }
      const msg =
        errorObj?.response?.data?.message ||
        errorObj?.response?.data?.error ||
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
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrimmed)) { setErrorMsg("Format alamat email tidak valid."); return; }
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
    } catch (err: unknown) {
      const errorObj = err as {
        response?: {
          status?: number;
          data?: { message?: string; error?: string; retry_after?: number };
        };
      };
      const msg =
        errorObj?.response?.data?.message ||
        errorObj?.response?.data?.error ||
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
        <div className="w-full rounded-2xl border border-[#fef3c7] bg-[#fffbeb] py-2.5 px-3.5 sm:px-4 shadow-2xs dark:border-amber-900/40 dark:from-amber-950/30 dark:via-amber-950/20 dark:to-orange-950/10">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#fef3c7] text-[#d97706] dark:bg-amber-400/10 dark:text-amber-400">
                <AlertTriangle className="h-4 w-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-[#b45309] dark:text-amber-300">
                  {isLocalEmail
                    ? "Hubungkan Akun Gmail Pribadi Anda"
                    : "Email Anda Belum Terverifikasi"}
                </h4>
                <p className="text-[11px] text-[#92400e]/90 dark:text-amber-200/80 mt-0.5 max-w-xl leading-normal">
                  {isLocalEmail
                    ? "Akun Anda saat ini menggunakan email placeholder sistem. Hubungkan Gmail Anda untuk menerima notifikasi persetujuan cuti, surat tugas, dan pemulihan kata sandi mandiri."
                    : `Tautan verifikasi telah dikirim ke ${currentEmail}. Segera periksa kotak masuk Gmail Anda agar fitur notifikasi aktif.`}
                </p>
              </div>
            </div>

            {isLocalEmail ? (
              <Button
                onClick={() => {
                  setShowChangeForm(true);
                  setOpen(true);
                }}
                size="sm"
                className="shrink-0 bg-[#ea580c] hover:bg-[#c2410c] text-white font-semibold shadow-sm"
              >
                <Mail className="w-4 h-4 mr-2" />
                Hubungkan Gmail
              </Button>
            ) : cooldown > 0 ? (
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  disabled
                  size="sm"
                  className="bg-amber-600/70 dark:bg-amber-700/60 text-white font-semibold shadow-sm cursor-not-allowed opacity-90"
                >
                  <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin text-amber-200" />
                  Tunggu ({cooldown}s)
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowChangeForm(true);
                    setOpen(true);
                  }}
                  className="text-xs border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-900/40 bg-white/70 dark:bg-slate-900/70 font-semibold"
                >
                  <Pencil className="w-3.5 h-3.5 mr-1" />
                  Ganti Email
                </Button>
              </div>
            ) : (
              <Button
                onClick={() => {
                  setShowChangeForm(false);
                  setOpen(true);
                }}
                size="sm"
                className="shrink-0 bg-[#ea580c] hover:bg-[#c2410c] text-white font-semibold shadow-sm"
              >
                <Mail className="w-4 h-4 mr-2" />
                Kirim Ulang / Ganti
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Modal Hubungkan / Perbarui Email */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#eff5ee] text-[#1e5433] border border-[#dce8dd] dark:bg-emerald-400/10 dark:text-emerald-400 mb-2">
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
