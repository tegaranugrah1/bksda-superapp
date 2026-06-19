export interface BriefProfile {
  id: number;
  name: string;
  username: string;
  role: string;
  access_modules: string[];
  permissions: string[];
  employee: {
    id: number;
    nip: string;
    nama_lengkap: string;
    jabatan: string;
    satuan_kerja: string;
    foto_profil: string | null;
  } | null;
}

export interface DashboardSummary {
  assigned_assets_count: number;
  active_loans_count: number;
  pending_my_letters_count: number;
  active_my_letters_count: number;
  pending_approvals_count: number;
}

export interface UrgentTaxVehicle {
  id: number | string;
  nama_barang: string;
  no_polisi?: string | null;
  tanggal_pajak_stnk: string;
}

export interface DashboardData {
  profile: BriefProfile;
  summary: DashboardSummary;
  urgent_tax_vehicles: UrgentTaxVehicle[];
  notifications: any[];
}
