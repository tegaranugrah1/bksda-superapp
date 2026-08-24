import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Map route paths to module names
const MODULE_ROUTES: Record<string, string> = {
  "bmn": "bmn",
  "inventory": "inventory",
  "kepegawaian": "kepegawaian",
  "keuangan": "keuangan",
  "dereporting": "dereporting",
  "cms": "cms",
  "surat": "surat",
};

export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const loggedIn = request.cookies.get("bksda_logged_in")?.value;
  const userCookie = request.cookies.get("bksda_user")?.value;

  // 1. Abaikan internal & aset
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.includes(".") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  // 2. Proteksi Halaman Login (Redirect jika sudah ada cookie login)
  if (pathname === "/login" && loggedIn && userCookie) {
    return NextResponse.redirect(new URL("/portal", request.url));
  }

  // 3. Define protected routes
  const isProtectedRoute = 
    pathname === "/" ||
    pathname.startsWith("/portal") ||
    pathname.startsWith("/bmn") ||
    pathname.startsWith("/inventory") ||
    pathname.startsWith("/kepegawaian") ||
    pathname.startsWith("/keuangan") ||
    pathname.startsWith("/dereporting") ||
    pathname.startsWith("/cms") ||
    pathname.startsWith("/surat");

  if (!isProtectedRoute) {
    return NextResponse.next();
  }

  // Jika belum ada cookie login, serahkan ke RouteGuard client-side
  if (!loggedIn || !userCookie) {
    return NextResponse.next();
  }

  try {
    let userStr = userCookie;
    try {
      userStr = decodeURIComponent(userCookie);
    } catch {
      userStr = userCookie;
    }

    let user: any = null;
    try {
      user = JSON.parse(userStr);
    } catch {
      try {
        user = JSON.parse(userCookie);
      } catch {}
    }

    if (!user) {
      return NextResponse.next();
    }

    // Super admin bypasses all checks
    if (user.role === "super_admin") {
      return NextResponse.next();
    }

    // Identify which module the user is trying to access
    const segments = pathname.split("/");
    const firstSegment = segments[1]; 

    const moduleToCheck = MODULE_ROUTES[firstSegment];

    if (moduleToCheck) {
      const userModules = user.access_modules || [];
      if (!userModules.includes(moduleToCheck)) {
        // Unauthorized for this specific module - Redirect to portal with warning
        return NextResponse.redirect(new URL("/portal?unauthorized=1", request.url));
      }
    }
  } catch (error) {
    console.error("Proxy auth parsing error:", error);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/login",
    "/portal/:path*",
    "/bmn/:path*",
    "/inventory/:path*",
    "/kepegawaian/:path*",
    "/keuangan/:path*",
    "/dereporting/:path*",
    "/cms/:path*",
    "/surat/:path*",
  ],
};
