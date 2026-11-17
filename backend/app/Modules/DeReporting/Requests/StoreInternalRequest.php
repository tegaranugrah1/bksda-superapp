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

    protected function prepareForValidation(): void
    {
        if (is_string($this->recipients)) {
            $decoded = json_decode($this->recipients, true);
            if (json_last_error() === JSON_ERROR_NONE && is_array($decoded)) {
                $this->merge(['recipients' => $decoded]);
            }
        }
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

            // Kolom Opsional & Sasaran Laporan
            'target_scope' => ['nullable', 'string', 'in:all,restricted'],
            'recipients' => ['required_if:target_scope,restricted', 'nullable', 'array'],
            'recipients.*.type' => ['required_with:recipients', 'string', 'in:user,urusan'],
            'recipients.*.user_id' => ['nullable', 'integer', 'exists:users,id'],
            'recipients.*.urusan_name' => ['nullable', 'string', 'max:150'],

            'koordinator_id' => ['nullable', 'uuid', 'exists:dr_koordinator,id'],
            'anggaran_id' => ['nullable', 'uuid', 'exists:dr_anggaran,id'],
            'keterangan' => ['nullable', 'string'],

            // Proteksi Inti Berkas (Project Rule 4.1 & 4.2)
            // Maksimal 25600 KB = 25 MB
            'file' => ['required', 'file', 'max:25600', 'mimes:pdf,doc,docx,xls,xlsx,zip,rar', 'extensions:pdf,doc,docx,xls,xlsx,zip,rar'],
        ];
    }

    /**
     * Pesan Peringatan Ramah Manusia
     */
    public function messages(): array
    {
        return [
            'file.max' => 'Kapasitas brankas tidak memadai. Ukuran berkas dilarang melebihi 25 Megabytes.',
            'file.mimes' => 'Format laporan terlarang! Hanya menerima wujud: PDF, DOCX, XLSX, ZIP, atau RAR.',
            'recipients.required_if' => 'Untuk laporan dengan sasaran terbatas, minimal harus memilih 1 sasaran Urusan atau Pegawai penerima.',
            '*.exists' => 'Identitas referensi Master Data tersebut telah dipalsukan atau musnah dari sistem.',
        ];
    }
}
