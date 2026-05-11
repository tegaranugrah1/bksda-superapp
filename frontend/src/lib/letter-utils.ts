/**
 * Format tanggal ke format surat Indonesia.
 * formatDateIndonesian("2024-03-15") → "15 Maret 2024"
 */
export function formatDateIndonesian(dateStr: string | null | undefined): string {
    if (!dateStr) return '...';
    try {
        const months = [
            'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
            'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
        ];
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return dateStr;
        return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
    } catch {
        return '...';
    }
}

/**
 * Angka ke terbilang (untuk durasi hari di Surat Tugas).
 * numberToWords(7) → "tujuh"
 */
export function numberToWords(n: number): string {
    const ones = [
        'nol', 'satu', 'dua', 'tiga', 'empat', 'lima', 'enam',
        'tujuh', 'delapan', 'sembilan', 'sepuluh', 'sebelas'
    ];
    
    if (n < 12) return ones[n];
    if (n < 20) return numberToWords(n - 10) + ' belas';
    if (n < 100) {
        const div = Math.floor(n / 10);
        const rem = n % 10;
        return (div === 1 ? 'sepuluh' : ones[div] + ' puluh') + (rem > 0 ? ' ' + ones[rem] : '');
    }
    
    return String(n); // Fallback for larger numbers if not needed
}

/**
 * Indeks ke huruf alfabet (untuk daftar bernomor di surat).
 * indexToLetter(0) → "a."
 */
export function indexToLetter(idx: number): string {
    return String.fromCharCode(97 + idx) + '.';
}

/**
 * Hitung selisih hari antara 2 tanggal (inklusif).
 * daysBetween("2024-03-01", "2024-03-07") → 7
 */
export function daysBetween(start: string, end: string): number {
    if (!start || !end) return 0;
    try {
        const s = new Date(start);
        const e = new Date(end);
        if (isNaN(s.getTime()) || isNaN(e.getTime())) return 0;
        const diff = Math.ceil((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        return diff > 0 ? diff : 0;
    } catch {
        return 0;
    }
}

/**
 * Format NIP pegawai sesuai standar pemerintah.
 * formatNIP("198504132010011001") → "19850413 201001 1 001"
 * NIP placeholder (MMP-xxx) akan ditampilkan sebagai "-"
 */
export function formatNIP(nip: string | null | undefined): string {
    if (!nip) return '...';
    if (nip.startsWith('MMP-')) return '-';
    const cleaned = nip.replace(/\s/g, '');
    if (cleaned.length !== 18) return cleaned;
    return `${cleaned.substring(0, 8)} ${cleaned.substring(8, 14)} ${cleaned.substring(14, 15)} ${cleaned.substring(15)}`;
}
