"use client";

import Echo from "laravel-echo";
import Pusher from "pusher-js";

if (typeof window !== "undefined") {
  (window as unknown as { Pusher: typeof Pusher }).Pusher = Pusher;
}

let echoInstance: Echo<"reverb"> | null = null;
let currentToken: string | null = null;

export function getRealtimeTokenId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("bksda_token")?.match(/^([1-9]\d*)\|[^|\s]+$/)?.[1] ?? null;
}

/**
 * Mendapatkan singleton instance Laravel Echo (Reverb).
 * Mengembalikan null jika:
 * - Dijalankan di SSR
 * - NEXT_PUBLIC_REVERB_APP_KEY belum diset
 * - Pengguna belum login (token kosong)
 *
 * Sesuai prinsip ponytail: fallback aman tanpa merusak UI jika Reverb offline.
 */
export function getEcho(): Echo<"reverb"> | null {
  if (typeof window === "undefined") return null;

  const appKey = process.env.NEXT_PUBLIC_REVERB_APP_KEY;
  if (!appKey) {
    return null;
  }

  const token = localStorage.getItem("bksda_token");
  if (!token || !getRealtimeTokenId()) {
    disconnectEcho();
    return null;
  }

  // Jika token berganti (misal re-login), re-create instance dengan auth token baru
  if (echoInstance && currentToken !== token) {
    disconnectEcho();
  }

  if (echoInstance) {
    return echoInstance;
  }

  try {
    let wsHost = window.location.hostname;
    let wsPort = 443;
    let forceTLS = window.location.protocol === "https:";

    const envApi = process.env.NEXT_PUBLIC_API_URL;
    let authEndpoint = "/api/broadcasting/auth";

    if (envApi && envApi.startsWith("http")) {
      try {
        const u = new URL(envApi);
        wsHost = u.hostname;
        authEndpoint = `${envApi.replace(/\/$/, "")}/broadcasting/auth`;
        if (u.protocol === "http:") {
          wsPort = parseInt(u.port || "80", 10);
          forceTLS = false;
        } else {
          wsPort = parseInt(u.port || "443", 10);
          forceTLS = true;
        }
      } catch {
        // Fallback default
      }
    }

    echoInstance = new Echo({
      broadcaster: "reverb",
      key: appKey,
      wsHost,
      wsPort: forceTLS ? 443 : wsPort,
      wssPort: forceTLS ? 443 : wsPort,
      forceTLS,
      enabledTransports: ["ws", "wss"],
      authEndpoint,
      auth: {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      },
    });

    currentToken = token;
    return echoInstance;
  } catch (err) {
    console.warn("[Echo] Gagal inisialisasi WebSocket Echo:", err);
    return null;
  }
}

/**
 * Putus koneksi WebSocket saat logout atau pembersihan.
 */
export function disconnectEcho(): void {
  if (echoInstance) {
    try {
      echoInstance.disconnect();
    } catch {
      // Ignore disconnect errors
    }
    echoInstance = null;
    currentToken = null;
  }
}
