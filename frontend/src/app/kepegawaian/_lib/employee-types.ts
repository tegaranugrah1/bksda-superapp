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
  foto_url?: string | null;
  resor?: string | null;
}

export interface EmployeeSelectOption {
  id: string | number;
  nip: string;
  nama_lengkap?: string;
  name?: string;
  jabatan?: string | null;
}
