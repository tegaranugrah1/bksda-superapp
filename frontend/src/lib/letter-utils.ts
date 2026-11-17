import React from "react";

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
    const trimmed = nip.trim();
    if (!trimmed || trimmed === '-' || trimmed.toUpperCase().startsWith('MMP-') || trimmed.toUpperCase() === 'MMP') {
        return '-';
    }
    const cleaned = nip.replace(/\s/g, '');
    if (cleaned.length !== 18) return cleaned;
    return `${cleaned.substring(0, 8)} ${cleaned.substring(8, 14)} ${cleaned.substring(14, 15)} ${cleaned.substring(15)}`;
}

export type NipIdentifiable =
    | {
          nip?: string | null;
          pangkat_golongan?: string | null;
          pangkatGol?: string | null;
          jabatan?: string | null;
          position?: string | null;
          is_pppk?: boolean | null;
          nip_label?: string | null;
          role?: string | null;
      }
    | string
    | null
    | undefined;

/**
 * Cek apakah seorang pegawai berstatus PPPK (P3K).
 * Sesuai aturan BKN, NIP PPPK memiliki kode '21' pada digit ke 13-14 (0-indexed 12-14),
 * atau pangkat/golongan/jabatan memuat "pppk" / "p3k".
 */
export function isPppk(emp?: NipIdentifiable): boolean {
    if (!emp) return false;
    if (typeof emp === 'string') {
        const clean = emp.replace(/\s+/g, '');
        return clean.length >= 14 && clean.substring(12, 14) === '21';
    }
    if (typeof emp.is_pppk === 'boolean') {
        return emp.is_pppk;
    }
    if (typeof emp.nip_label === 'string' && emp.nip_label.toUpperCase().includes('PPPK')) {
        return true;
    }
    const nip = (emp.nip || '').replace(/\s+/g, '');
    if (nip.length >= 14 && nip.substring(12, 14) === '21') {
        return true;
    }
    const gol = (emp.pangkat_golongan || emp.pangkatGol || '').toLowerCase();
    const jab = (emp.jabatan || emp.position || '').toLowerCase();
    return gol.includes('pppk') || jab.includes('pppk') || gol.includes('p3k');
}

/**
 * Mendapatkan label NIP yang sesuai: "NIPPPK" untuk PPPK, dan "NIP" untuk PNS/umum.
 * withDot = true akan menghasilkan "NIPPPK." atau "NIP."
 */
export function formatNipLabel(emp?: NipIdentifiable, withDot = false): string {
    const label = isPppk(emp) ? 'NIPPPK' : 'NIP';
    return withDot ? `${label}.` : label;
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

export type InlineTextFormat = "bold" | "italic";

const FORMATTED_TEXT_TOKEN_RE =
  /(\*\*\*(?!\s)[^\r\n]*?(?<!\s)\*\*\*|\*\*(?!\s)(?:[^\r\n*]|\*(?!\*))*?(?<!\s)\*\*|\*(?!\s)[^*\r\n]+?(?<!\s)\*)/g;

/**
 * Render teks dengan konversi markdown ringan (***tebal+miring***, **tebal**, *miring*)
 * menjadi elemen React (<strong /> / <em />) yang aman dari XSS (hanya text node).
 */
export function renderFormattedText(text?: string | null): React.ReactNode {
  if (!text) return null;
  const parts = String(text).split(FORMATTED_TEXT_TOKEN_RE);
  if (parts.length === 1) return text;
  return parts.map((part, i) => {
    if (part.startsWith("***") && part.endsWith("***") && part.length > 6) {
      return React.createElement(
        "strong",
        {
          key: i,
          className: "font-bold italic",
          style: { fontWeight: "bold", fontStyle: "italic" },
        },
        part.slice(3, -3)
      );
    }
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
      return React.createElement(
        "strong",
        { key: i, className: "font-bold", style: { fontWeight: "bold" } },
        renderFormattedText(part.slice(2, -2))
      );
    }
    if (part.startsWith("*") && part.endsWith("*") && part.length > 2) {
      return React.createElement(
        "em",
        { key: i, className: "italic", style: { fontStyle: "italic" } },
        part.slice(1, -1)
      );
    }
    return part;
  });
}

/**
 * Render teks dengan konversi markdown *teks miring* ke elemen React italic (<em ...>).
 * Aman dari XSS karena teks murni dipecah dan dimasukkan ke text node React.
 */
export function renderFormattedItalic(text?: string | null): React.ReactNode {
  if (!text) return null;
  const parts = String(text).split(/(\*(?!\s)[^*\r\n]+?(?<!\s)\*)/g);
  if (parts.length === 1) return text;
  return parts.map((part, i) => {
    if (part.startsWith("*") && part.endsWith("*") && part.length > 2) {
      return React.createElement(
        "em",
        { key: i, className: "italic", style: { fontStyle: "italic" } },
        part.slice(1, -1)
      );
    }
    return part;
  });
}

function isWrappedWithMarker(str: string, format: InlineTextFormat): boolean {
  if (format === "bold") {
    return str.startsWith("**") && str.endsWith("**") && str.length > 4;
  }
  if (str.startsWith("***") && str.endsWith("***") && str.length > 6) return true;
  return (
    str.startsWith("*") &&
    str.endsWith("*") &&
    str.length > 2 &&
    !str.startsWith("**") &&
    !str.endsWith("**")
  );
}

function hasOuterMarker(text: string, start: number, end: number, format: InlineTextFormat): boolean {
  const mLen = format === "bold" ? 2 : 1;
  if (start < mLen || text.length - end < mLen) return false;
  const before = text.slice(0, start);
  const after = text.slice(end);
  if (format === "bold") {
    return before.endsWith("**") && after.startsWith("**");
  }
  const hasTriple = before.endsWith("***") && after.startsWith("***");
  const hasSingleOnly =
    before.endsWith("*") &&
    after.startsWith("*") &&
    !before.endsWith("**") &&
    !after.startsWith("**");
  return hasTriple || hasSingleOnly;
}

/**
 * Toggle/sisipkan pembungkus markdown (**tebal** / *miring*) pada <input> atau <textarea>.
 */
export function toggleInlineFormat(
  field: HTMLTextAreaElement | HTMLInputElement,
  currentValue: string,
  format: InlineTextFormat,
  onUpdate: (newValue: string) => void
) {
  const start = field.selectionStart ?? currentValue.length;
  const end = field.selectionEnd ?? currentValue.length;
  const text = currentValue || "";
  const marker = format === "bold" ? "**" : "*";
  const mLen = marker.length;

  const restoreRange = (selStart: number, selEnd: number) => {
    setTimeout(() => {
      field.focus();
      field.setSelectionRange(selStart, selEnd);
    }, 0);
  };

  if (start !== end) {
    const selected = text.slice(start, end);
    if (isWrappedWithMarker(selected, format)) {
      const unwrapped = selected.slice(mLen, -mLen);
      onUpdate(text.slice(0, start) + unwrapped + text.slice(end));
      restoreRange(start, start + unwrapped.length);
    } else if (hasOuterMarker(text, start, end, format)) {
      const nextText = text.slice(0, start - mLen) + selected + text.slice(end + mLen);
      onUpdate(nextText);
      restoreRange(start - mLen, end - mLen);
    } else {
      const wsMatch = selected.match(/^(\s*)([\s\S]*?)(\s*)$/);
      const lead = wsMatch?.[1] ?? "";
      const core = wsMatch?.[2] ?? selected;
      const tail = wsMatch?.[3] ?? "";
      if (!core) {
        const inner = format === "bold" ? "teks tebal" : "teks miring";
        const placeholder = `${marker}${inner}${marker}`;
        onUpdate(text.slice(0, start) + placeholder + text.slice(end));
        restoreRange(start + mLen, start + placeholder.length - mLen);
      } else {
        const coreWrappedStart = start + lead.length;
        const wrapped = `${lead}${marker}${core}${marker}${tail}`;
        onUpdate(text.slice(0, start) + wrapped + text.slice(end));
        restoreRange(coreWrappedStart + mLen, coreWrappedStart + mLen + core.length);
      }
    }
  } else {
    const inner = format === "bold" ? "teks tebal" : "teks miring";
    const placeholder = `${marker}${inner}${marker}`;
    onUpdate(text.slice(0, start) + placeholder + text.slice(end));
    restoreRange(start + mLen, start + placeholder.length - mLen);
  }
}

/**
 * Pintasan Ctrl+B / Ctrl+I (Cmd+B / Cmd+I di macOS) untuk input dan textarea teks surat.
 */
export function handleInlineFormatShortcut(
  e: React.KeyboardEvent<HTMLTextAreaElement | HTMLInputElement>,
  currentValue: string,
  onUpdate: (newValue: string) => void
): boolean {
  if (!(e.ctrlKey || e.metaKey) || e.altKey) return false;
  const key = e.key.toLowerCase();
  if (key !== "b" && key !== "i") return false;
  e.preventDefault();
  toggleInlineFormat(e.currentTarget, currentValue, key === "b" ? "bold" : "italic", onUpdate);
  return true;
}

/**
 * Konversi isi elemen contentEditable kembali ke string markdown ringan (**tebal**, *miring*).
 */
export function serializeEditableToMarkdown(root: HTMLElement): string {
  const walk = (node: Node): string => {
    if (node.nodeType === 3) return node.nodeValue || "";
    if (node.nodeType !== 1) return "";
    const el = node as HTMLElement;
    const tag = el.tagName.toUpperCase();
    if (tag === "SCRIPT" || tag === "STYLE") return "";
    if (tag === "BR") return "\n";

    let inner = "";
    const children = Array.from(el.childNodes);
    children.forEach((child, idx) => {
      const childTag = child.nodeType === 1 ? (child as HTMLElement).tagName.toUpperCase() : "";
      if ((childTag === "DIV" || childTag === "P") && idx > 0 && !inner.endsWith("\n")) {
        inner += "\n";
      }
      inner += walk(child);
    });

    if (!inner) return "";
    const weight = el.style?.fontWeight?.toLowerCase();
    const style = el.style?.fontStyle?.toLowerCase();
    const isBold = tag === "STRONG" || tag === "B" || weight === "bold" || Number(weight) >= 600;
    const isItalic = tag === "EM" || tag === "I" || style === "italic";

    if (isBold && isItalic) return `***${inner}***`;
    if (isBold) return `**${inner}**`;
    if (isItalic) return `*${inner}*`;
    return inner;
  };

  return walk(root).replace(/\u00a0/g, " ");
}

/**
 * Toggle atau sisipkan pembungkus asteriks (*teks*) pada elemen HTMLTextAreaElement.
 * Memanggil callback onUpdate dengan teks baru dan mempertahankan/mengatur seleksi cursor.
 */
export function toggleItalicInTextarea(
  textarea: HTMLTextAreaElement,
  currentValue: string,
  onUpdate: (newValue: string) => void
) {
  toggleInlineFormat(textarea, currentValue, "italic", onUpdate);
}
