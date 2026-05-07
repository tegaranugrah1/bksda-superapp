import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Proxy berjalan di Edge Runtime (Server) sebelum request mencapai React Components.
// Ini mencegah routing bug BFCache / popstate yang sering terjadi di Next.js App Router.
export function proxy(request: NextRequest) {
  const token = request.cookies.get("bksda_token")?.value;
  const userStr = request.cookies.get("bksda_user")?.value;

  const { pathname } = request.nextUrl;

  // Jika tidak ada token dan user mencoba mengakses rute privat
  if (!token || !userStr) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Parse userData dari cookie
  try {
    const user = JSON.parse(decodeURIComponent(userStr));
    
    // Authorization Rules berdasarkan URL
    // Jika path diawali dengan modul tertentu, pastikan user memiliki akses
    
    const requiredModule = getRequiredModuleFromPath(pathname);
    
    if (requiredModule && user.role !== "super_admin") {
      const modules = user.access_modules || [];
      if (!modules.includes(requiredModule)) {
        return NextResponse.redirect(new URL("/403", request.url));
      }
    }
    
    // Jika lolos, biarkan request berlanjut
    return NextResponse.next();
  } catch (_error) {
    // Jika cookie rusak/tidak bisa di-parse, paksa login ulang
    const response = NextResponse.redirect(new URL("/login", request.url));
    response.cookies.delete("bksda_token");
    response.cookies.delete("bksda_user");
    return response;
  }
}

// Fungsi helper untuk memetakan URL path ke nama modul
function getRequiredModuleFromPath(pathname: string): string | null {
  if (pathname.startsWith("/kepegawaian")) return "kepegawaian";
  if (pathname.startsWith("/bmn")) return "bmn";
  if (pathname.startsWith("/inventory")) return "inventory";
  if (pathname.startsWith("/dereporting")) return "dereporting";
  if (pathname.startsWith("/cms") && !pathname.startsWith("/cms/public")) return "cms"; // Asumsi public CMS aman
  return null;
}

// Tentukan rute mana saja yang akan dicegat oleh middleware
export const config = {
  matcher: [
    /*
     * Match semua rute privat.
     * PENTING: Jangan masukkan /login, /403, /api, atau rute statis (_next, favicon.ico)
     */
    "/kepegawaian/:path*",
    "/bmn/:path*",
    "/inventory/:path*",
    "/dereporting/:path*",
    // Jika nanti ada dashboard root yg butuh proteksi, tambahkan di sini
  ],
};
