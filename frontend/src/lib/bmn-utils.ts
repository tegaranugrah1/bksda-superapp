import { AssetState } from "./constants/bmn";
import dayjs from "dayjs";

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

/**
 * Deteksi apakah sebuah aset adalah kendaraan bermotor.
 */
export const isVehicle = (asset: { no_polisi?: string; jenis_bmn?: string; nama_barang?: string } | null | undefined): boolean => {
    if (!asset) return false;
    if (asset.no_polisi && asset.no_polisi !== '-') return true;

    const text = [asset.jenis_bmn, asset.nama_barang]
        .filter(Boolean).join(' ').toLowerCase();

    const keywords = [
        'alat angkutan', 'kendaraan', 'motor', 'mobil', 'bus', 'truk',
        'station wagon', 'jeep', 'sedan', 'minibus', 'pickup',
        'ambulans', 'sepeda motor', 'roda 2', 'roda 4', 'roda 6'
    ];

    return keywords.some(k => text.includes(k));
};

/**
 * Cek status pajak kendaraan (STNK).
 */
export const getVehicleTaxStatus = (dateStr?: string | null) => {
    if (!dateStr) return { days: null, status: 'empty' as const, label: 'Belum Diisi' };

    const target = dayjs(dateStr).startOf('day');
    const today = dayjs().startOf('day');
    const days = target.diff(today, 'day');

    if (days < 0) return { days, status: 'expired' as const, label: 'Expired' };
    if (days < 30) return { days, status: 'warning' as const, label: 'Segera Perpanjang' };
    return { days, status: 'safe' as const, label: 'Aktif' };
};
