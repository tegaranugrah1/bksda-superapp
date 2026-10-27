export interface Employee {
  id: string;
  nip: string;
  nama_lengkap: string;
  name?: string;
  jabatan?: string | null;
  position?: string | null;
  pangkat_golongan?: string | null;
  satuan_kerja?: string | null;
  is_active: boolean;
  is_pppk?: boolean;
  is_mmp?: boolean;
  jenis_pegawai?: "PNS" | "PPPK" | "MMP";
  foto_url?: string | null;
  resor?: string | null;
  deleted_at?: string | null;
}

export interface EmployeeSelectOption {
  id: string | number;
  nip: string;
  nama_lengkap?: string;
  name?: string;
  jabatan?: string | null;
}
