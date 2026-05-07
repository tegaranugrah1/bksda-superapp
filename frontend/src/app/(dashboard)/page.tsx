"use client";

import Link from "next/link";
import { Users, Box, Archive, FileText, ArrowRight, ShieldAlert } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

// KAMUS MODUL (Konfigurasi Data Kartu)
const MODULES = [
  {
    id: "kepegawaian",
    name: "Kepegawaian & SDM",
    desc: "Kelola data master pegawai, struktural instansi, dan manajemen akses.",
    icon: Users,
    path: "/kepegawaian",
    color: "text-blue-500 dark:text-blue-400",
    bg: "bg-blue-500/10 dark:bg-blue-500/20",
    gradient: "from-blue-500/20 to-transparent"
  },
  {
    id: "bmn",
    name: "Aset BMN",
    desc: "Sistem inventarisasi barang milik negara, mutasi, dan pencatatan kondisi.",
    icon: Box,
    path: "/bmn",
    color: "text-amber-500 dark:text-amber-400",
    bg: "bg-amber-500/10 dark:bg-amber-500/20",
    gradient: "from-amber-500/20 to-transparent"
  },
  {
    id: "inventory",
    name: "Gudang Logistik",
    desc: "Pemantauan stok barang habis pakai, permintaan ATK, dan riwayat transaksi.",
    icon: Archive,
    path: "/inventory",
    color: "text-emerald-500 dark:text-emerald-400",
    bg: "bg-emerald-500/10 dark:bg-emerald-500/20",
    gradient: "from-emerald-500/20 to-transparent"
  },
  {
    id: "dereporting",
    name: "E-Reporting",
    desc: "Fasilitas pelaporan lalu lintas satwa dan pos penjagaan eksternal secara digital.",
    icon: FileText,
    path: "/dereporting",
    color: "text-purple-500 dark:text-purple-400",
    bg: "bg-purple-500/10 dark:bg-purple-500/20",
    gradient: "from-purple-500/20 to-transparent"
  },
];

export default function PortalPage() {
  const { user } = useAuth(); // Panggil intelijen keamanan kita

  // PENYARINGAN KETAT (Rule 2.1 & 2.3)
  const availableModules = MODULES.filter((m) => {
    if (user?.role === "super_admin") return true; // Bypass Super Admin
    return user?.access_modules?.includes(m.id);   // Pengecekan Izin Biasa
  });

  return (
    <div className="space-y-8 max-w-5xl mx-auto py-4">

      {/* BAGIAN KEPALA (Header Greeting) */}
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-white">
          Portal Aplikasi Terpadu
        </h1>
        <p className="text-zinc-500 dark:text-zinc-400 text-lg">
          Selamat datang kembali, <span className="font-bold text-emerald-600 dark:text-emerald-400">{user?.name}</span>. Silakan pilih ruang kerja (modul) Anda hari ini.
        </p>
      </div>

      {/* JIKA IZIN KOSONG (Empty State Warning) */}
      {availableModules.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-zinc-300 dark:border-zinc-700 p-12 flex flex-col items-center justify-center text-center bg-zinc-50/50 dark:bg-zinc-900/50 animate-in fade-in duration-500">
          <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-6 shadow-inner">
            <ShieldAlert className="w-8 h-8 text-red-600 dark:text-red-400" />
          </div>
          <h2 className="text-xl font-bold text-zinc-900 dark:text-white mb-2">Pintu Terkunci</h2>
          <p className="text-zinc-500 dark:text-zinc-400 max-w-md">
            Akun Anda saat ini tidak memiliki izin untuk membuka modul manapun. Harap menghubungi Administrator Pusat untuk penetapan akses.
          </p>
        </div>
      ) : (

        /* GRID DAFTAR MODUL (Kartu Interaktif Premium) */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {availableModules.map((mod, idx) => {
            const Icon = mod.icon;

            return (
              <Link
                key={mod.id}
                href={mod.path}
                // Animasi bertahap (Staggered fade-in) dihitung dari Index
                className="group relative overflow-hidden rounded-3xl bg-white/40 dark:bg-zinc-900/40 backdrop-blur-md border border-white/60 dark:border-zinc-800/60 p-7 hover:bg-white dark:hover:bg-zinc-900 hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)] dark:hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.5)] hover:-translate-y-2 transition-all duration-500 ease-out animate-in fade-in slide-in-from-bottom-8"
                style={{ animationDelay: `${idx * 150}ms`, animationFillMode: "both" }}
              >
                {/* Efek Sinar Mentari / Gradasi Tembus Pandang di Latar Belakang */}
                <div className={`absolute inset-0 bg-linear-to-br ${mod.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none`} />

                <div className="relative z-10 flex flex-col h-full">

                  {/* BARIS IKON & PANAH */}
                  <div className="flex items-center justify-between mb-5">
                    {/* Kotak Ikon Utama */}
                    <div className={`w-14 h-14 rounded-2xl ${mod.bg} border border-white/10 flex items-center justify-center transition-transform duration-500 group-hover:scale-110 group-hover:rotate-6 shadow-sm`}>
                      <Icon className={`w-7 h-7 ${mod.color}`} />
                    </div>
                    {/* Lingkaran Panah Kanan (Hanya muncul saat di-hover) */}
                    <div className="w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center opacity-0 -translate-x-6 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300 ease-out">
                      <ArrowRight className="w-5 h-5 text-zinc-600 dark:text-zinc-300" />
                    </div>
                  </div>

                  {/* TEKS JUDUL & DESKRIPSI */}
                  <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-2 tracking-tight group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors duration-300">
                    {mod.name}
                  </h3>
                  <p className="text-zinc-500 dark:text-zinc-400 leading-relaxed font-medium">
                    {mod.desc}
                  </p>

                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
