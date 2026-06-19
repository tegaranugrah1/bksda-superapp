export interface AssetListItem {
  id: string | number;
  nama_barang: string;
  kode_barang?: string;
  nup?: string | number;
  merk_tipe?: string;
  kondisi?: string;
  lokasi?: string;
  pengguna?: string;
  no_polisi?: string;
  is_verified?: boolean;
}

export interface AssetDetail extends AssetListItem {
  merk?: string;
  tipe?: string;
  no_rangka?: string;
  no_mesin?: string;
  tanggal_pembelian?: string;
  nilai_perolehan?: number;
  jenis_bmn?: string;
  lokasi_ruang?: string;
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
