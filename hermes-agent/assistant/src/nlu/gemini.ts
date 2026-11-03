import axios from 'axios';

export interface ParsedIntent {
  intent: 'CEK_CUTI' | 'AJUKAN_CUTI' | 'STATUS_ST' | 'BUAT_ST_DRAFT' | 'KONFIRMASI_YA' | 'KONFIRMASI_BATAL' | 'VERIFIKASI_NIP' | 'INFO_UMUM' | 'UNKNOWN';
  confidence: number;
  data: {
    nip?: string;
    jenis_cuti?: string;
    tanggal_mulai?: string;
    tanggal_selesai?: string;
    jumlah_hari?: number;
    alasan_cuti?: string;
    alamat_cuti?: string;
    maksud_tujuan?: string;
    tempat_tujuan?: string;
    sumber_dana?: string;
    personil_nips?: string[];
    raw_query?: string;
  };
  assistant_reply?: string;
}

export class GeminiNluService {
  private apiKey: string;
  private model: string;

  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY || '';
    this.model = 'gemini-1.5-pro'; // atau gemini-2.0-flash / gemini-1.5-flash
  }

  /**
   * Parse teks percakapan bebas menjadi Intent & Payload Terstruktur via Gemini AI Pro.
   */
  async parseUserMessage(userMessage: string, senderName: string = 'Rekan Pegawai'): Promise<ParsedIntent> {
    const trimmed = userMessage.trim();

    // Fast-path: Konfirmasi sederhana "YA" / "BATAL" tanpa perlu panggil LLM
    const upper = trimmed.toUpperCase();
    if (['YA', 'YES', 'SETUJU', 'OKE', 'OK', 'LANJUT', 'BENAR', 'SIAP'].includes(upper)) {
      return { intent: 'KONFIRMASI_YA', confidence: 1.0, data: {} };
    }
    if (['BATAL', 'CANCEL', 'TIDAK', 'GA JADI', 'GAK JADI', 'TIDAK JADI'].includes(upper)) {
      return { intent: 'KONFIRMASI_BATAL', confidence: 1.0, data: {} };
    }

    // Fast-path: NIP 18 digit
    const nipMatch = trimmed.match(/\b(19\d{16}|20\d{16})\b/);
    if (nipMatch && trimmed.length <= 25) {
      return { intent: 'VERIFIKASI_NIP', confidence: 0.99, data: { nip: nipMatch[1] } };
    }

    // Jika tidak ada Gemini API Key, gunakan regex fallback
    if (!this.apiKey) {
      return this.ruleBasedFallback(trimmed);
    }

    const todayStr = new Date().toISOString().split('T')[0];

    const systemPrompt = `Anda adalah Hermes, Asisten Operasional Cerdas untuk Pegawai Balai Konservasi Sumber Daya Alam (BKSDA) Kalimantan Timur.
Tanggal hari ini adalah ${todayStr}. Nama pengirim: ${senderName}.
Tugas Anda adalah memahami maksud pesan pegawai dan menghasilkan respon JSON murni sesuai schema berikut:
{
  "intent": "CEK_CUTI" | "AJUKAN_CUTI" | "STATUS_ST" | "BUAT_ST_DRAFT" | "KONFIRMASI_YA" | "KONFIRMASI_BATAL" | "VERIFIKASI_NIP" | "INFO_UMUM" | "UNKNOWN",
  "confidence": float antara 0.0 sampai 1.0,
  "data": {
    "nip": "18 digit NIP jika disebutkan",
    "jenis_cuti": "Cuti Tahunan" | "Cuti Sakit" | "Cuti Alasan Penting" | "Cuti Melahirkan" | "Cuti Besar",
    "tanggal_mulai": "YYYY-MM-DD",
    "tanggal_selesai": "YYYY-MM-DD",
    "alasan_cuti": "ringkasan alasan",
    "alamat_cuti": "lokasi menjalankan cuti jika ada",
    "maksud_tujuan": "maksud penugasan jika membuat draf ST",
    "tempat_tujuan": "lokasi penugasan jika membuat draf ST",
    "sumber_dana": "DIPA BKSDA Kalimantan Timur",
    "personil_nips": ["list nip jika ada"]
  },
  "assistant_reply": "kalimat respon percakapan ramah khas BKSDA Kaltim jika intent INFO_UMUM atau UNKNOWN"
}

Kaidah penting:
- Jangan tambahkan markdown code fences (hanya raw JSON).
- Format tanggal wajib YYYY-MM-DD. Jika pegawai berkata "besok", hitung dari tanggal hari ini.
- Jika intent adalah pengajuan cuti, pastikan tanggal_mulai dan tanggal_selesai terisi logis.`;

    // Panggil Gemini API dengan retry exponential backoff
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;
        const payload = {
          contents: [
            {
              role: 'user',
              parts: [
                { text: systemPrompt },
                { text: `Pesan Pegawai: "${trimmed}"` }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.1,
            responseMimeType: 'application/json',
          }
        };

        const res = await axios.post(url, payload, { timeout: 10000 });
        const candidate = res.data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (candidate) {
          const parsed = JSON.parse(candidate);
          return {
            intent: parsed.intent || 'UNKNOWN',
            confidence: parsed.confidence || 0.8,
            data: parsed.data || {},
            assistant_reply: parsed.assistant_reply,
          };
        }
      } catch (err: any) {
        const status = err.response?.status;
        console.warn(`[GeminiNluService] Attempt ${attempt} failed with status: ${status || err.message}`);
        if (attempt < 2 && (status === 429 || status === 503 || !status)) {
          await new Promise((r) => setTimeout(r, 1500 * attempt));
          continue;
        }
      }
    }

    // Circuit Breaker: fallback ke rule-based jika Gemini API error/rate-limited
    return this.ruleBasedFallback(trimmed);
  }

  private ruleBasedFallback(text: string): ParsedIntent {
    const lower = text.toLowerCase();

    if (lower.includes('cuti') && (lower.includes('sisa') || lower.includes('saldo') || lower.includes('cek'))) {
      return { intent: 'CEK_CUTI', confidence: 0.85, data: {} };
    }

    if (lower.includes('ajukan') || lower.includes('mau cuti') || lower.includes('mohon cuti') || lower.includes('minta cuti')) {
      return {
        intent: 'AJUKAN_CUTI',
        confidence: 0.7,
        data: {
          alasan_cuti: text,
        },
      };
    }

    if (lower.includes('surat tugas') || lower.includes(' st ') || lower.startsWith('st ') || lower.includes('penugasan')) {
      return { intent: 'STATUS_ST', confidence: 0.8, data: {} };
    }

    return {
      intent: 'INFO_UMUM',
      confidence: 0.5,
      data: { raw_query: text },
      assistant_reply: 'Halo! Saya Hermes, asisten operasional BKSDA Kaltim. Anda dapat mengecek saldo cuti (ketik "cek cuti"), mengajukan cuti, atau mengecek Surat Tugas aktif Anda.',
    };
  }
}
