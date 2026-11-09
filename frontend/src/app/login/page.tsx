"use client";

import { useState, useEffect, useSyncExternalStore } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Loader2,
  User,
  Lock,
  Eye,
  EyeOff,
  ShieldCheck,
  ArrowRight,
  ArrowLeft,
  Mail,
  CheckCircle2,
  ShieldAlert,
} from "lucide-react";
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

const pushVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? "100%" : "-100%", opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir > 0 ? "-100%" : "100%", opacity: 0 }),
};

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [is2FaStep, setIs2FaStep] = useState(false);
  const [challengeToken, setChallengeToken] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [isRecoveryMode, setIsRecoveryMode] = useState(false);
  const [isForgotStep, setIsForgotStep] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotSubmitted, setForgotSubmitted] = useState(false);
  const [forgotError, setForgotError] = useState<string | null>(null);
  const [direction, setDirection] = useState(1);

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
        setDirection(1);
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

  async function onSubmitForgot(e: React.FormEvent) {
    e.preventDefault();
    setForgotError(null);
    const emailTrimmed = forgotEmail.trim().toLowerCase();
    if (!emailTrimmed) {
      setForgotError("Alamat email wajib diisi.");
      return;
    }
    setLoading(true);
    try {
      const resp = await api.post("/forgot-password", { email: emailTrimmed });
      setForgotSubmitted(true);
      toast.success(resp.data?.message || "Permintaan reset password berhasil diproses.");
    } catch (err: any) {
      const msg = err.response?.data?.message || "Terjadi kesalahan saat memproses permintaan.";
      setForgotError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  if (token) {
    return null; // Return null while redirecting to prevent flashing
  }

  const activeView = is2FaStep ? "2fa" : isForgotStep ? "forgot" : "login";

  return (
    <div className="min-h-screen w-full bg-zinc-50 dark:bg-zinc-950 font-sans text-zinc-900 dark:text-zinc-100 flex overflow-hidden relative">
      {/* Floating Theme Toggle (Top Right) */}
      <div className="absolute top-5 right-5 sm:top-6 sm:right-6 z-30">
        <ThemeToggle size="sm" />
      </div>

      <div className="flex min-h-screen w-full">
        {/* Left Side: Form Container */}
        <div className="w-full lg:w-[48%] xl:w-[44%] flex flex-col justify-between p-6 sm:p-10 md:p-14 bg-white dark:bg-zinc-900/90 backdrop-blur-md relative z-10 shadow-2xl border-r border-zinc-200/70 dark:border-zinc-800/80 overflow-hidden">
          <div className="w-full max-w-md mx-auto my-auto py-6">
            {/* Branding Header with Official Kemenhut Logo & Exact Hierarchy */}
            <div className="flex items-center gap-3.5 mb-8">
              <div className="p-2 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200/80 dark:border-emerald-800/60 shadow-xs shrink-0">
                <Image
                  src="/kemenhutlogo.png"
                  alt="Logo Kementerian Kehutanan"
                  width={48}
                  height={48}
                  className="w-12 h-12 object-contain"
                  priority
                />
              </div>
              <div className="flex flex-col justify-center min-w-0">
                <span className="text-xs sm:text-sm font-black tracking-wide text-emerald-800 dark:text-emerald-400 uppercase leading-snug">
                  KEMENTERIAN KEHUTANAN
                </span>
                <span className="text-[11px] sm:text-xs font-bold text-zinc-900 dark:text-zinc-100 uppercase leading-snug tracking-tight">
                  BALAI KONSERVASI SUMBER DAYA ALAM
                </span>
                <span className="text-[10px] sm:text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-widest leading-snug">
                  KALIMANTAN TIMUR
                </span>
              </div>
            </div>

            <div className="relative overflow-hidden p-1 -m-1">
              <AnimatePresence mode="wait" initial={false} custom={direction}>
                <motion.div
                  key={activeView}
                  custom={direction}
                  variants={pushVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{
                    x: { type: "spring", stiffness: 320, damping: 32 },
                    opacity: { duration: 0.18 },
                  }}
                >
                  {activeView === "2fa" ? (
                    <div className="space-y-6">
                      <div className="space-y-2">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold border border-emerald-500/20">
                          <ShieldCheck className="w-3.5 h-3.5" />
                          Autentikasi 2 Langkah
                        </div>
                        <h1 className="text-2xl font-black text-zinc-900 dark:text-white">
                          {isRecoveryMode ? "Masukkan Recovery Code" : "Kode Verifikasi Authenticator"}
                        </h1>
                        <p className="text-zinc-500 dark:text-zinc-400 text-sm font-normal leading-relaxed">
                          {isRecoveryMode
                            ? "Gunakan salah satu dari kode pemulihan darurat yang Anda simpan saat mengaktifkan 2FA."
                            : "Buka aplikasi authenticator Anda (Google Authenticator / 1Password) dan masukkan 6-digit kode."}
                        </p>
                      </div>

                      <form onSubmit={onSubmit2Fa} className="space-y-5">
                        <div className="space-y-2">
                          <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">
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
                            className={`w-full px-4 py-3.5 bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800 rounded-xl transition-all focus:bg-white dark:focus:bg-zinc-900 focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none font-mono ${
                              isRecoveryMode
                                ? "text-base tracking-wider uppercase"
                                : "text-2xl tracking-[0.3em] text-center font-bold"
                            }`}
                          />
                        </div>

                        <button
                          className="w-full bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold py-3.5 px-4 rounded-xl shadow-md shadow-emerald-600/20 hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-50 cursor-pointer"
                          type="submit"
                          disabled={loading}
                        >
                          {loading ? (
                            <>
                              <Loader2 className="animate-spin w-4 h-4" />
                              <span>Memverifikasi Kode...</span>
                            </>
                          ) : (
                            <>
                              <span>Verifikasi & Masuk</span>
                              <ArrowRight className="w-4 h-4" />
                            </>
                          )}
                        </button>

                        <div className="flex items-center justify-between pt-2">
                          <button
                            type="button"
                            onClick={() => {
                              setIsRecoveryMode(!isRecoveryMode);
                              setTotpCode("");
                            }}
                            className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors cursor-pointer"
                          >
                            {isRecoveryMode ? "← Gunakan Kode Authenticator" : "Gunakan Recovery Code →"}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setDirection(-1);
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
                  ) : activeView === "forgot" ? (
                    <div className="space-y-6">
                      <div className="space-y-1.5">
                        <h1 className="text-2xl sm:text-3xl font-black text-zinc-900 dark:text-white tracking-tight">
                          Lupa Kata Sandi?
                        </h1>
                        <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 font-normal leading-relaxed">
                          Masukkan alamat Gmail terverifikasi akun Anda untuk menerima tautan pemulihan kata sandi.
                        </p>
                      </div>

                      {forgotSubmitted ? (
                        <div className="space-y-5">
                          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 dark:border-emerald-900/40 dark:bg-emerald-950/20 text-center">
                            <CheckCircle2 className="h-8 w-8 text-emerald-600 mx-auto mb-2" />
                            <p className="text-sm font-bold text-emerald-900 dark:text-emerald-200">
                              Tautan Pemulihan Dikirim
                            </p>
                            <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1 leading-relaxed">
                              Jika email <span className="font-semibold text-zinc-900 dark:text-zinc-200">{forgotEmail}</span> terdaftar dan aktif di sistem, Anda akan menerima email berisi tautan untuk mengatur ulang kata sandi. Silakan periksa folder Inbox atau Spam.
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              setDirection(-1);
                              setIsForgotStep(false);
                              setForgotSubmitted(false);
                              setForgotError(null);
                            }}
                            className="w-full py-3 px-4 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/60 text-zinc-700 dark:text-zinc-200 font-semibold text-xs sm:text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer"
                          >
                            <ArrowLeft className="w-4 h-4" />
                            <span>Kembali ke Halaman Login</span>
                          </button>
                        </div>
                      ) : (
                        <form onSubmit={onSubmitForgot} className="space-y-5">
                          {forgotError && (
                            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-400 flex items-start gap-2">
                              <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                              <span>{forgotError}</span>
                            </div>
                          )}

                          <div className="space-y-1.5">
                            <label
                              htmlFor="forgot-email"
                              className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider"
                            >
                              Alamat Email Terdaftar
                            </label>
                            <div className="relative group">
                              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-400 group-focus-within:text-emerald-600 transition-colors">
                                <Mail className="h-4 w-4" />
                              </div>
                              <input
                                id="forgot-email"
                                type="email"
                                value={forgotEmail}
                                onChange={(e) => setForgotEmail(e.target.value)}
                                placeholder="nama.pegawai@gmail.com"
                                autoFocus
                                required
                                className="w-full pl-10 pr-4 py-3 bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800 rounded-xl transition-all focus:bg-white dark:focus:bg-zinc-900 focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400"
                              />
                            </div>
                          </div>

                          <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold py-3.5 px-4 rounded-xl shadow-md shadow-emerald-600/20 hover:shadow-lg hover:shadow-emerald-600/30 active:scale-[0.99] transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-50 cursor-pointer"
                          >
                            {loading ? (
                              <>
                                <Loader2 className="animate-spin w-4 h-4" />
                                <span>Mengirimkan Tautan...</span>
                              </>
                            ) : (
                              <>
                                <span>Kirim Tautan Pemulihan</span>
                                <ArrowRight className="w-4 h-4" />
                              </>
                            )}
                          </button>

                          <div className="text-center pt-2">
                            <button
                              type="button"
                              onClick={() => {
                                setDirection(-1);
                                setIsForgotStep(false);
                                setForgotError(null);
                              }}
                              className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                            >
                              <ArrowLeft className="w-3.5 h-3.5" />
                              <span>Kembali ke Halaman Login</span>
                            </button>
                          </div>
                        </form>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div className="space-y-1.5">
                        <h1 className="text-2xl sm:text-3xl font-black text-zinc-900 dark:text-white tracking-tight">
                          Selamat Datang
                        </h1>
                        <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 font-normal leading-relaxed">
                          Silakan masukkan NIP atau akun resmi Anda untuk mengakses portal BKSDA Kalimantan Timur.
                        </p>
                      </div>

                      <Form {...form}>
                        <form method="post" onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                          <FormField
                            control={form.control}
                            name="username"
                            render={({ field }) => (
                              <FormItem className="space-y-1.5">
                                <FormLabel className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">
                                  NIP / Username
                                </FormLabel>
                                <FormControl>
                                  <div className="relative group">
                                    <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-400 group-focus-within:text-emerald-600 transition-colors">
                                      <User className="h-4 w-4" />
                                    </div>
                                    <input
                                      {...field}
                                      className="w-full pl-10 pr-4 py-3 bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800 rounded-xl transition-all focus:bg-white dark:focus:bg-zinc-900 focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400"
                                      placeholder="Contoh: 19850101... atau username"
                                      type="text"
                                      autoComplete="username"
                                    />
                                  </div>
                                </FormControl>
                                <FormMessage className="text-xs text-rose-500" />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="password"
                            render={({ field }) => (
                              <FormItem className="space-y-1.5">
                                <div className="flex items-center justify-between">
                                  <FormLabel className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">
                                    Kata Sandi
                                  </FormLabel>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setDirection(1);
                                      setForgotError(null);
                                      setForgotSubmitted(false);
                                      setIsForgotStep(true);
                                    }}
                                    className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 hover:underline transition-colors cursor-pointer"
                                  >
                                    Lupa kata sandi?
                                  </button>
                                </div>
                                <FormControl>
                                  <div className="relative group">
                                    <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-400 group-focus-within:text-emerald-600 transition-colors">
                                      <Lock className="h-4 w-4" />
                                    </div>
                                    <input
                                      {...field}
                                      className="w-full pl-10 pr-12 py-3 bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800 rounded-xl transition-all focus:bg-white dark:focus:bg-zinc-900 focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400"
                                      placeholder="••••••••"
                                      type={showPassword ? "text" : "password"}
                                      autoComplete="current-password"
                                    />
                                    <button
                                      className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-zinc-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors cursor-pointer"
                                      type="button"
                                      onClick={() => setShowPassword(!showPassword)}
                                      aria-label={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
                                    >
                                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </button>
                                  </div>
                                </FormControl>
                                <FormMessage className="text-xs text-rose-500" />
                              </FormItem>
                            )}
                          />

                          <button
                            className="w-full bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold py-3.5 px-4 rounded-xl shadow-md shadow-emerald-600/20 hover:shadow-lg hover:shadow-emerald-600/30 active:scale-[0.99] transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-50 cursor-pointer mt-2"
                            type="submit"
                            disabled={loading}
                          >
                            {loading ? (
                              <>
                                <Loader2 className="animate-spin w-4 h-4" />
                                <span>Memverifikasi Kredensial...</span>
                              </>
                            ) : (
                              <>
                                <span>Masuk ke Akun</span>
                                <ArrowRight className="w-4 h-4" />
                              </>
                            )}
                          </button>
                        </form>
                      </Form>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

          {/* Copyright Footer */}
          <div className="w-full max-w-md mx-auto pt-6 border-t border-zinc-100 dark:border-zinc-800/80 text-center">
            <p className="text-[11px] text-zinc-400 dark:text-zinc-500 font-medium leading-relaxed">
              &copy; {new Date().getFullYear()} Balai Konservasi Sumber Daya Alam Kalimantan Timur
              <br />
              <span className="text-[10px] text-zinc-400/80 dark:text-zinc-500/80">Kementerian Kehutanan Republik Indonesia</span>
            </p>
          </div>
        </div>

        {/* Right Side: Visual Hero Branding Showcase (Foto Jernih, Terang, & Terlihat Jelas) */}
        <div className="hidden lg:flex lg:w-[52%] xl:w-[56%] relative overflow-hidden bg-zinc-900 flex-col justify-end p-12 xl:p-16 text-white">
          {/* Foto Konservasi Lokal (Pulau Sangalaki) - Terang & Nyata tanpa shadow pekat */}
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage: "url('/assets/images/background/sangalaki.png')",
            }}
          />
          {/* Gradien lembut di dasar saja agar teks terbaca kontras tanpa menggelapkan pemandangan */}
          <div className="absolute inset-0 bg-linear-to-t from-black/85 via-black/35 to-transparent" />

          {/* Bottom Branding Showcase */}
          <div className="relative z-10 max-w-xl space-y-4">
            <h2 className="text-3xl xl:text-4xl font-black leading-tight tracking-tight text-white drop-shadow-md">
              Melindungi Warisan Alam Untuk Generasi Masa Depan
            </h2>
            <p className="text-sm xl:text-base text-zinc-200 leading-relaxed font-normal drop-shadow-xs">
              Platform terpadu tata kelola kepegawaian, administrasi naskah dinas, inventarisasi aset, dan perlindungan keanekaragaman hayati Balai Konservasi Sumber Daya Alam Kalimantan Timur.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
