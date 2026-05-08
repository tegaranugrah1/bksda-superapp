// ==========================================
// BKSDA SUPERAPP - INVENTORY MODULE TYPES
// ==========================================

export interface ICategory {
    id: string; // UUID
    nama_kategori: string;
    created_at?: string;
    updated_at?: string;
}

export interface IOffice {
    id: string; // UUID
    nama_kantor: string;
    lokasi?: string;
    penanggung_jawab_id?: string;

    // Relasi dari Modul Kepegawaian (dimuat oleh backend via with())
    penanggung_jawab?: {
        id: string;
        nama_lengkap: string;
        nip: string;
    };

    created_at?: string;
    updated_at?: string;
}

export interface IItem {
    id: string; // UUID
    category_id: string;
    kode_barang: string;
    nama_barang: string;
    satuan: string;
    min_stock: number;

    // Relasi Database
    category?: ICategory;

    // Variabel kalkulasi yang kadang dilempar dari DashboardController
    total_fisik?: number;

    created_at?: string;
    updated_at?: string;
}

export interface IInventoryStock {
    id: string; // UUID
    office_id: string;
    item_id: string;
    quantity: number;

    // Relasi Database
    office?: IOffice;
    item?: IItem;

    created_at?: string;
    updated_at?: string;
}

export interface IStockTransaction {
    id: string; // UUID
    office_id: string;
    item_id: string;
    type: "in" | "out";
    quantity: number;
    remaining_stock: number;
    keterangan?: string;

    user_id: string; // ID Admin/Sistem
    employee_id?: string; // ID Penerima Barang (Lintas Modul Kepegawaian)

    // Relasi Database yang dimuat pada halaman History (Issue 058)
    office?: IOffice;
    item?: IItem;
    user?: {
        id: string;
        name: string;
        email: string;
    };
    employee?: {
        id: string;
        nama_lengkap: string;
        nip: string;
    };

    created_at: string;
    updated_at?: string;
}

// Tipe Data Agregat untuk Dashboard (Issue 054)
export interface IInventoryDashboardStats {
    total_items: number;
    mutasi_bulan_ini: number;
    krisis_stok: IItem[];
}
