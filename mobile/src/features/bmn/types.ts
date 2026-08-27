export interface AssetListItem {
  id: string | number;
  nama_barang: string;
  jenis_bmn?: string;
  kode_barang?: string;
  nup?: string | number;
  merk_tipe?: string;
  kondisi?: string;
  lokasi?: string;
  lokasi_ruang?: string;
  pengguna?: string | null;
  nama_pengguna?: string | null;
  no_polisi?: string;
  status_bmn?: string | null;
  is_verified?: boolean;
}

export interface VehicleDocumentPayload {
  path?: string | null;
  mime?: string | null;
  original_name?: string | null;
  preview_path?: string | null;
  url?: string | null;
  download_url?: string | null;
  preview_url?: string | null;
  preview_urls?: string[];
}

export interface AssetDetail extends AssetListItem {
  nama?: string;
  nup_lama?: string | number | null;
  merk?: string;
  tipe?: string;
  no_rangka?: string;
  no_mesin?: string;
  tanggal_pembelian?: string;
  nilai_perolehan?: number;
  nilai_perolehan_pertama?: number | string | null;
  nilai_mutasi?: number | string | null;
  nilai_penyusutan?: number | string | null;
  nilai_buku?: number | string | null;
  tahun_perolehan?: number | string | null;
  tanggal_perolehan?: string | null;
  tanggal_buku_pertama?: string | null;
  tanggal_ganti_plat?: string | null;
  status_bmn?: string | null;
  intra_extra?: string | null;
  jenis_bmn?: string;
  lokasi_ruang?: string;
  nama_pengguna?: string | null;
  satuan_kerja?: string | null;
  verified_at?: string | null;
  verified_by_name?: string | null;
  penanggung_jawab?: {
    id: number;
    nama_lengkap: string;
    nip?: string;
  } | null;
  bpkb_1?: string | null;
  bpkb_2?: string | null;
  bpkb_3?: string | null;
  bpkb_4?: string | null;
  stnk_1?: string | null;
  stnk_2?: string | null;
  no_stnk?: string | null;
  no_bpkb?: string | null;
  no_bpkp?: string | null;
  tanggal_pajak_stnk?: string | null;
  allowed_actions?: {
    can_edit: boolean;
    can_upload_photo: boolean;
    can_verify: boolean;
    can_loan: boolean;
    can_return: boolean;
  };
  foto_depan_url?: string | null;
  foto_belakang_url?: string | null;
  foto_kiri_url?: string | null;
  foto_kanan_url?: string | null;
  foto_lokasi_url?: string | null;
  foto_geotag_url?: string | null;
  foto_geotag_path?: string | null;
  foto_geotag_latitude?: number | null;
  foto_geotag_longitude?: number | null;
  foto_geotag_location_note?: string | null;
  status_foto_geotag?: string | null;
  foto_bpkb_1_url?: string | null;
  foto_bpkb_2_url?: string | null;
  foto_bpkb_3_url?: string | null;
  foto_bpkb_4_url?: string | null;
  foto_stnk_1_url?: string | null;
  foto_stnk_2_url?: string | null;
  bpkb_document?: VehicleDocumentPayload | null;
  stnk_document?: VehicleDocumentPayload | null;
  active_loan?: {
    id: number | string;
    borrower_name: string;
    borrower_nip?: string | null;
    loan_date?: string | null;
    due_date?: string | null;
    purpose?: string | null;
    status: string;
  } | null;
}

export interface AssetPhotoSlot {
  type: string;
  label: string;
  url: string | null;
  is_verified?: boolean;
}

export interface BmnQueryFilters {
  page?: number;
  per_page?: number;
  search?: string;
  kondisi?: string;
  jenis_bmn?: string;
  lokasi_ruang?: string;
  employee_id?: number | string;
}
