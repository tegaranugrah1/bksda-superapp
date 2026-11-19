import api from "@/lib/api";

/** Only the configured API's BMN media endpoints may receive credentials. */
export function getBmnMediaUrl(raw?: string | null): string | null {
  if (!raw) return null;
  try {
    const origin = typeof window === "undefined" ? "http://127.0.0.1:3000" : window.location.origin;
    const base = new URL(api.defaults.baseURL || "/api", origin);
    const url = new URL(raw, base.origin);
    const prefix = base.pathname.replace(/\/$/, "");
    if (url.origin !== base.origin || url.username || url.password || !url.pathname.startsWith(`${prefix}/`)) return null;
    const path = url.pathname.slice(prefix.length);
    if (!/^\/bmn\/(assets\/[^/]+\/(photo\/[^/]+\/(view|download)|document\/(bpkb|stnk)\/(view|download|preview(?:\/\d+)?))|power-of-attorneys\/[^/]+\/ktp)\/?$/.test(path)) return null;
    for (const key of [...url.searchParams.keys()]) if (key.toLowerCase().split("[")[0] === "token") url.searchParams.delete(key);
    return url.href;
  } catch { return null; }
}

export async function fetchBmnMedia(raw: string): Promise<Blob> {
  const url = getBmnMediaUrl(raw);
  if (!url) throw new Error("Alamat berkas BMN tidak diizinkan.");
  const response = await api.get<Blob>(url, { responseType: "blob" });
  if (!/^(application\/pdf|image\/(jpeg|png|webp|gif))$/i.test(response.data.type.split(";")[0].trim())) throw new Error("Format berkas BMN tidak didukung.");
  return response.data;
}

export async function openBmnMedia(raw: string, downloadName?: string): Promise<void> {
  const url = getBmnMediaUrl(raw);
  if (!url) throw new Error("Alamat berkas BMN tidak diizinkan.");
  const tab = downloadName ? null : window.open("about:blank", "_blank");
  if (tab) tab.opener = null;
  try {
    const blob = await fetchBmnMedia(url);
    const uri = URL.createObjectURL(blob);
    if (tab) tab.location.replace(uri);
    else {
      const link = document.createElement("a");
      link.href = uri; link.rel = "noopener noreferrer";
      link.download = (downloadName || "Dokumen_BMN.pdf").replace(/[\\/\r\n]/g, "_");
      document.body.appendChild(link); link.click(); link.remove();
    }
    setTimeout(() => URL.revokeObjectURL(uri), 60_000);
  } catch (error) { tab?.close(); throw error; }
}
