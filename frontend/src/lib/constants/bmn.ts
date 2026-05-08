/**
 * PUSAT KONSTANTA MODUL BMN BKSDA
 */
export const BMN_CONSTANTS = {
    CONDITIONS: ["Baik", "Rusak Ringan", "Rusak Berat"] as const,
    LOCATIONS: [
        "Gudang Utama (Kanwil)",
        "Resort Wilayah 1",
        "Resort Wilayah 2",
        "Pos Jaga Perbatasan",
        "Bengkel Operasional",
    ] as const,
};

export type AssetState = (typeof BMN_CONSTANTS.CONDITIONS)[number];
