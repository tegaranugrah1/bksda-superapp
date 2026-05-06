# Issue #021b — Frontend — Phase 2 UI Overhaul (Login Page)

> **Type**: `feature` / `refactor`
> **Labels**: `frontend`, `ui`, `design`
> **Priority**: 🔴 Critical (Standarisasi estetika visual)
> **Complexity**: 🟡 Medium (Instalasi komponen shadcn dan state form kompleks)
> **Recommended AI Model**: Claude Sonnet / Gemini 2.5 Flash / Ollama
> **Dependencies**: Issue #017 (Login Page dasar) & Issue #019 (Auth Sync)

---

## Branch

```
issue/021b-frontend-phase-2-ui-overhaul
```

## Deskripsi

Berdasarkan aturan terbaru dalam project ini, setiap akhir dari sebuah *Phase*, kita diwajibkan untuk memeriksa referensi UI di `superapp-inventory`. 
Halaman Login yang kita bangun di Issue #017 masih menggunakan *Glassmorphism* dasar dan state manual. Versi *production* (`superapp-inventory`) menggunakan desain *split-screen* premium dengan form terstruktur berbasis `zod` dan `react-hook-form`, serta komponen `shadcn/ui`.

**Apa yang dilakukan:**
1. Menginstal pustaka validasi form (`react-hook-form`, `zod`, `@hookform/resolvers`).
2. Memasang komponen UI dasar dari `shadcn` (`form`, `label`, `input`, `sonner`).
3. Mengganti total isi file `login/page.tsx` agar visualnya sama persis dengan `superapp-inventory` (dua kolom layar terbelah).
4. Menyambungkan logika login dengan *reactive store* yang sudah kita buat di Issue #019 (`authStore.login`).

---

## Acceptance Criteria

- [ ] Package `react-hook-form`, `zod`, dan `sonner` terinstal.
- [ ] Komponen shadcn `form`, `label`, `input`, dan `sonner` berhasil diinisialisasi.
- [ ] File `src/app/(auth)/login/page.tsx` diubah menjadi UI *split-screen* kelas atas.
- [ ] Terintegrasi penuh dengan `authStore.login(token, user)` (bukan sekadar `localStorage.setItem` statis).
- [ ] Error validasi form muncul elegan di bawah *input field* (bukan *alert box* browser).
- [ ] Toast notifikasi hijau muncul saat login berhasil sebelum di-*redirect*.

---

## Langkah Demi Langkah

> 💡 **Untuk junior/AI**: Langkah ini menggabungkan eksekusi `shadcn CLI` dan modifikasi *Client Component*. Jika CLI gagal, komponen bisa di-*copy* langsung dari `superapp-inventory`.

### Langkah 1: Instalasi Package & Shadcn Components

**Kenapa?** Kita membutuhkan alat bantu standar industri untuk mengelola input user agar tidak ada celah *bug* validasi.

```bash
cd e:\bksda-superapp\frontend

npm install react-hook-form zod @hookform/resolvers sonner
npx shadcn@latest add form label input sonner -y
```

---

### Langkah 2: Edit Halaman Login Utama

**Path:** `e:\bksda-superapp\frontend\src\app\(auth)\login\page.tsx`

**Rombak total file ini dan gantikan dengan kode berikut:**

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
import { authStore } from "@/lib/auth-store";

// Schema Validation
const formSchema = z.object({
  username: z.string().min(1, "NIP / Username wajib diisi"),
  password: z.string().min(1, "Password wajib diisi"),
});

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

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
        username: values.username.trim()
      };
      
      const response = await api.post("/login", payload);
      const { token, data } = response.data;

      // Menggunakan authStore reaktif dari Issue #019
      authStore.login(token, data);
      
      toast.success("Login berhasil!");
      router.push("/");
      
    } catch (error: unknown) {
      const errorData = axios.isAxiosError(error) ? error.response?.data : undefined;
      const errorMessage = errorData?.message || (error instanceof Error ? error.message : undefined) || "Gagal login. Periksa NIP dan password.";
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

  return (
    <div className="bg-zinc-50 dark:bg-zinc-950 font-sans text-zinc-900 dark:text-zinc-100 min-h-screen flex items-center justify-center">
      <div className="flex min-h-screen w-full overflow-hidden">
        {/* Left Side: Login Form */}
        <div className="w-full lg:w-[45%] flex flex-col items-center justify-center p-8 md:p-16 bg-white dark:bg-zinc-900 relative z-10 shadow-2xl">
          <div className="w-full max-w-md">
            {/* Branding Header */}
            <div className="flex items-center gap-6 mb-12">
              <div className="flex items-center gap-3">
                <div 
                  className="w-12 h-12 bg-contain bg-no-repeat bg-left" 
                  style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuCzoN_QzAUpJ28JER1CrRMq1krN-1-LCARS2OqUhmuAENWtXkb1uzAizMV68A3kzXRsuX8NRyFCQS_0fd08sQ3iFskE0K3AOS3xPfUSEIJ5DygEIB8QLbRCit--5HUb0qZeVxoAKFO7y6NntfUIW4dJod-C09PU46npLGA2P-3m06AHkgP3Z_0n5G1r2xm9zH3lu3bcOyNH98GjmBakC-1MadgVVuYEY8zTvaH-3G3068Bnezc2JRxCp_qhADJZfItLNZ8XuckQ2Bo')" }}
                ></div>
                <div className="flex flex-col">
                  <span className="text-zinc-900 dark:text-white text-xl font-black leading-none tracking-tight">BKSDA</span>
                  <span className="text-emerald-600 dark:text-emerald-500 text-sm font-bold leading-none tracking-tighter">KALTIM</span>
                </div>
              </div>
            </div>

            <div className="mb-10">
              <h1 className="text-3xl font-black text-zinc-900 dark:text-white mb-2">Selamat Datang</h1>
              <p className="text-zinc-500 dark:text-zinc-400 font-medium">Silakan login untuk mengakses portal manajemen BKSDA Kalimantan Timur.</p>
            </div>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                     <FormItem className="space-y-2">
                      <FormLabel className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-widest">Username atau Email</FormLabel>
                      <FormControl>
                        <div className="relative group">
                          <input 
                            {...field}
                            className="w-full px-4 py-4 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl transition-all focus:bg-white dark:focus:bg-zinc-900 focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none" 
                            placeholder="Masukkan NIP anda" 
                            type="text"
                          />
                        </div>
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
                      <FormLabel className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-widest">Password</FormLabel>
                      <FormControl>
                        <div className="relative group">
                          <input 
                            {...field}
                            className="w-full pr-12 pl-4 py-4 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl transition-all focus:bg-white dark:focus:bg-zinc-900 focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none" 
                            placeholder="••••••••" 
                            type={showPassword ? "text" : "password"}
                          />
                          <button 
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-zinc-400 hover:text-emerald-500 font-medium" 
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                          >
                            {showPassword ? "Sembunyikan" : "Tampilkan"}
                          </button>
                        </div>
                      </FormControl>
                      <FormMessage className="text-xs text-red-500" />
                    </FormItem>
                  )}
                />

                <button 
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black py-4 rounded-xl shadow-lg shadow-emerald-600/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 text-lg disabled:opacity-50" 
                  type="submit"
                  disabled={loading}
                >
                  {loading ? <Loader2 className="animate-spin w-6 h-6" /> : "Login"}
                </button>
              </form>
            </Form>

            <div className="mt-12 pt-8 border-t border-zinc-100 dark:border-zinc-800 flex flex-col gap-4">
              <p className="text-xs text-center text-zinc-400 font-medium">
                &copy; {new Date().getFullYear()} Balai Konservasi Sumber Daya Alam Kalimantan Timur
              </p>
            </div>
          </div>
        </div>

        {/* Right Side: Visual Branding */}
        <div className="hidden lg:block lg:w-[55%] relative overflow-hidden bg-zinc-900">
          <div 
            className="absolute inset-0 bg-cover bg-center opacity-80 mix-blend-overlay" 
            style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuDlo-JpVGBaoUwLf0K7HW1CHye6SJdYgvXAvRyMkHSNG82DZ4ZJrmIbEY_VrllF4PXw2YmLcZKF8cdDBpLq57KOw06fN20fGGd7p3sBFDIsOh1YvGdl6og1WT7_Kqo5d69l56dPWxV_eSjp8WHPczKGmngvIWISopr8DHTGdojGaiHk6nkvKPVsh9pHo-pVoyqX6pUMABERWNYd1aa5jX4yGpYAEoP20DM5XP1j5V3QVpPURqWgumcBtzM6FtfM8PfEugSVTrQ3hks')" }}
          >
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent"></div>
          </div>
          <div className="absolute bottom-16 left-16 right-16 text-white max-w-xl z-10">
            <div className="bg-emerald-500 h-1 w-12 mb-6"></div>
            <h2 className="text-4xl font-black mb-4 leading-tight">Melindungi Warisan Alam Untuk Generasi Masa Depan</h2>
            <p className="text-lg text-white/80 font-medium italic">&quot;Konservasi adalah upaya pelestarian lingkungan dengan tetap memperhatikan manfaat yang bisa didapat pada saat itu.&quot;</p>
          </div>
        </div>
      </div>
    </div>
  );
}
```

---

### Langkah 3: Modifikasi Root Layout (Pemasangan Sonner Toaster)

**Kenapa?** Agar sistem notifikasi *toast* (hijau untuk sukses, merah untuk gagal) dari `sonner` bisa bekerja secara global di seluruh aplikasi.

**Path:** `e:\bksda-superapp\frontend\src\app\layout.tsx`

Tambahkan baris berikut di dalam `<ThemeProvider>`:
```tsx
import { Toaster } from "@/components/ui/sonner";

// Di dalam return:
<ThemeProvider ...>
  <QueryProvider>
    {children}
    <Toaster richColors position="top-right" />
  </QueryProvider>
</ThemeProvider>
```

---

## Troubleshooting

### Q: IDE memberikan warning `Cannot find module '@/components/ui/form'`.
**Artinya:** Langkah eksekusi shadcn CLI gagal, sehingga file `form.tsx` tidak tercipta.
**Solusi:** Pastikan terminal merespons sukses saat menjalankan `npx shadcn@latest add form`. 

---

## Git Workflow (Professional)

### Step 1: Buat Issue di GitHub

```bash
cd e:\bksda-superapp

gh issue create \
  --title "refactor: phase 2 ui overhaul for login page" \
  --body "Merombak tampilan login basic menjadi premium split-screen design. Detail di docs/issues/021b-frontend-phase-2-ui-overhaul.md" \
  --label "frontend,ui,design"
```

### Step 2: Buat Branch

```bash
git checkout main
git pull origin main
git checkout -b issue/021b-frontend-phase-2-ui-overhaul
```

### Step 3: Kerjakan

Jalankan perintah instalasi npm, modifikasi `page.tsx`, modifikasi `layout.tsx`. Tes UI dengan menjalankan `npm run dev`.

### Step 4: Commit & Push

```bash
cd e:\bksda-superapp
git add frontend/
git commit -m "refactor: phase 2 ui overhaul for login page (#22)"
git push -u origin issue/021b-frontend-phase-2-ui-overhaul
```

### Step 5: Buat Pull Request

```bash
gh pr create \
  --title "refactor: phase 2 ui overhaul for login page (#22)" \
  --body "## Summary
Menyempurnakan estetika visual halaman login sesuai aturan baru (UI Overhaul per Phase).

## Changes
- Integrasi `react-hook-form`, `zod`, dan komponen `shadcn`.
- Merombak UI menjadi *split-screen* premium.
- Menyuntikkan komponen `<Toaster>` global di layout.

## Verification
- [x] Linter React lolos.
- [x] Validasi form (Zod) berjalan mulus.
- [x] Toast notifikasi muncul tanpa kendala.

Closes #22" \
  --base main
```

### Step 6: Merge & Sync

```bash
gh pr merge --squash --delete-branch
git checkout main
git pull origin main
```

---

## 🤖 AI Prompt

````
## Context

Project: bksda-superapp (monorepo)
Workspace: e:\bksda-superapp\
Kita baru saja selesai Phase 2. Saatnya menaikkan kualitas UI agar setara dengan `superapp-inventory`.

## Task

Kerjakan Issue #021b (Phase 2 UI Overhaul).
Ikuti instruksi PERSIS seperti yang tertulis di file:
`docs/issues/021b-frontend-phase-2-ui-overhaul.md`

### Urutan Kerja:
1. Jalankan `gh issue create` dan checkout branch git.
2. Navigasi ke `frontend/` lalu eksekusi instalasi NPM dan Shadcn CLI.
3. Rombak `login/page.tsx` sesuai spesifikasi kode.
4. Rombak `layout.tsx` untuk mengimpor dan merender `<Toaster>`.
5. Uji coba linter (`npm run lint`).
6. Lakukan Git push dan `gh pr create` sesuai panduan Workflow.
````
