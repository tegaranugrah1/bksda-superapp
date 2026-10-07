/**
 * Format tanggal ke format surat Indonesia.
 * formatDateIndonesian("2024-03-15") → "15 Maret 2024"
 */
export function formatDateIndonesian(dateStr: string | null | undefined): string {
    if (!dateStr) return '...';
    try {
        const parts = String(dateStr).split("T")[0].trim().split("-").map(Number);
        const d = parts.length === 3 && !parts.some(isNaN) ? new Date(parts[0], parts[1] - 1, parts[2]) : new Date(dateStr);
        return isNaN(d.getTime()) ? String(dateStr) : d.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
    } catch {
        return '...';
    }
}

const INDO_MONTHS = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember"
];

function parseDateParts(dateStr: string) {
    const cleaned = String(dateStr).split("T")[0].trim();
    const parts = cleaned.split("-").map(Number);
    if (parts.length === 3 && !parts.some(isNaN)) {
        return { y: parts[0], m: parts[1] - 1, d: parts[2] };
    }
    const dt = new Date(dateStr);
    return isNaN(dt.getTime()) ? null : { y: dt.getFullYear(), m: dt.getMonth(), d: dt.getDate() };
}

/**
 * Format rentang tanggal tugas ringkas dalam bahasa Indonesia:
 * - 1 hari / sama: "29 September 2026"
 * - Bulan & tahun sama: "24 s/d 27 Agustus 2026"
 * - Beda bulan, tahun sama: "28 Agustus s/d 02 September 2026"
 * - Beda tahun: "28 Desember 2025 s/d 02 Januari 2026"
 */
export function formatDateRangeIndonesian(
    startDate?: string | null,
    endDate?: string | null
): string {
    if (!startDate && !endDate) return "-";
    if (startDate && !endDate) return formatDateIndonesian(startDate);
    if (!startDate && endDate) return formatDateIndonesian(endDate);

    const s = parseDateParts(startDate!);
    const e = parseDateParts(endDate!);

    if (!s || !e) {
        return `${formatDateIndonesian(startDate)} s/d ${formatDateIndonesian(endDate)}`;
    }

    if (s.y === e.y && s.m === e.m && s.d === e.d) {
        return `${s.d} ${INDO_MONTHS[s.m]} ${s.y}`;
    }

    if (s.y === e.y && s.m === e.m) {
        return `${s.d} s/d ${e.d} ${INDO_MONTHS[s.m]} ${s.y}`;
    }

    if (s.y === e.y) {
        return `${s.d} ${INDO_MONTHS[s.m]} s/d ${e.d} ${INDO_MONTHS[e.m]} ${s.y}`;
    }

    return `${s.d} ${INDO_MONTHS[s.m]} ${s.y} s/d ${e.d} ${INDO_MONTHS[e.m]} ${e.y}`;
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

export function extractFoluKawasan(namaKegiatan: string, tempatKegiatan?: string): string {
    const explicitPlace = tempatKegiatan?.trim().replace(/[;,.]$/, '');
    if (explicitPlace) return explicitPlace;

    const normalized = namaKegiatan.replace(/\s+/g, ' ').trim();
    const diMatch = normalized.match(/\bdi\s+(.+?)(?:[,;.]|$)/i);
    return diMatch?.[1]?.trim().replace(/[;,.]$/, '') || '';
}

export function buildFoluMenimbangText(namaKegiatan: string, tempatKegiatan?: string): string {
    const kawasan = extractFoluKawasan(namaKegiatan, tempatKegiatan);
    const lower = namaKegiatan.toLowerCase();
    const isSmartPatrol = lower.includes('smart patrol') || lower.includes('patroli');
    const locationText = kawasan ? ` di ${kawasan}` : '';
    const patrolText = isSmartPatrol ? ' melalui Patroli SMART' : '';

    return `bahwa dalam upaya menjaga kelestarian keanekaragaman hayati${locationText}, perlu dilakukan kegiatan pengamanan dan perlindungan${patrolText};`;
}

export function isGeneratedFoluMenimbangText(text: string | null | undefined): boolean {
    return Boolean(
        text?.startsWith('bahwa dalam upaya menjaga kelestarian keanekaragaman hayati') &&
        text.includes('perlu dilakukan kegiatan pengamanan dan perlindungan')
    );
}
