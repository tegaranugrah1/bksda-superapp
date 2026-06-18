<?php

namespace App\Modules\DeReporting\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreEksternalRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // Form ini terbuka untuk Publik (Celah Eksternal)
    }

    public function rules(): array
    {
        return [
            // Cekik panjang karakter agar memori Server tidak meledak diserang Bot
            'nama_pelapor' => ['required', 'string', 'max:150'],
            'instansi' => ['nullable', 'string', 'max:150'],
            'email' => ['nullable', 'email', 'max:100'],
            'no_hp' => ['nullable', 'string', 'max:20'],
            'judul_laporan' => ['required', 'string', 'max:255'],
            'deskripsi' => ['nullable', 'string'],

            // Masyarakat boleh mengirimkan bukti Foto (jpg, png, jpeg)
            'file' => ['required', 'file', 'max:10240', 'mimes:pdf,doc,docx,xls,xlsx,zip,rar,jpg,png,jpeg', 'extensions:pdf,doc,docx,xls,xlsx,zip,rar,jpg,png,jpeg'],
        ];
    }

    public function messages(): array
    {
        return [
            'file.max' => 'Berkas terlalu berat. Mohon pastikan file Anda di bawah 10 MB.',
            'email.email' => 'Format surat elektronik (Email) tidak valid.',
            'nama_pelapor.max' => 'Nama terlampau panjang, maksimal 150 karakter.',
        ];
    }
}
