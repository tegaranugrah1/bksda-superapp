import { apiClient } from "@/lib/api/client";
import type { ToneKey } from "./portalHelpers";

export function resolveMobilePhotoUrl(rawUrl?: string | null): string | null {
  if (!rawUrl) return null;
  const gdriveMatch = rawUrl.match(/\/d\/([a-zA-Z0-9_-]+)/) || rawUrl.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (gdriveMatch) {
    return `https://lh3.googleusercontent.com/d/${gdriveMatch[1]}`;
  }
  if (rawUrl.startsWith("/") && !rawUrl.startsWith("//")) {
    const origin = String(apiClient.defaults.baseURL || "").replace(/\/api\/?$/, "");
    return origin ? `${origin}${rawUrl}` : rawUrl;
  }
  return /^https?:\/\//i.test(rawUrl) ? rawUrl : null;
}

export function getPrimaryAssetPhoto(item: any): { key: string; label: string; url: string } | null {
  const candidates: [string, string, string | null | undefined][] = [
    ["geotag", "Foto Geotag", item?.foto_geotag_url || (item?.foto_geotag_path?.startsWith("http") ? item.foto_geotag_path : null)],
    ["depan", "Tampak Depan", item?.foto_depan_url],
    ["belakang", "Tampak Belakang", item?.foto_belakang_url],
    ["kiri", "Tampak Kiri", item?.foto_kiri_url],
    ["kanan", "Tampak Kanan", item?.foto_kanan_url],
    ["lokasi", "Foto Lokasi", item?.foto_lokasi_url],
    ["foto", "Dokumentasi", item?.foto_url],
  ];
  for (const [key, label, raw] of candidates) {
    const url = resolveMobilePhotoUrl(raw);
    if (url) return { key, label, url };
  }
  return null;
}

export function matchesAssetCategory(item: any, category: string): boolean {
  if (category === "all") return true;
  const jenis = String(item?.jenis_bmn || "").toLowerCase();
  const nama = String(item?.nama_barang || "").toLowerCase();
  if (category === "kendaraan") {
    return (
      item?.kategori === "kendaraan" ||
      jenis.includes("kendaraan") ||
      jenis.includes("angkutan") ||
      Boolean(item?.no_polisi)
    );
  }
  if (category === "it") {
    return item?.kategori === "it" || jenis.includes("ti") || nama.includes("laptop") || nama.includes("pc");
  }
  if (category === "peralatan") {
    return (
      item?.kategori === "peralatan" ||
      jenis.includes("lapangan") ||
      jenis.includes("navigasi") ||
      nama.includes("gps") ||
      nama.includes("drone") ||
      nama.includes("kamera")
    );
  }
  return true;
}

export function formatAssetCondition(raw?: string | null): { label: string; shortLabel: string; tone: ToneKey } {
  const clean = String(raw || "B").trim().toUpperCase();
  if (clean === "B" || clean === "BAIK") return { label: "Kondisi: Baik", shortLabel: "Baik", tone: "success" };
  if (clean === "RR" || clean.includes("RINGAN")) return { label: "Rusak Ringan", shortLabel: "RR", tone: "warning" };
  return { label: "Rusak Berat", shortLabel: "RB", tone: "danger" };
}

export function formatAssetMerkTipe(item: any): string {
  const parts = [item?.merk_tipe, item?.merk, item?.tipe]
    .filter(Boolean)
    .join(" ")
    .split(/[\s,]+/)
    .filter(Boolean);
  if (parts.length === 0) return "-";
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const part of parts) {
    const key = part.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(part);
    }
  }
  return unique.join(" ");
}
