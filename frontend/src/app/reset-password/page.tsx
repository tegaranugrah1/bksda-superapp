"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Lock, Eye, EyeOff, Loader2, CheckCircle2, ShieldAlert, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { api } from "@/lib/api";

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const tokenParam = searchParams.get("token") || "";
  const emailParam = searchParams.get("email") || "";

  const [token, setToken] = useState(tokenParam);
  const [email, setEmail] = useState(emailParam);
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (tokenParam) setToken(tokenParam);
    if (emailParam) setEmail(emailParam);
  }, [tokenParam, emailParam]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!token) {
      setErrorMsg("Token reset password tidak ditemukan. Silakan minta tautan baru.");
      return;
    }
    if (!email) {
      setErrorMsg("Alamat email wajib diisi.");
      return;
    }
    if (password.length < 8) {
      setErrorMsg("Kata sandi minimal harus terdiri dari 8 karakter.");
      return;
    }
    if (password !== passwordConfirmation) {
      setErrorMsg("Konfirmasi kata sandi tidak cocok.");
      return;
    }

    setLoading(true);
    try {
      const resp = await api.post("/reset-password", {
        token,
        email: email.trim().toLowerCase(),
        password,
        password_confirmation: passwordConfirmation,
      });

      setSuccess(true);
      toast.success(resp.data?.message || "Kata sandi Anda berhasil diperbarui!");
      setTimeout(() => {
        router.push("/login");
      }, 3000);
    } catch (err: any) {
      const msg =
        err.response?.data?.message ||
        err.response?.data?.errors?.email?.[0] ||
        err.response?.data?.errors?.password?.[0] ||
        "Gagal mereset kata sandi. Tautan mungkin telah kedaluwarsa.";
      setErrorMsg(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-8 shadow-xl">
      {/* Header Branding */}
      <div className="text-center mb-6">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:bg-emerald-400/10 dark:text-emerald-400 mb-3">
          <Lock className="h-7 w-7" />
        </div>
        <h1 className="text-xl font-extrabold text-slate-900 dark:text-slate-100">
          Atur Ulang Kata Sandi
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs mx-auto">
          Buat kata sandi baru yang kuat dan aman untuk akun Anda.
        </p>
      </div>

      {success ? (
        <div className="space-y-5 text-center">
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-5 dark:border-emerald-900/40 dark:bg-emerald-950/20">
            <CheckCircle2 className="h-10 w-10 text-emerald-600 mx-auto mb-2" />
            <p className="text-sm font-bold text-emerald-900 dark:text-emerald-200">
              Kata Sandi Berhasil Diperbarui
            </p>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
              Kata sandi Anda telah berhasil diubah. Mengalihkan Anda ke halaman login dalam 3 detik...
            </p>
          </div>

          <div className="pt-2">
            <Link href="/login">
              <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold">
                Login Sekarang
              </Button>
            </Link>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {errorMsg && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-400 flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-xs font-semibold">
              Alamat Email
            </Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              readOnly={!!emailParam}
              className={`h-10 text-sm ${emailParam ? "bg-slate-50 dark:bg-slate-800 text-slate-500" : ""}`}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-xs font-semibold">
              Kata Sandi Baru
            </Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Minimal 8 karakter"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
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
            <Label htmlFor="password-confirm" className="text-xs font-semibold">
              Konfirmasi Kata Sandi Baru
            </Label>
            <Input
              id="password-confirm"
              type={showPassword ? "text" : "password"}
              placeholder="Ulangi kata sandi baru"
              value={passwordConfirmation}
              onChange={(e) => setPasswordConfirmation(e.target.value)}
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
              "Simpan Kata Sandi Baru"
            )}
          </Button>

          <div className="text-center pt-3 border-t border-slate-100 dark:border-slate-800">
            <Link
              href="/login"
              className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 inline-flex items-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Kembali ke Halaman Login
            </Link>
          </div>
        </form>
      )}
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4">
      <Suspense fallback={<Loader2 className="w-8 h-8 animate-spin text-emerald-600" />}>
        <ResetPasswordContent />
      </Suspense>
    </div>
  );
}
