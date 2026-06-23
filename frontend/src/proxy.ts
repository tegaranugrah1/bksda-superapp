import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Map route paths to module names
const MODULE_ROUTES: Record<string, string> = {
  "bmn": "bmn",
  "inventory": "inventory",
  "kepegawaian": "kepegawaian",
  "dereporting": "dereporting",
  "cms": "cms",
};

export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const loggedIn = request.cookies.get('bksda_logged_in')?.value;
  const userCookie = request.cookies.get('bksda_user')?.value;

  // 1. Abaikan internal & aset
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.includes(".") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  // 2. Halaman login harus tetap bisa dibuka.
  // Cookie penanda login bisa tertinggal setelah session backend habis, jadi
  // validasi session dilakukan di client login page sebelum redirect ke portal.
  if (pathname === "/login") {
    return NextResponse.next();
  }

  // 3. Define protected routes
  const isProtectedRoute = 
    pathname === "/" ||
    pathname.startsWith('/portal') ||
    pathname.startsWith('/bmn') ||
    pathname.startsWith('/inventory') ||
    pathname.startsWith('/kepegawaian') ||
    pathname.startsWith('/dereporting') ||
    pathname.startsWith('/cms');

  if (!isProtectedRoute) {
    return NextResponse.next();
  }

  // 4. Check for session
  if (!loggedIn || !userCookie) {
    const url = new URL('/login', request.url);
    const response = NextResponse.redirect(url);
    // Cleanup invalid cookies if any
    response.cookies.delete("bksda_logged_in");
    response.cookies.delete("bksda_user");
    response.cookies.delete("bksda_token");
    return response;
  }

  try {
    const user = JSON.parse(decodeURIComponent(userCookie));
    
    // Super admin bypasses all checks
    if (user.role === 'super_admin') {
      return NextResponse.next();
    }

    // Identify which module the user is trying to access
    const segments = pathname.split('/');
    const firstSegment = segments[1]; 

    const moduleToCheck = MODULE_ROUTES[firstSegment];

    if (moduleToCheck) {
      const userModules = user.access_modules || [];
      if (!userModules.includes(moduleToCheck)) {
        // Unauthorized for this specific module - Redirect to portal with warning
        return NextResponse.redirect(new URL('/portal?unauthorized=1', request.url));
      }
    }

  } catch (error) {
    console.error('Proxy auth parsing error:', error);
    const response = NextResponse.redirect(new URL('/login', request.url));
    response.cookies.delete("bksda_logged_in");
    response.cookies.delete("bksda_user");
    response.cookies.delete("bksda_token");
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/',
    '/login',
    '/portal/:path*',
    '/bmn/:path*',
    '/inventory/:path*',
    '/kepegawaian/:path*',
    '/dereporting/:path*',
    '/cms/:path*',
  ],
};
