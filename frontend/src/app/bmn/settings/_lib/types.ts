export interface IBmnLocation {
  id: string;
  unit_kerja: string;
  name: string;
  description?: string | null;
  assets_count?: number;
}

export interface IBmnAssetType {
  id: string;
  name: string;
  category_mode: "kendaraan" | "tanah" | "bangunan" | "peralatan";
  description?: string | null;
  assets_count?: number;
}

export const STANDARD_UNIT_KERJA = [
  "Kantor Balai KSDA Kalimantan Timur",
  "Seksi KSDA Wilayah I (Berau)",
  "Seksi KSDA Wilayah II (Tenggarong)",
  "Seksi KSDA Wilayah III (Balikpapan)",
];
