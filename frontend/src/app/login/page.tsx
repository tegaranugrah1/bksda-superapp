"use client";

import { useState, useEffect, useSyncExternalStore } from "react";
import Link from "next/link";
import Image from "next/image";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2 } from "lucide-react";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { toast } from "sonner";
import { api } from "@/lib/api";
import axios from "axios";
import { authStore, parseAuthSnapshot } from "@/lib/auth-store";
import { ThemeToggle } from "@/components/theme-toggle";

// Schema Validation
const formSchema = z.object({
  username: z.string().min(1, "NIP / Username wajib diisi"),
  password: z.string().min(1, "Password wajib diisi"),
});

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [is2FaStep, setIs2FaStep] = useState(false);
  const [challengeToken, setChallengeToken] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [isRecoveryMode, setIsRecoveryMode] = useState(false);

  const authSnapshot = useSyncExternalStore(authStore.subscribe, authStore.getSnapshot, () => "");
  const { token, user } = parseAuthSnapshot(authSnapshot);

  useEffect(() => {
    if (token && user) {
      window.location.replace("/portal");
    }
  }, [token, user]);

  const redirectToPortal = () => {
    window.location.replace("/portal");
  };

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setLoading(true);
    try {
      const payload = {
        ...values,
        username: values.username.trim(),
      };

      const response = await api.post("/login", payload);
      if (response.data?.requires_2fa) {
        setChallengeToken(response.data.challenge_token);
        setIs2FaStep(true);
        setLoading(false);
        return;
      }
      const { token, data } = response.data;

      // Menggunakan authStore reaktif
      authStore.login(token, data);

      if (typeof window !== "undefined") {
        sessionStorage.setItem("just_logged_in", "true");
      }

      toast.success("Login berhasil!");
      redirectToPortal();
    } catch (error: unknown) {
      const errorData = axios.isAxiosError(error) ? error.response?.data : undefined;
      const errorMessage =
        errorData?.message ||
        (error instanceof Error ? error.message : undefined) ||
        "Gagal login. Periksa NIP dan password.";
      const validationErrors = errorData?.errors;

      let displayMessage = errorMessage;
      if (validationErrors) {
        const firstErrorKey = Object.keys(validationErrors)[0];
        if (firstErrorKey && Array.isArray(validationErrors[firstErrorKey])) {
          displayMessage = validationErrors[firstErrorKey][0];
        }
      }
      toast.error(displayMessage);
    } finally {
      setLoading(false);
    }
  }

  async function onSubmit2Fa(e: React.FormEvent) {
    e.preventDefault();
    const clean = totpCode.trim();
    if (!clean) {
      toast.error(isRecoveryMode ? "Masukkan recovery code." : "Masukkan kode verifikasi 6 digit.");
      return;
    }
    setLoading(true);
    try {
      const resp = await api.post("/login/2fa", {
        challenge_token: challengeToken,
        code: clean,
      });
      const { token, data } = resp.data;
      authStore.login(token, data);
      if (typeof window !== "undefined") {
        sessionStorage.setItem("just_logged_in", "true");
      }
      toast.success("Verifikasi dua langkah berhasil!");
      redirectToPortal();
    } catch (err: any) {
      const msg = err.response?.data?.errors?.code?.[0] || err.response?.data?.message || "Kode 2FA tidak valid.";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  if (token) {
    return null; // Return null while redirecting to prevent flashing
  }

  return (
    <div className="bg-zinc-50 dark:bg-zinc-950 font-sans text-zinc-900 dark:text-zinc-100 min-h-screen flex items-center justify-center relative">
      {/* Floating Theme Toggle (Top Right) */}
      <div className="absolute top-5 right-5 sm:top-6 sm:right-6 z-30">
        <ThemeToggle size="sm" />
      </div>

      <div className="flex min-h-screen w-full overflow-hidden">
        {/* Left Side: Login Form */}
        <div className="w-full lg:w-[45%] flex flex-col items-center justify-center p-8 md:p-16 bg-white dark:bg-zinc-900 relative z-10 shadow-2xl">
          <div className="w-full max-w-md">
            {/* Branding Header with kemenhutlogo.png */}
            <div className="flex items-center gap-4 mb-10">
              <Image
                src="/kemenhutlogo.png"
                alt="Logo Kementerian Kehutanan"
                width={52}
                height={52}
                className="w-13 h-13 object-contain shrink-0"
                priority
              />
              <div className="flex flex-col justify-center leading-snug">
                <span className="text-xs sm:text-[13px] font-black tracking-wide text-emerald-800 dark:text-emerald-400 uppercase">
                  KEMENTERIAN KEHUTANAN
                </span>
                <span className="text-[11px] sm:text-xs font-bold text-zinc-900 dark:text-zinc-100 uppercase mt-0.5">
                  BALAI KONSERVASI SUMBER DAYA ALAM
                </span>
                <span className="text-[10px] sm:text-[11px] font-semibold text-emerald-700 dark:text-emerald-500 uppercase tracking-widest mt-0.5">
                  KALIMANTAN TIMUR
                </span>
              </div>
            </div>

            {is2FaStep ? (
              <div className="space-y-6">
                <div>
                  <h1 className="text-2xl font-black text-zinc-900 dark:text-white mb-2">
                    {isRecoveryMode ? "Masukkan Recovery Code" : "Kode Verifikasi Authenticator"}
                  </h1>
                  <p className="text-zinc-500 dark:text-zinc-400 text-sm font-medium">
                    {isRecoveryMode
                      ? "Gunakan salah satu dari 8 kode pemulihan darurat yang Anda simpan saat aktivasi."
                      : "Buka aplikasi authenticator Anda (Google Authenticator / 1Password) dan masukkan 6-digit kode."}
                  </p>
                </div>

                <form onSubmit={onSubmit2Fa} className="space-y-5">
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-widest">
                      {isRecoveryMode ? "Recovery Code (10 Karakter)" : "Kode 6-Digit"}
                    </label>
                    <input
                      type="text"
                      value={totpCode}
                      onChange={(e) => setTotpCode(e.target.value)}
                      placeholder={isRecoveryMode ? "CONTOH: 7A8B9C0D1E" : "000000"}
                      maxLength={isRecoveryMode ? 20 : 8}
                      autoFocus
                      required
                      className={`w-full px-4 py-4 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl transition-all focus:bg-white dark:focus:bg-zinc-900 focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none font-mono ${
                        isRecoveryMode ? "text-base tracking-wider uppercase" : "text-2xl tracking-[0.3em] text-center font-bold"
                      }`}
                    />
                  </div>

                  <button
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black py-4 rounded-xl shadow-lg shadow-emerald-600/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 text-lg disabled:opacity-50 cursor-pointer"
                    type="submit"
                    disabled={loading}
                  >
                    {loading ? <Loader2 className="animate-spin w-6 h-6" /> : "Verifikasi & Masuk"}
                  </button>

                  <div className="flex items-center justify-between pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setIsRecoveryMode(!isRecoveryMode);
                        setTotpCode("");
                      }}
                      className="text-xs font-semibold text-emerald-600 hover:text-emerald-500 transition-colors cursor-pointer"
                    >
                      {isRecoveryMode ? "Gunakan Kode Authenticator" : "Gunakan Recovery Code"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIs2FaStep(false);
                        setChallengeToken("");
                        setTotpCode("");
                      }}
                      className="text-xs font-medium text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer"
                    >
                      Kembali ke Login NIP
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              <>
                <div className="mb-10">
                  <h1 className="text-3xl font-black text-zinc-900 dark:text-white mb-2">
                    Selamat Datang
                  </h1>
                  <p className="text-zinc-500 dark:text-zinc-400 font-medium">
                    Silakan login untuk mengakses portal manajemen BKSDA Kalimantan Timur.
                  </p>
                </div>

                <Form {...form}>
                  <form method="post" onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <FormField
                      control={form.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem className="space-y-2">
                          <FormLabel className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-widest">
                            Username atau Email
                          </FormLabel>
                          <FormControl>
                            <input
                              {...field}
                              className="w-full px-4 py-4 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl transition-all focus:bg-white dark:focus:bg-zinc-900 focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400"
                              placeholder="Masukkan NIP anda"
                              type="text"
                              autoComplete="username"
                            />
                          </FormControl>
                          <FormMessage className="text-xs text-red-500" />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem className="space-y-2">
                          <FormLabel className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-widest">
                            Password
                          </FormLabel>
                          <FormControl>
                            <div className="relative group">
                              <input
                                {...field}
                                className="w-full pr-24 pl-4 py-4 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl transition-all focus:bg-white dark:focus:bg-zinc-900 focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400"
                                placeholder="••••••••"
                                type={showPassword ? "text" : "password"}
                                autoComplete="current-password"
                              />
                              <button
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-zinc-400 hover:text-emerald-500 font-medium cursor-pointer"
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                              >
                                {showPassword ? "Sembunyikan" : "Tampilkan"}
                              </button>
                            </div>
                          </FormControl>
                          <div className="flex justify-end pt-1">
                            <Link
                              href="/forgot-password"
                              className="text-xs font-semibold text-emerald-600 hover:text-emerald-500 transition-colors"
                            >
                              Lupa kata sandi?
                            </Link>
                          </div>
                          <FormMessage className="text-xs text-red-500" />
                        </FormItem>
                      )}
                    />

                    <button
                      className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black py-4 rounded-xl shadow-lg shadow-emerald-600/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 text-lg disabled:opacity-50 cursor-pointer"
                      type="submit"
                      disabled={loading}
                    >
                      {loading ? <Loader2 className="animate-spin w-6 h-6" /> : "Login"}
                    </button>
                  </form>
                </Form>
              </>
            )}

            <div className="mt-12 pt-8 border-t border-zinc-100 dark:border-zinc-800 flex flex-col gap-4">
              <p className="text-xs text-center text-zinc-400 font-medium">
                &copy; {new Date().getFullYear()} Balai Konservasi Sumber Daya Alam Kalimantan Timur
              </p>
            </div>
          </div>
        </div>

        {/* Right Side: Visual Branding (Foto Jelas & Terlihat, Tanpa Shadow Berlebihan) */}
        <div className="hidden lg:block lg:w-[55%] relative overflow-hidden bg-zinc-900">
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage: "url('/assets/images/background/sangalaki.png')",
            }}
          >
            {/* Gradien lembut di dasar saja agar foto di atas tetap terang & terlihat jelas */}
            <div className="absolute inset-0 bg-linear-to-t from-black/85 via-black/30 to-transparent"></div>
          </div>
          <div className="absolute bottom-16 left-16 right-16 text-white max-w-xl z-10">
            <div className="bg-emerald-500 h-1 w-12 mb-6"></div>
            <h2 className="text-4xl font-black mb-4 leading-tight drop-shadow-md">
              Melindungi Warisan Alam Untuk Generasi Masa Depan
            </h2>
            <p className="text-lg text-white/90 font-medium italic drop-shadow-sm">
              &quot;Konservasi adalah upaya pelestarian lingkungan dengan tetap memperhatikan manfaat
              yang bisa didapat pada saat itu.&quot;
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
