import dynamic from "next/dynamic";
const RouteGuard = dynamic(() => import("@/components/route-guard").then((mod) => mod.RouteGuard), { 
  ssr: false,
  loading: () => (
    <div className="min-h-screen flex items-center justify-center bg-zinc-900">
      <div className="flex flex-col items-center gap-4">
        <div className="animate-spin w-10 h-10 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full"></div>
        <p className="text-emerald-500/50 text-sm font-medium animate-pulse">Memuat Modul...</p>
      </div>
    </div>
  )
});
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RouteGuard>
      {/* Background Dot Pattern Premium */}
      <div className="min-h-screen bg-zinc-50 dark:bg-black text-zinc-900 dark:text-zinc-100 flex overflow-hidden relative">
        <div className="absolute inset-0 z-0 opacity-[0.03] dark:opacity-[0.05] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, currentColor 1px, transparent 0)', backgroundSize: '24px 24px' }}></div>
        
        {/* Laci Navigasi Kiri */}
        <Sidebar />

        {/* Kolom Kanan (Konten Utama) */}
        <div className="flex-1 flex flex-col min-w-0 md:ml-64 transition-all duration-300 ease-in-out">

          {/* Navigasi Atas */}
          <Topbar />

          {/* Kanvas Halaman Tengah */}
          <main className="flex-1 p-6 md:p-8 overflow-y-auto overflow-x-hidden">
             {/* Animasi layar muncul dari bawah perlahan saat ganti rute */}
             <div className="mx-auto max-w-7xl animate-in fade-in slide-in-from-bottom-8 duration-700 ease-out">
                {children}
             </div>
          </main>

        </div>
      </div>
    </RouteGuard>
  );
}
