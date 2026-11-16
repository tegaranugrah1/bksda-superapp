"use client";

import React, { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import QRCode from "react-qr-code";
import {
  ShieldCheck,
  Copy,
  Check,
  Eye,
  EyeOff,
  Loader2,
  Lock,
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

/**
 * Modal Wajib Ganti Password (HTTP 423 Gate).
 * Tidak dapat ditutup sampai pengguna berhasil mengganti kata sandi sementara.
 */
export function ChangePasswordModal({
  open,
  onClose,
  onSuccess,
  isMandatory = false,
}: {
  open: boolean;
  onClose?: () => void;
  onSuccess?: () => void;
  isMandatory?: boolean;
}) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!currentPassword) {
      setErrorMsg("Password saat ini wajib diisi.");
      return;
    }
    if (newPassword.length < 8) {
      setErrorMsg("Kata sandi baru minimal harus terdiri dari 8 karakter.");
      return;
    }
    if (newPassword !== confirmation) {
      setErrorMsg("Konfirmasi kata sandi baru tidak cocok.");
      return;
    }
    if (newPassword === currentPassword) {
      setErrorMsg("Password baru tidak boleh sama dengan password saat ini.");
      return;
    }

    setLoading(true);
    try {
      await api.post("/me/change-password", {
        current_password: currentPassword,
        new_password: newPassword,
        new_password_confirmation: confirmation,
      });

      toast.success(
        isMandatory
          ? "Kata sandi berhasil diubah! Akses modul kini terbuka."
          : "Kata sandi akun Anda berhasil diperbarui!"
      );
      setCurrentPassword("");
      setNewPassword("");
      setConfirmation("");
      onSuccess?.();
      onClose?.();
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { errors?: Record<string, string[]>; message?: string } } };
      const msg =
        errorObj.response?.data?.errors?.new_password?.[0] ||
        errorObj.response?.data?.errors?.current_password?.[0] ||
        errorObj.response?.data?.message ||
        "Gagal mengganti kata sandi.";
      setErrorMsg(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={isMandatory ? () => {} : (isOpen) => !isOpen && onClose?.()}>
      <DialogContent data-module="portal" className={cn("sm:max-w-md rounded-3xl border border-slate-200/80 dark:border-zinc-800 bg-[var(--ds-surface)] p-6 shadow-lg", isMandatory && "[&>button]:hidden")}>
        <DialogHeader>
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-[var(--ds-status-warning-bg)] text-[var(--ds-status-warning-fg)] border border-[var(--ds-status-warning-border)] mb-2">
            <Lock className="h-6 w-6" />
          </div>
          <DialogTitle className="text-center text-xl font-bold text-[var(--ds-fg)]">
            {isMandatory ? "Wajib Mengubah Kata Sandi" : "Ubah Kata Sandi Akun"}
          </DialogTitle>
          <DialogDescription className="text-center text-xs text-[var(--ds-fg-muted)]">
            {isMandatory
              ? "Kata sandi Anda baru saja diatur ulang oleh administrator. Demi keamanan akun, Anda wajib menetapkan kata sandi baru untuk melanjutkan."
              : "Perbarui kata sandi Anda secara berkala untuk menjaga keamanan akun portal ASN."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {errorMsg && (
            <div className="rounded-lg border border-[var(--ds-status-danger-border)] bg-[var(--ds-status-danger-bg)] p-3 text-xs text-[var(--ds-status-danger-fg)]">
              {errorMsg}
            </div>
          )}

          <div className="space-y-2">
            <Label className="text-xs font-semibold text-[var(--ds-fg)]">
              {isMandatory ? "Kata Sandi Sementara Saat Ini" : "Kata Sandi Saat Ini"}
            </Label>
            <Input
              type="password"
              autoComplete="current-password"
              placeholder={isMandatory ? "Masukkan password sementara" : "Masukkan password aktif"}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              className="h-10 text-sm rounded-lg"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-semibold text-[var(--ds-fg)]">Kata Sandi Baru</Label>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                placeholder="Minimal 8 karakter"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                className="h-10 text-sm pr-10 rounded-lg"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--ds-fg-muted)] hover:text-[var(--ds-fg)] cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-semibold text-[var(--ds-fg)]">Konfirmasi Kata Sandi Baru</Label>
            <Input
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              placeholder="Ulangi kata sandi baru"
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
              required
              className="h-10 text-sm rounded-lg"
            />
          </div>

          <div className="flex items-center gap-2 pt-2">
            {!isMandatory && (
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={loading}
                className="w-1/2 rounded-lg text-xs h-10 cursor-pointer"
              >
                Batal
              </Button>
            )}
            <Button
              type="submit"
              disabled={loading}
              className={cn(
                "bg-[var(--ds-accent-solid)] hover:bg-[var(--ds-accent-hover)] text-[var(--ds-accent-on-solid)] font-semibold text-xs h-10 rounded-lg shadow-xs cursor-pointer",
                isMandatory ? "w-full mt-2" : "w-1/2"
              )}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Menyimpan...
                </>
              ) : isMandatory ? (
                "Simpan & Buka Akses Akun"
              ) : (
                "Simpan Kata Sandi"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function MandatoryChangePasswordModal(props: { open: boolean; onSuccess?: () => void }) {
  return <ChangePasswordModal {...props} isMandatory={true} />;
}

/**
 * Modal Setup 2FA TOTP (Google Authenticator / 1Password).
 */
export function TwoFactorSetupModal({
  open,
  onOpenChange,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}) {
  const [step, setStep] = useState<"loading" | "scan" | "recovery">("loading");
  const [secret, setSecret] = useState("");
  const [qrUri, setQrUri] = useState("");
  const [code, setCode] = useState("");
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    if (open) {
      setStep("loading");
      setErrorMsg(null);
      setCode("");
      api
        .post("/me/2fa/enable")
        .then((res) => {
          if (!active) return;
          setSecret(res.data.secret);
          setQrUri(res.data.qr_uri);
          setStep("scan");
        })
        .catch(() => {
          if (!active) return;
          toast.error("Gagal memulai proses setup 2FA.");
          onOpenChange(false);
        });
    }
    return () => {
      active = false;
    };
  }, [open, onOpenChange]);

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSubmitting(true);
    try {
      const resp = await api.post("/me/2fa/confirm", { code: code.trim() });
      setRecoveryCodes(resp.data.recovery_codes || []);
      setStep("recovery");
      toast.success("Autentikasi 2 Langkah berhasil diaktifkan!");
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { errors?: Record<string, string[]>; message?: string } } };
      const msg = errorObj.response?.data?.errors?.code?.[0] || errorObj.response?.data?.message || "Kode TOTP tidak cocok.";
      setErrorMsg(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const copyRecoveryCodes = () => {
    navigator.clipboard.writeText(recoveryCodes.join("\n")).catch(() => {});
    setCopied(true);
    toast.success("8 kode pemulihan berhasil disalin!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-module="portal" className="sm:max-w-md rounded-3xl border border-slate-200/80 dark:border-zinc-800 bg-[var(--ds-surface)] p-6 shadow-lg">
        <DialogHeader>
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-[var(--ds-accent-soft)] text-[var(--ds-accent-fg)] border border-[var(--ds-accent-soft-border)] mb-2">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <DialogTitle className="text-center text-xl font-bold text-[var(--ds-fg)]">
            {step === "recovery" ? "Simpan Recovery Code Anda" : "Autentikasi Dua Langkah (2FA)"}
          </DialogTitle>
          <DialogDescription className="text-center text-xs text-[var(--ds-fg-muted)]">
            {step === "recovery"
              ? "Simpan 8 kode ini di tempat aman. Masing-masing hanya dapat digunakan 1 kali jika Anda kehilangan HP."
              : "Scan QR code berikut di Google Authenticator atau aplikasi sejenis."}
          </DialogDescription>
        </DialogHeader>

        {step === "loading" ? (
          <div className="flex h-48 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-[var(--ds-accent-fg)]" />
          </div>
        ) : step === "scan" ? (
          <form onSubmit={handleConfirm} className="space-y-4 pt-1">
            {errorMsg && (
              <div className="rounded-lg border border-[var(--ds-status-danger-border)] bg-[var(--ds-status-danger-bg)] p-3 text-xs text-[var(--ds-status-danger-fg)]">
                {errorMsg}
              </div>
            )}

            {/* QR Code Container */}
            <div className="flex flex-col items-center justify-center p-4 rounded-lg bg-white border border-slate-200/80 dark:border-zinc-800 shadow-xs">
              {qrUri && (
                <div className="p-2 bg-white rounded-lg">
                  <QRCode value={qrUri} size={160} />
                </div>
              )}
              <div className="mt-3 text-center">
                <p className="text-xs text-slate-600 uppercase tracking-wider font-semibold">
                  Atau masukkan kunci manual:
                </p>
                <code className="text-xs font-mono font-bold text-slate-900 bg-slate-100 px-2 py-1 rounded-lg select-all">
                  {secret}
                </code>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold text-[var(--ds-fg)]">Kode 6-Digit dari Aplikasi</Label>
              <Input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="000000"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "")) }
                required
                className="h-11 text-center font-mono text-xl tracking-[0.25em] font-bold rounded-lg tabular-nums"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)} className="rounded-lg text-xs cursor-pointer">
                Batal
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={submitting}
                className="bg-[var(--ds-accent-solid)] hover:bg-[var(--ds-accent-hover)] text-[var(--ds-accent-on-solid)] font-semibold rounded-lg shadow-xs text-xs cursor-pointer"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Memverifikasi...
                  </>
                ) : (
                  "Verifikasi & Aktifkan"
                )}
              </Button>
            </div>
          </form>
        ) : (
          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-2 p-4 rounded-lg bg-[var(--ds-surface-muted)] border border-slate-200/80 dark:border-zinc-800 font-mono text-xs text-center font-bold tabular-nums">
              {recoveryCodes.map((c, idx) => (
                <div key={idx} className="p-2 rounded-lg bg-[var(--ds-surface)] border border-slate-200/80 dark:border-zinc-800 shadow-xs text-[var(--ds-fg)]">
                  {c}
                </div>
              ))}
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={copyRecoveryCodes}
              className="w-full text-xs font-semibold rounded-lg cursor-pointer"
            >
              {copied ? <Check className="w-4 h-4 mr-2 text-[var(--ds-accent-fg)]" /> : <Copy className="w-4 h-4 mr-2" />}
              {copied ? "Berhasil Disalin!" : "Salin Semua Kode"}
            </Button>

            <Button
              type="button"
              size="sm"
              onClick={() => {
                onOpenChange(false);
                onSuccess?.();
              }}
              className="w-full bg-[var(--ds-accent-solid)] hover:bg-[var(--ds-accent-hover)] text-[var(--ds-accent-on-solid)] font-semibold rounded-lg shadow-xs text-xs cursor-pointer"
            >
              Selesai & Simpan
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
