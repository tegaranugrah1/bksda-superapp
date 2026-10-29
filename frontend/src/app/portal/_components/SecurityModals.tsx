"use client";

import React, { useState, useEffect } from "react";
import QRCode from "react-qr-code";
import {
  ShieldAlert,
  ShieldCheck,
  KeyRound,
  Copy,
  Check,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  ArrowRight,
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
export function MandatoryChangePasswordModal({
  open,
  onSuccess,
}: {
  open: boolean;
  onSuccess?: () => void;
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

    if (newPassword.length < 8) {
      setErrorMsg("Kata sandi baru minimal harus terdiri dari 8 karakter.");
      return;
    }
    if (newPassword !== confirmation) {
      setErrorMsg("Konfirmasi kata sandi baru tidak cocok.");
      return;
    }

    setLoading(true);
    try {
      await api.post("/me/change-password", {
        current_password: currentPassword,
        new_password: newPassword,
        new_password_confirmation: confirmation,
      });

      toast.success("Kata sandi berhasil diubah! Akses modul kini terbuka.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmation("");
      onSuccess?.();
    } catch (err: any) {
      const msg =
        err.response?.data?.errors?.new_password?.[0] ||
        err.response?.data?.errors?.current_password?.[0] ||
        err.response?.data?.message ||
        "Gagal mengganti kata sandi.";
      setErrorMsg(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md [&>button]:hidden">
        <DialogHeader>
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 dark:bg-amber-400/10 dark:text-amber-400 mb-2">
            <Lock className="h-6 w-6" />
          </div>
          <DialogTitle className="text-center text-lg font-bold">
            Wajib Mengubah Kata Sandi
          </DialogTitle>
          <DialogDescription className="text-center text-xs text-slate-500">
            Kata sandi Anda baru saja diatur ulang oleh administrator. Demi keamanan akun, Anda wajib menetapkan kata sandi baru untuk melanjutkan.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {errorMsg && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-400">
              {errorMsg}
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Kata Sandi Sementara Saat Ini</Label>
            <Input
              type="password"
              placeholder="Masukkan password sementara"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              className="h-10 text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Kata Sandi Baru</Label>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="Minimal 8 karakter"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                className="h-10 text-sm pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Konfirmasi Kata Sandi Baru</Label>
            <Input
              type={showPassword ? "text" : "password"}
              placeholder="Ulangi kata sandi baru"
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
              required
              className="h-10 text-sm"
            />
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full h-10 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-md mt-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Menyimpan Kata Sandi...
              </>
            ) : (
              "Simpan & Buka Akses Akun"
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
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
    if (open) {
      setStep("loading");
      setErrorMsg(null);
      setCode("");
      api
        .post("/me/2fa/enable")
        .then((res) => {
          setSecret(res.data.secret);
          setQrUri(res.data.qr_uri);
          setStep("scan");
        })
        .catch(() => {
          toast.error("Gagal memulai proses setup 2FA.");
          onOpenChange(false);
        });
    }
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
    } catch (err: any) {
      const msg = err.response?.data?.errors?.code?.[0] || err.response?.data?.message || "Kode TOTP tidak cocok.";
      setErrorMsg(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const copyRecoveryCodes = () => {
    navigator.clipboard.writeText(recoveryCodes.join("\n"));
    setCopied(true);
    toast.success("8 kode pemulihan berhasil disalin!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:bg-emerald-400/10 dark:text-emerald-400 mb-2">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <DialogTitle className="text-center text-lg font-bold">
            {step === "recovery" ? "Simpan Recovery Code Anda" : "Autentikasi Dua Langkah (2FA)"}
          </DialogTitle>
          <DialogDescription className="text-center text-xs text-slate-500">
            {step === "recovery"
              ? "Simpan 8 kode ini di tempat aman. Masing-masing hanya dapat digunakan 1 kali jika Anda kehilangan HP."
              : "Scan QR code berikut di Google Authenticator atau aplikasi sejenis."}
          </DialogDescription>
        </DialogHeader>

        {step === "loading" ? (
          <div className="flex h-48 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
          </div>
        ) : step === "scan" ? (
          <form onSubmit={handleConfirm} className="space-y-4 pt-1">
            {errorMsg && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-400">
                {errorMsg}
              </div>
            )}

            {/* QR Code Container */}
            <div className="flex flex-col items-center justify-center p-3 rounded-2xl bg-white border border-slate-200 dark:border-slate-800 shadow-xs">
              {qrUri && (
                <div className="p-2 bg-white rounded-xl">
                  <QRCode value={qrUri} size={160} />
                </div>
              )}
              <div className="mt-3 text-center">
                <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">
                  Atau masukkan kunci manual:
                </p>
                <code className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-sm select-all">
                  {secret}
                </code>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Kode 6-Digit dari Aplikasi</Label>
              <Input
                type="text"
                placeholder="000000"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value)}
                required
                className="h-11 text-center font-mono text-xl tracking-[0.25em] font-bold"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
                Batal
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={submitting}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
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
            <div className="grid grid-cols-2 gap-2 p-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 font-mono text-xs text-center font-bold">
              {recoveryCodes.map((c, idx) => (
                <div key={idx} className="p-1.5 rounded-lg bg-white dark:bg-slate-900 shadow-2xs">
                  {c}
                </div>
              ))}
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={copyRecoveryCodes}
              className="w-full text-xs font-semibold"
            >
              {copied ? <Check className="w-4 h-4 mr-2 text-emerald-600" /> : <Copy className="w-4 h-4 mr-2" />}
              {copied ? "Berhasil Disalin!" : "Salin Semua Kode"}
            </Button>

            <Button
              type="button"
              size="sm"
              onClick={() => {
                onOpenChange(false);
                onSuccess?.();
              }}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
            >
              Selesai & Simpan
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
