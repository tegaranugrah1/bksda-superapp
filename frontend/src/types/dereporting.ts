/**
 * ════════════════════════════════════════════
 * PUSAT TIPE DATA MODUL DEREPORTING — BKSDA SUPERAPP
 * ════════════════════════════════════════════
 * 
 * File ini adalah "Kantor Imigrasi" bagi seluruh data yang mengalir
 * dari Backend Laravel ke layar Frontend React.
 * 
 * Aturan:
 * 1. Setiap properti HARUS sesuai dengan nama kolom di Database (snake_case).
 * 2. Properti opsional ditandai dengan tanda tanya (?).
 * 3. Relasi (belongsTo) ditandai dengan tipe entitas terkait atau null.
 */

// ──────────────────────────────────────────────
// ENTITAS MASTER DATA (7 Tabel Referensi)
// ──────────────────────────────────────────────

/** Tahun Pelaporan Aktif */
export interface DrTahun {
    id: string;
    tahun: number;
    is_active: boolean;
    created_at: string;
}

/** Bidang Kerja BKSDA (Level Teratas Hierarki) */
export interface DrBidang {
    id: string;
    nama: string;
    created_at: string;
}

/** Koordinator / Penanggung Jawab Laporan */
export interface DrKoordinator {
    id: string;
    nama: string;
    created_at: string;
}

/** Sumber Anggaran Pembiayaan */
export interface DrAnggaran {
    id: string;
    nama: string;
    created_at: string;
}

/** Jenis Laporan (Level 2 — Anak dari Bidang) */
export interface DrJenis {
    id: string;
    bidang_id: string;
    nama: string;
    /** Relasi ke atas: Data Bidang induk */
    bidang?: DrBidang | null;
    created_at: string;
}

/** Kategori Laporan (Level 3 — Anak dari Jenis) */
export interface DrKategori {
    id: string;
    jenis_id: string;
    nama: string;
    /** Relasi ke atas */
    jenis?: DrJenis | null;
    created_at: string;
}

/** Jenis Data Spesifik (Level 4 — Anak dari Kategori) */
export interface DrJenisData {
    id: string;
    kategori_id: string;
    koordinator_id: string | null;
    nama: string;
    /** Relasi ke atas */
    kategori?: DrKategori | null;
    koordinator?: DrKoordinator | null;
    created_at: string;
}

// ──────────────────────────────────────────────
// ENTITAS TRANSAKSI LAPORAN
// ──────────────────────────────────────────────

/** Identitas Ringkas Pengunggah (Eager Loading parsial dari tabel users) */
export interface DrUploader {
    id: string;
    nama_lengkap: string;
    nip: string;
}

/** Laporan Internal (Diunggah oleh Pegawai BKSDA) */
export interface DrInternal {
    id: string;
    user_id: string;
    tahun_id: string;
    bidang_id: string;
    jenis_id: string;
    kategori_id: string;
    jenis_data_id: string;
    koordinator_id: string | null;
    anggaran_id: string | null;
    judul_laporan: string;
    file_path: string;
    keterangan: string | null;
    created_at: string;
    updated_at: string;
    deleted_at: string | null;

    /** Relasi Eager Loading (Dimuat oleh Controller Issue 081) */
    uploader?: DrUploader | null;
    tahun?: DrTahun | null;
    bidang?: DrBidang | null;
    jenis?: DrJenis | null;
    kategori?: DrKategori | null;
    jenis_data?: DrJenisData | null;
    koordinator?: DrKoordinator | null;
    anggaran?: DrAnggaran | null;
}

/** Status Tinjauan Laporan Eksternal */
export type DrEksternalStatus = "Menunggu Tinjauan" | "Diterima" | "Ditolak";

/** Laporan Eksternal (Diunggah oleh Masyarakat Tanpa Login) */
export interface DrEksternal {
    id: string;
    nama_pelapor: string;
    instansi: string | null;
    email: string | null;
    no_hp: string | null;
    judul_laporan: string;
    file_path: string;
    deskripsi: string | null;
    /** Hanya terlihat oleh Admin (Tidak boleh dikirim ke layar publik) */
    ip_address: string | null;
    status: DrEksternalStatus;
    created_at: string;
    updated_at: string;
    deleted_at: string | null;
}

// ──────────────────────────────────────────────
// UTILITAS RESPONS API
// ──────────────────────────────────────────────

/** Format Pagination Laravel Standard (Project Rule 5.3) */
export interface DrPaginatedResponse<T> {
    data: T[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    next_page_url: string | null;
    prev_page_url: string | null;
}
