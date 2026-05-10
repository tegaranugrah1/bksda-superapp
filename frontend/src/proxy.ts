import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export default function proxy(request: NextRequest) {
  const token = request.cookies.get("bksda_token")?.value;
  const userStr = request.cookies.get("bksda_user")?.value;
  const { pathname } = request.nextUrl;

  // 1. Abaikan internal & aset
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.includes(".") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  // 2. Proteksi Halaman Login
  if (pathname === "/login") {
    if (token && userStr) {
      return NextResponse.redirect(new URL("/portal", request.url));
    }
    return NextResponse.next();
  }

  // 3. Proteksi Halaman Privat
  const isPrivateRoute =
    pathname === "/" ||
    pathname === "/portal" ||
    pathname.startsWith("/kepegawaian") ||
    pathname.startsWith("/bmn") ||
    pathname.startsWith("/inventory") ||
    pathname.startsWith("/dereporting") ||
    pathname.startsWith("/cms");

  if (isPrivateRoute) {
    if (!token || !userStr) {
      const response = NextResponse.redirect(new URL("/login", request.url));
      response.cookies.delete("bksda_token");
      response.cookies.delete("bksda_user");
      return response;
    }

    try {
      const user = JSON.parse(decodeURIComponent(userStr));
      const requiredModule = getRequiredModuleFromPath(pathname);

      if (requiredModule && user.role !== "super_admin") {
        const modules = user.access_modules || [];
        if (!modules.includes(requiredModule)) {
          return NextResponse.redirect(new URL("/403", request.url));
        }
      }
    } catch {
      const response = NextResponse.redirect(new URL("/login", request.url));
      response.cookies.delete("bksda_token");
      response.cookies.delete("bksda_user");
      return response;
    }
  }

  return NextResponse.next();
}

function getRequiredModuleFromPath(pathname: string): string | null {
  if (pathname.startsWith("/kepegawaian")) return "kepegawaian";
  if (pathname.startsWith("/bmn")) return "bmn";
  if (pathname.startsWith("/inventory")) return "inventory";
  if (pathname.startsWith("/dereporting")) return "dereporting";
  return null;
}

export const config = {
  matcher: [
    "/",
    "/login",
    "/portal",
    "/portal/:path*",
    "/kepegawaian/:path*",
    "/bmn/:path*",
    "/inventory/:path*",
    "/dereporting/:path*",
    "/cms/:path*",
    "/403",
  ],
};
