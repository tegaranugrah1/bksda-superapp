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
        <div className="w-full rounded-3xl border border-[var(--ds-status-warning-border)] bg-[var(--ds-status-warning-bg)] p-4 shadow-xs">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--ds-surface)] border border-[var(--ds-status-warning-border)] text-[var(--ds-status-warning-fg)]">
                <AlertTriangle className="h-4 w-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-[var(--ds-status-warning-fg)]">
                  {isLocalEmail
                    ? "Hubungkan Akun Gmail Pribadi Anda"
                    : "Email Anda Belum Terverifikasi"}
                </h4>
                <p className="text-xs text-[var(--ds-status-warning-fg)] mt-1 max-w-xl leading-normal">
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
                className="shrink-0 bg-[var(--ds-accent-solid)] hover:bg-[var(--ds-accent-hover)] text-[var(--ds-accent-on-solid)] font-semibold rounded-lg shadow-xs cursor-pointer"
              >
                <Mail className="w-4 h-4 mr-2" />
                Hubungkan Gmail
              </Button>
            ) : cooldown > 0 ? (
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  disabled
                  size="sm"
                  className="bg-amber-600/80 dark:bg-amber-700/70 text-white font-semibold rounded-lg shadow-xs cursor-not-allowed opacity-90 tabular-nums"
                >
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin text-amber-100" />
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
                  className="text-xs rounded-lg border-[var(--ds-status-warning-border)] text-[var(--ds-status-warning-fg)] hover:bg-[var(--ds-surface)] bg-[var(--ds-surface)] font-semibold cursor-pointer"
                >
                  <Pencil className="w-4 h-4 mr-1" />
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
                className="shrink-0 bg-[var(--ds-accent-solid)] hover:bg-[var(--ds-accent-hover)] text-[var(--ds-accent-on-solid)] font-semibold rounded-lg shadow-xs cursor-pointer"
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
        <DialogContent data-module="portal" className="sm:max-w-md rounded-3xl border border-slate-200/80 dark:border-zinc-800 bg-[var(--ds-surface)] p-6 shadow-lg">
          <DialogHeader>
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-[var(--ds-accent-soft)] text-[var(--ds-accent-fg)] border border-[var(--ds-accent-soft-border)] mb-2">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <DialogTitle className="text-center text-xl font-bold text-[var(--ds-fg)]">
              {isLocalEmail ? "Hubungkan Alamat Email" : "Verifikasi Alamat Email"}
            </DialogTitle>
            <DialogDescription className="text-center text-xs text-[var(--ds-fg-muted)]">
              Gunakan akun Gmail pribadi atau dinas aktif Anda. Kami akan mengirimkan tautan konfirmasi untuk mengaktifkannya.
            </DialogDescription>
          </DialogHeader>

          {errorMsg && (
            <div className="rounded-lg border border-[var(--ds-status-danger-border)] bg-[var(--ds-status-danger-bg)] p-3 text-xs text-[var(--ds-status-danger-fg)]">
              {errorMsg}
            </div>
          )}

          {/* Skenario 1: Email asli sudah terisi tapi belum diverifikasi */}
          {!isLocalEmail && !showChangeForm ? (
            <div className="space-y-4 pt-2">
              <div className="p-4 rounded-lg bg-[var(--ds-status-warning-bg)] border border-[var(--ds-status-warning-border)] space-y-2 text-center">
                <span className="text-xs text-[var(--ds-fg-muted)] block font-medium">
                  Alamat Email Terdaftar
                </span>
                <span className="text-sm font-bold text-[var(--ds-fg)] block font-mono">
                  {currentEmail}
                </span>
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-[var(--ds-surface)] text-[var(--ds-status-warning-fg)] border border-[var(--ds-status-warning-border)]">
                  <AlertTriangle className="w-3 h-3" />
                  Belum Terverifikasi
                </span>
              </div>

              <div className="space-y-2">
                <Button
                  type="button"
                  onClick={handleResendVerification}
                  disabled={resending || cooldown > 0}
                  className="w-full h-11 bg-[var(--ds-accent-solid)] hover:bg-[var(--ds-accent-hover)] text-[var(--ds-accent-on-solid)] font-bold text-xs rounded-lg shadow-xs gap-2 cursor-pointer tabular-nums"
                >
                  {resending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Mengirim Tautan Verifikasi...</span>
                    </>
                  ) : cooldown > 0 ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
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
                  className="w-full text-xs text-[var(--ds-fg-muted)] hover:text-[var(--ds-fg)] font-semibold rounded-lg cursor-pointer"
                >
                  <Pencil className="w-4 h-4 mr-2" />
                  Ganti ke Alamat Email Lain
                </Button>
              </div>
            </div>
          ) : (
            /* Skenario 2: Form Input Email Baru (Wajib kata sandi saat ini) */
            <form onSubmit={handleSubmit} className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label htmlFor="new-email" className="text-xs font-semibold text-[var(--ds-fg)]">
                  Alamat Gmail Baru
                </Label>
                <Input
                  id="new-email"
                  type="email"
                  placeholder="nama.pegawai@gmail.com"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  required
                  className="h-10 text-sm rounded-lg"
                  autoFocus
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="current-pw" className="text-xs font-semibold flex items-center justify-between text-[var(--ds-fg)]">
                  <span>Kata Sandi Akun Saat Ini</span>
                  <span className="text-xs text-[var(--ds-fg-muted)] font-normal">Wajib diisi</span>
                </Label>
                <Input
                  id="current-pw"
                  type="password"
                  autoComplete="current-password"
                  placeholder="Masukkan kata sandi login Anda"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                  className="h-10 text-sm rounded-lg"
                />
                <p className="text-xs text-[var(--ds-fg-muted)]">
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
                    className="text-xs rounded-lg cursor-pointer"
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
                  className="text-xs rounded-lg cursor-pointer"
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={loading}
                  className="bg-[var(--ds-accent-solid)] hover:bg-[var(--ds-accent-hover)] text-[var(--ds-accent-on-solid)] font-semibold text-xs rounded-lg shadow-xs cursor-pointer"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Menyimpan...
                    </>
                  ) : (
                    <>
                      Simpan & Kirim Tautan
                      <ArrowRight className="w-4 h-4 ml-2" />
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
