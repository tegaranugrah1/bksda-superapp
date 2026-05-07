import { RouteGuard } from "@/components/route-guard";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // SECURITY WALL: Tolak siapapun yang mencoba merender HTML ini tanpa token
    <RouteGuard>
      <div className="min-h-screen bg-zinc-50 dark:bg-black text-zinc-900 dark:text-zinc-100 flex overflow-hidden">

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
