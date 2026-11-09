export interface Employee {
  id: string;
  nip: string;
  nama_lengkap: string;
  name?: string;
  jabatan?: string | null;
  position?: string | null;
  pangkat_golongan?: string | null;
  satuan_kerja?: string | null;
  nama_bank?: string | null;
  nomor_rekening?: string | null;
  telepon?: string | null;
  email?: string | null;
  is_active: boolean;
  is_pppk?: boolean;
  is_mmp?: boolean;
  jenis_pegawai?: "PNS" | "PPPK" | "MMP";
  foto_url?: string | null;
  resor?: string | null;
  masa_kerja?: string | null;
  deleted_at?: string | null;
  inactive_reason?: string | null;
  inactive_reason_label?: string | null;
  inactive_effective_date?: string | null;
  inactive_notes?: string | null;
  status_badge?: {
    state: "active" | "scheduled_inactive" | "inactive";
    label: string;
    color: string;
    is_active: boolean;
    reason?: string | null;
    effective_date?: string | null;
  };
}

export interface EmployeeSelectOption {
  id: string | number;
  nip: string;
  nama_lengkap?: string;
  name?: string;
  jabatan?: string | null;
}
