<?php

namespace App\Modules\Bmn\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateAssetRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $assetId = $this->route('asset');

        return [
            'kode_barang' => ['required', 'string', 'max:50'],
            'nup' => [
                'required', 'string', 'max:20',
                Rule::unique('bmn_assets')->where(function ($query) {
                    return $query->where('kode_barang', $this->kode_barang);
                })->ignore($assetId),
            ],
            'nama_barang' => ['required', 'string', 'max:255'],
            'merk_tipe' => ['nullable', 'string', 'max:255'],
            'tahun_perolehan' => ['nullable', 'integer', 'digits:4'],
            'kondisi' => ['required', 'string', Rule::in(['Baik', 'Rusak Ringan', 'Rusak Berat'])],
            'nilai_perolehan' => ['required', 'numeric', 'min:0'],
            'nilai_buku' => ['required', 'numeric', 'min:0'],
            'lokasi_spesifik' => ['nullable', 'string', 'max:500'],
            'foto_url' => ['nullable', 'string', 'max:1000'],
            'keterangan' => ['nullable', 'string'],
            'keterangan_audit' => ['nullable', 'string', 'max:255'],
        ];
    }
}
