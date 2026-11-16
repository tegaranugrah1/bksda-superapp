import fs from "node:fs";
import { NextResponse, type NextRequest } from "next/server";
import { chromium, type Browser } from "playwright-core";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_HTML_BYTES = 10 * 1024 * 1024; // 10 MB cap (includes inlined base64 Kop/TTD images)
const MAX_CONCURRENT_RENDERS = 3;
let activePdfRenders = 0;

const CHROMIUM_CANDIDATES = [
  process.env.CHROMIUM_EXECUTABLE_PATH,
  "/usr/bin/chromium-browser",
  "/usr/bin/chromium",
  "/usr/bin/google-chrome",
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
].filter((p): p is string => Boolean(p));

// ponytail: single Chromium process per Next server worker to avoid cold-start latency per click; recycle if disconnected.
let browserPromise: Promise<Browser> | null = null;

async function getBrowser(): Promise<Browser> {
  if (browserPromise) {
    try {
      const existing = await browserPromise;
      if (existing.isConnected()) return existing;
    } catch {
      browserPromise = null;
    }
  }

  const executablePath = CHROMIUM_CANDIDATES.find((candidate) => fs.existsSync(candidate));
  browserPromise = chromium
    .launch({
      ...(executablePath ? { executablePath } : {}),
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage", "--disable-gpu"],
    })
    .catch((err) => {
      browserPromise = null;
      throw err;
    });

  const browser = await browserPromise;
  browser.once("disconnected", () => {
    browserPromise = null;
  });
  return browser;
}

function getUserVerifyUrls(): string[] {
  const urls: string[] = [];
  if (process.env.INTERNAL_API_URL) {
    urls.push(`${process.env.INTERNAL_API_URL.replace(/\/$/, "")}/surat/templates`);
  }
  if (process.env.NODE_ENV === "production") {
    urls.push("http://nginx-backend/api/surat/templates");
  }
  const publicApi = process.env.NEXT_PUBLIC_API_URL;
  if (publicApi?.startsWith("http")) {
    urls.push(`${publicApi.replace(/\/$/, "")}/surat/templates`);
  }
  if (process.env.NODE_ENV !== "production") {
    urls.push("http://127.0.0.1:8000/api/surat/templates");
  }
  return Array.from(new Set(urls));
}

async function authorizeSuratRequest(request: NextRequest): Promise<{ ok: true } | { ok: false; status: number }> {
  const authHeader = request.headers.get("authorization");
  const cookieHeader = request.headers.get("cookie");
  const cookieToken = request.cookies.get("bksda_token")?.value;
  if (!authHeader && !cookieHeader && !cookieToken) {
    return { ok: false, status: 401 };
  }

  const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
  const proto = request.headers.get("x-forwarded-proto") || "http";
  const fallbackOrigin = host ? `${proto}://${host}` : request.nextUrl.origin;
  const origin = request.headers.get("origin") || fallbackOrigin;
  const referer = request.headers.get("referer") || `${origin}/`;

  // Forward Origin & Referer so Laravel Sanctum EnsureFrontendRequestsAreStateful accepts session cookies (laravel_session).
  const headers: Record<string, string> = {
    Accept: "application/json",
    Origin: origin,
    Referer: referer,
  };
  if (authHeader) {
    headers.Authorization = authHeader;
  } else if (cookieToken) {
    headers.Authorization = `Bearer ${cookieToken}`;
  }
  if (cookieHeader) headers.Cookie = cookieHeader;

  for (const url of getUserVerifyUrls()) {
    try {
      const res = await fetch(url, { headers, cache: "no-store" });
      if (res.status === 401 || res.status === 403 || res.status === 423) {
        return { ok: false, status: res.status };
      }
      if (!res.ok) continue;

      return { ok: true };
    } catch {
      // Try next candidate backend URL on network error
    }
  }

  return { ok: false, status: 401 };
}

function sanitizeHtmlForPdf(rawHtml: string): string {
  return rawHtml
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<(iframe|object|embed|base)\b[^>]*>[\s\S]*?<\/\1>/gi, "")
    .replace(/<(iframe|object|embed|base)\b[^>]*\/?>/gi, "")
    .replace(/<meta\b[^>]*http-equiv\s*=[^>]*>/gi, "")
    .replace(/\son[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/javascript\s*:/gi, "");
}

function sanitizePdfFilename(rawName: unknown): string {
  const base = typeof rawName === "string" ? rawName.trim() : "";
  const clean = base.replace(/[^a-zA-Z0-9_.-]/g, "_").replace(/\.+$/g, "");
  const stem = clean.toLowerCase().endsWith(".pdf") ? clean : `${clean || "Surat_Dinas"}.pdf`;
  return stem.slice(0, 120);
}

export async function POST(request: NextRequest) {
  const contentType = request.headers.get("content-type") || "";
  if (!contentType.toLowerCase().includes("application/json")) {
    return NextResponse.json({ message: "Content-Type harus application/json." }, { status: 415 });
  }

  const auth = await authorizeSuratRequest(request);
  if (!auth.ok) {
    return NextResponse.json({ message: "Unauthorized" }, { status: auth.status });
  }

  let body: { html?: unknown; filename?: unknown };
  try {
    const rawBody = await request.text();
    if (!rawBody || rawBody.length > MAX_HTML_BYTES) {
      return NextResponse.json({ message: "Payload HTML tidak valid atau terlalu besar." }, { status: 400 });
    }
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ message: "Body JSON tidak valid." }, { status: 400 });
  }

  if (typeof body.html !== "string" || body.html.trim().length === 0) {
    return NextResponse.json({ message: "Konten HTML wajib diisi." }, { status: 400 });
  }

  if (activePdfRenders >= MAX_CONCURRENT_RENDERS) {
    return NextResponse.json({ message: "Server PDF sedang sibuk. Silakan coba beberapa saat lagi." }, { status: 429 });
  }

  const safeHtml = sanitizeHtmlForPdf(body.html);
  const safeFilename = sanitizePdfFilename(body.filename);

  activePdfRenders++;
  let context: Awaited<ReturnType<Browser["newContext"]>> | null = null;
  try {
    const browser = await getBrowser();
    context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();

    // Block all non-inline network fetches inside headless Chromium to eliminate SSRF
    await page.route("**/*", (route) => {
      const url = route.request().url();
      if (url.startsWith("about:") || url.startsWith("data:") || url.startsWith("blob:")) {
        return route.continue();
      }
      return route.abort();
    });

    await page.setContent(safeHtml, { waitUntil: "load", timeout: 15000 });
    await page.emulateMedia({ media: "print" });

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true,
    });

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${safeFilename}"`,
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (err) {
    console.error("[export-pdf] Failed to render PDF:", err);
    return NextResponse.json({ message: "Gagal merender PDF vektor di server." }, { status: 500 });
  } finally {
    activePdfRenders = Math.max(0, activePdfRenders - 1);
    if (context) {
      await context.close().catch(() => {});
    }
  }
}
