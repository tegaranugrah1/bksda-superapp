import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Map route paths to module names
const MODULE_ROUTES: Record<string, string> = {
  "bmn": "bmn",
  "inventory": "inventory",
  "kepegawaian": "kepegawaian",
  "dereporting": "dereporting",
  "cms": "cms",
};

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Define protected routes
  const isProtectedRoute = 
    pathname.startsWith('/portal') ||
    pathname.startsWith('/bmn') ||
    pathname.startsWith('/inventory') ||
    pathname.startsWith('/kepegawaian') ||
    pathname.startsWith('/dereporting') ||
    pathname.startsWith('/cms');

  if (!isProtectedRoute) {
    return NextResponse.next();
  }

  // 2. Check for token
  const token = request.cookies.get('bksda_token')?.value;
  if (!token) {
    const url = new URL('/login', request.url);
    // Store original destination to redirect back after login if needed
    // url.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(url);
  }

  // 3. Check for user access modules
  const userCookie = request.cookies.get('bksda_user')?.value;
  if (!userCookie) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  try {
    const user = JSON.parse(decodeURIComponent(userCookie));
    
    // Super admin bypasses all checks
    if (user.role === 'super_admin') {
      return NextResponse.next();
    }

    // Identify which module the user is trying to access
    // Path looks like /bmn/assets or /inventory
    const segments = pathname.split('/');
    const firstSegment = segments[1]; // segment[0] is empty string

    const moduleToCheck = MODULE_ROUTES[firstSegment];

    if (moduleToCheck) {
      const userModules = user.access_modules || [];
      if (!userModules.includes(moduleToCheck)) {
        // Unauthorized for this specific module
        return NextResponse.redirect(new URL('/portal?unauthorized=1', request.url));
      }
    }

  } catch (error) {
    console.error('Middleware auth parsing error:', error);
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

// See "Matching Paths" below to learn more
export const config = {
  matcher: [
    '/portal/:path*',
    '/bmn/:path*',
    '/inventory/:path*',
    '/kepegawaian/:path*',
    '/dereporting/:path*',
    '/cms/:path*',
  ],
};
