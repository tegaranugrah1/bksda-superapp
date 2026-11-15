export interface IBmnLocation {
  id: string;
  parent_id?: string | null;
  location_type?: "balai" | "seksi" | "room" | "resor";
  unit_kerja: string;
  drive_unit_id?: number | null;
  name: string;
  code?: string | null;
  description?: string | null;
  is_restricted?: boolean;
  is_active?: boolean;
  assets_count?: number;
  children_count?: number;
  active_employees_count?: number;
  parent?: {
    id: string;
    name: string;
    unit_kerja: string;
    location_type?: "balai" | "seksi" | "room" | "resor";
    drive_unit_id?: number | null;
    code?: string | null;
  } | null;
  drive_unit?: {
    id: number;
    slug: string;
    name: string;
  } | null;
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
