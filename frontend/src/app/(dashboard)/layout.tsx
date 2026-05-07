import { cookies } from "next/headers";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import type { User } from "@/hooks/useAuth";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const userCookie = cookieStore.get("bksda_user")?.value;
  let serverUser: User | null = null;

  if (userCookie) {
    try {
      serverUser = JSON.parse(decodeURIComponent(userCookie));
      if (serverUser?.nama_lengkap && !serverUser.name) {
        serverUser.name = serverUser.nama_lengkap;
      }
    } catch {
      serverUser = null;
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black text-zinc-900 dark:text-zinc-100 flex overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 md:ml-64">
        <Topbar serverUser={serverUser} />
        <main className="flex-1 p-6 md:p-8">
          <div className="mx-auto max-w-7xl">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
