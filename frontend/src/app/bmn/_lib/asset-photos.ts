import { resolveApiUrl } from "@/lib/api";

export interface AssetPhotoSource {
  photo_availability?: Partial<Record<"geotag" | "depan" | "belakang" | "kiri" | "kanan" | "lokasi", boolean>>;
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
  return resolveApiUrl(rawUrl);
}

/**
 * Returns the highest priority documentation photo available
 */
export function getPrimaryPhoto(asset: AssetPhotoSource, failedUrls: readonly string[] = []): { url: string; label: string } | null {
  const candidates = [
    [asset.foto_geotag_url || (asset.foto_geotag_path?.startsWith("http") ? asset.foto_geotag_path : null), "Geotag", "geotag"],
    [asset.foto_depan_url, "Tampak Depan", "depan"],
    [asset.foto_belakang_url, "Tampak Belakang", "belakang"],
    [asset.foto_kiri_url, "Tampak Kiri", "kiri"],
    [asset.foto_kanan_url, "Tampak Kanan", "kanan"],
    [asset.foto_lokasi_url, "Lokasi", "lokasi"],
    [asset.foto_url, "Dokumentasi", null],
  ] as const;
  for (const [raw, label, type] of candidates) {
    if (type && asset.photo_availability?.[type] === false) continue;
    const url = resolvePhotoUrl(raw);
    if (url && !failedUrls.includes(url)) return {url, label};
  }
  return null;
}
