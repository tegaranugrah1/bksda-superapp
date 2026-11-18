"use client";

import Echo from "laravel-echo";
import Pusher from "pusher-js";

if (typeof window !== "undefined") {
  (window as unknown as { Pusher: typeof Pusher }).Pusher = Pusher;
}

let echoInstance: Echo<"reverb"> | null = null;
let currentToken: string | null = null;
let lastAuthRecoveryAt = 0;

function requestRealtimeAuthSync(resetConnection: boolean): void {
  const now = Date.now();
  if (now - lastAuthRecoveryAt < 3000) return;
  lastAuthRecoveryAt = now;
  if (resetConnection) {
    disconnectEcho();
  }
  window.dispatchEvent(new Event("sync-auth-now"));
}

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
    const browserHostname = window.location.hostname;
    const isLocalHost = (host: string) => host === "localhost" || host === "127.0.0.1";
    const resolveLocalHost = (host: string) => (isLocalHost(host) && isLocalHost(browserHostname) ? browserHostname : host);

    let wsHost = browserHostname;
    let wsPort = 443;
    let forceTLS = window.location.protocol === "https:";

    const envApi = process.env.NEXT_PUBLIC_API_URL;
    let authEndpoint = "/api/broadcasting/auth";

    if (envApi && envApi.startsWith("http")) {
      try {
        const u = new URL(envApi);
        const normalizedHost = resolveLocalHost(u.hostname);
        u.hostname = normalizedHost;
        wsHost = normalizedHost;
        authEndpoint = `${u.toString().replace(/\/$/, "")}/broadcasting/auth`;
        if (u.protocol === "http:") {
          // Local `php artisan serve` listens on :8000 while Reverb listens on :8080.
          wsPort = isLocalHost(u.hostname) && u.port === "8000" ? 8080 : parseInt(u.port || "80", 10);
          forceTLS = false;
        } else {
          wsPort = parseInt(u.port || "443", 10);
          forceTLS = true;
        }
      } catch {
        // Fallback default
      }
    }

    const envReverbHost = process.env.NEXT_PUBLIC_REVERB_HOST;
    const envReverbPort = process.env.NEXT_PUBLIC_REVERB_PORT;
    const envReverbScheme = process.env.NEXT_PUBLIC_REVERB_SCHEME;
    if (envReverbHost) wsHost = resolveLocalHost(envReverbHost);
    if (envReverbScheme === "https" || envReverbScheme === "http") forceTLS = envReverbScheme === "https";
    if (envReverbPort) {
      const p = parseInt(envReverbPort, 10);
      if (Number.isFinite(p) && p > 0) wsPort = p;
    }

    echoInstance = new Echo({
      broadcaster: "reverb",
      key: appKey,
      wsHost,
      wsPort: forceTLS ? 443 : wsPort,
      wssPort: forceTLS ? wsPort : 443,
      forceTLS,
      enabledTransports: ["ws", "wss"],
      authEndpoint,
      auth: {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      },
      channelAuthorization: {
        customHandler: async ({ socketId, channelName }, callback) => {
          const activeToken = localStorage.getItem("bksda_token");
          if (!activeToken) {
            requestRealtimeAuthSync(true);
            callback(new Error("Missing realtime auth token"), null);
            return;
          }

          try {
            const res = await fetch(authEndpoint, {
              method: "POST",
              headers: {
                Authorization: `Bearer ${activeToken}`,
                Accept: "application/json",
                "Content-Type": "application/x-www-form-urlencoded",
              },
              body: new URLSearchParams({
                socket_id: socketId,
                channel_name: channelName,
              }).toString(),
            });

            if (res.status === 401 || res.status === 403) {
              // Revoked token requires teardown + token recovery; 403 only syncs latest role/modules.
              requestRealtimeAuthSync(res.status === 401);
              callback(new Error(`Broadcasting auth failed with HTTP ${res.status}`), null);
              return;
            }

            if (!res.ok) {
              callback(new Error(`Broadcasting auth failed with HTTP ${res.status}`), null);
              return;
            }

            const data = await res.json();
            callback(null, data);
          } catch (err) {
            callback(err instanceof Error ? err : new Error("Broadcasting auth failed"), null);
          }
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
