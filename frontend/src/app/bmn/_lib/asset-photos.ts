export interface AssetPhotoSource {
  foto_geotag_url?: string | null;
  foto_geotag_path?: string | null;
  foto_depan_url?: string | null;
  foto_belakang_url?: string | null;
  foto_kiri_url?: string | null;
  foto_kanan_url?: string | null;
  foto_lokasi_url?: string | null;
  foto_url?: string | null;
}

/**
 * Converts Google Drive share URLs into direct embeddable images and prefixes relative paths
 */
export function resolvePhotoUrl(rawUrl?: string | null): string | null {
  if (!rawUrl) return null;
  const match = rawUrl.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (match) {
    return `https://lh3.googleusercontent.com/d/${match[1]}`;
  }
  if (rawUrl.startsWith("/")) {
    const apiBase = process.env.NEXT_PUBLIC_API_URL;
    if (apiBase && apiBase.startsWith("http")) {
      try {
        const origin = new URL(apiBase).origin;
        return `${origin}${rawUrl}`;
      } catch {
        return rawUrl;
      }
    }
  }
  return rawUrl;
}

/**
 * Returns the highest priority documentation photo available
 */
export function getPrimaryPhoto(asset: AssetPhotoSource): { url: string; label: string } | null {
  const geotag = asset.foto_geotag_url || (asset.foto_geotag_path?.startsWith("http") ? asset.foto_geotag_path : null);
  if (geotag) {
    const url = resolvePhotoUrl(geotag);
    if (url) return { url, label: "Geotag" };
  }
  if (asset.foto_depan_url) {
    const url = resolvePhotoUrl(asset.foto_depan_url);
    if (url) return { url, label: "Tampak Depan" };
  }
  if (asset.foto_belakang_url) {
    const url = resolvePhotoUrl(asset.foto_belakang_url);
    if (url) return { url, label: "Tampak Belakang" };
  }
  if (asset.foto_kiri_url) {
    const url = resolvePhotoUrl(asset.foto_kiri_url);
    if (url) return { url, label: "Tampak Kiri" };
  }
  if (asset.foto_kanan_url) {
    const url = resolvePhotoUrl(asset.foto_kanan_url);
    if (url) return { url, label: "Tampak Kanan" };
  }
  if (asset.foto_lokasi_url) {
    const url = resolvePhotoUrl(asset.foto_lokasi_url);
    if (url) return { url, label: "Lokasi" };
  }
  if (asset.foto_url) {
    const url = resolvePhotoUrl(asset.foto_url);
    if (url) return { url, label: "Dokumentasi" };
  }
  return null;
}
