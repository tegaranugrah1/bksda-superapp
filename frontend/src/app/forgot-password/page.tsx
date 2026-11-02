"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Mail, Loader2, CheckCircle2, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { api } from "@/lib/api";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const emailTrimmed = email.trim().toLowerCase();
    if (!emailTrimmed) {
      setErrorMsg("Alamat email wajib diisi.");
      return;
    }

    setLoading(true);
    try {
      const resp = await api.post("/forgot-password", { email: emailTrimmed });
      setSubmitted(true);
      toast.success(resp.data?.message || "Permintaan reset password berhasil diproses.");
    } catch (err: any) {
      const msg = err.response?.data?.message || "Terjadi kesalahan saat memproses permintaan.";
      setErrorMsg(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-8 shadow-xl">
        {/* Header Branding */}
        <div className="text-center mb-6">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:bg-emerald-400/10 dark:text-emerald-400 mb-3">
            <Mail className="h-7 w-7" />
          </div>
          <h1 className="text-xl font-extrabold text-slate-900 dark:text-slate-100">
            Lupa Kata Sandi?
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs mx-auto">
            Masukkan alamat Gmail terverifikasi akun Anda untuk menerima tautan pemulihan.
          </p>
        </div>

        {submitted ? (
          <div className="space-y-5 text-center">
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 dark:border-emerald-900/40 dark:bg-emerald-950/20">
              <CheckCircle2 className="h-8 w-8 text-emerald-600 mx-auto mb-2" />
              <p className="text-sm font-bold text-emerald-900 dark:text-emerald-200">
                Tautan Pemulihan Dikirim
              </p>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                Jika email <span className="font-semibold text-slate-900 dark:text-slate-200">{email}</span> terdaftar dan aktif di sistem, Anda akan menerima email berisi tautan untuk mengatur ulang kata sandi. Silakan periksa folder Inbox atau Spam.
              </p>
            </div>

            <div className="pt-2">
              <Link href="/login">
                <Button variant="outline" className="w-full">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Kembali ke Halaman Login
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
                Alamat Email Terdaftar
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="nama.pegawai@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-10 text-sm"
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-10 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-md"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Mengirimkan Tautan...
                </>
              ) : (
                "Kirim Tautan Pemulihan"
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
    </div>
  );
}
