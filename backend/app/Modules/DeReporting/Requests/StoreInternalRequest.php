<?php

namespace App\Modules\DeReporting\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreInternalRequest extends FormRequest
{
    /**
     * Memastikan hanya yang berwenang yang bisa menembus perisai ini.
     * Kita serahkan ke true karena Autentikasi diurus Middleware Route.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Tembok Baja Aturan Input
     */
    public function rules(): array
    {
        return [
            'judul_laporan' => ['required', 'string', 'max:255'],
            // Validasi Integritas Relasional: Pastikan UUID tersebut ada di Database!
            'tahun_id' => ['required', 'uuid', 'exists:dr_tahun,id'],
            'bidang_id' => ['required', 'uuid', 'exists:dr_bidang,id'],
            'jenis_id' => ['required', 'uuid', 'exists:dr_jenis,id'],
            'kategori_id' => ['required', 'uuid', 'exists:dr_kategori,id'],
            'jenis_data_id' => ['required', 'uuid', 'exists:dr_jenis_data,id'],

            // Kolom Opsional
            'koordinator_id' => ['nullable', 'uuid', 'exists:dr_koordinator,id'],
            'anggaran_id' => ['nullable', 'uuid', 'exists:dr_anggaran,id'],
            'keterangan' => ['nullable', 'string'],

            // Proteksi Inti Berkas (Project Rule 4.1 & 4.2)
            // Maksimal 10240 KB = 10 MB
            'file' => ['required', 'file', 'max:10240', 'mimes:pdf,doc,docx,xls,xlsx,zip,rar'],
        ];
    }

    /**
     * Pesan Peringatan Ramah Manusia
     */
    public function messages(): array
    {
        return [
            'file.max' => 'Kapasitas brankas tidak memadai. Ukuran berkas dilarang melebihi 10 Megabytes.',
            'file.mimes' => 'Format laporan terlarang! Hanya menerima wujud: PDF, DOCX, XLSX, ZIP, atau RAR.',
            '*.exists' => 'Identitas referensi Master Data tersebut telah dipalsukan atau musnah dari sistem.',
        ];
    }
}
