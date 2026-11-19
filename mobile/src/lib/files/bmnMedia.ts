import { apiClient } from "@/lib/api/client";

export function resolveBmnMediaUrl(raw?: string): string | null {
  if (!raw) return null;
  try {
    const api = new URL(String(apiClient.defaults.baseURL));
    const url = new URL(raw, api.origin);
    const prefix = api.pathname.replace(/\/$/, "");
    if (url.origin !== api.origin || url.username || url.password || !url.pathname.startsWith(`${prefix}/`)) return null;
    if (!/^\/bmn\/(assets\/[^/]+\/(photo\/[^/]+\/(view|download)|document\/(bpkb|stnk)\/(view|download|preview(?:\/\d+)?))|power-of-attorneys\/[^/]+\/ktp)\/?$/.test(url.pathname.slice(prefix.length))) return null;
    for (const key of [...url.searchParams.keys()]) if (key.toLowerCase().split("[")[0] === "token") url.searchParams.delete(key);
    return url.href;
  } catch { return null; }
}
