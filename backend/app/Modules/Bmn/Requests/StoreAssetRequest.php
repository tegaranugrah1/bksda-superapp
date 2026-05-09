<?php

namespace App\Modules\Bmn\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreAssetRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'kode_barang' => ['required', 'string', 'max:50'],
            'nup' => [
                'required', 'string', 'max:20',
                Rule::unique('bmn_assets')->where(function ($query) {
                    return $query->where('kode_barang', $this->kode_barang);
                }),
            ],
            'nama_barang' => ['required', 'string', 'max:255'],
            'merk_tipe' => ['nullable', 'string', 'max:255'],
            'tahun_perolehan' => ['nullable', 'integer', 'digits:4', 'min:1945', 'max:'.(date('Y') + 1)],
            'kondisi' => ['required', 'string', Rule::in(['Baik', 'Rusak Ringan', 'Rusak Berat'])],
            'nilai_perolehan' => ['required', 'numeric', 'min:0'],
            'nilai_buku' => ['required', 'numeric', 'min:0'],
            'lokasi_spesifik' => ['nullable', 'string', 'max:500'],
            'foto_url' => ['nullable', 'string', 'max:1000'],
            'keterangan' => ['nullable', 'string'],
        ];
    }

    public function messages(): array
    {
        return [
            'nup.unique' => 'NUP ini sudah terpakai pada Kode Barang yang sama.',
            'nilai_perolehan.numeric' => 'Nilai Perolehan wajib berwujud angka murni.',
            'kondisi.in' => 'Kondisi harus: Baik, Rusak Ringan, atau Rusak Berat.',
        ];
    }
}
