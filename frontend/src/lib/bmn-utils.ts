import { AssetState } from "./constants/bmn";

export const formatRupiah = (angka: number | string | null | undefined): string => {
    if (angka === null || angka === undefined) return "Rp 0";
    const parsedNumber = typeof angka === "string" ? parseFloat(angka) : angka;
    if (isNaN(parsedNumber)) return "Rp 0";
    return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        minimumFractionDigits: 0,
    }).format(parsedNumber);
};

export const getAssetConditionStyle = (kondisi: AssetState | string): string => {
    switch (kondisi) {
        case "Baik":
            return "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20";
        case "Rusak Ringan":
            return "bg-amber-500/10 text-amber-400 border border-amber-500/20";
        case "Rusak Berat":
            return "bg-red-500/10 text-red-400 border border-red-500/20 animate-pulse";
        default:
            return "bg-zinc-800 text-zinc-400 border border-zinc-700";
    }
};
