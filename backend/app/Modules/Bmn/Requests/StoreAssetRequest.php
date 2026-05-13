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
                'required', 'string', 'max:50',
                Rule::unique('bmn_assets')->where(function ($query) {
                    return $query->where('kode_barang', $this->kode_barang);
                }),
            ],
            'nama_barang' => ['required', 'string', 'max:255'],
            'kondisi' => ['required', 'string', Rule::in(['Baik', 'Rusak Ringan', 'Rusak Berat'])],
            'nilai_perolehan' => ['nullable', 'numeric', 'min:0'],
            'nilai_buku' => ['nullable', 'numeric', 'min:0'],
            // All other fields are optional
            'jenis_bmn' => ['nullable', 'string'],
            'kode_satker' => ['nullable', 'string'],
            'nama_satker' => ['nullable', 'string'],
            'nup_lama' => ['nullable', 'string'],
            'status_bmn' => ['nullable', 'string'],
            'merk' => ['nullable', 'string'],
            'tipe' => ['nullable', 'string'],
            'merk_tipe' => ['nullable', 'string'],
            'umur_aset' => ['nullable', 'integer'],
            'intra_extra' => ['nullable', 'string'],
            'henti_guna' => ['nullable', 'string'],
            'status_sbsn' => ['nullable', 'string'],
            'status_bmn_idle' => ['nullable', 'string'],
            'status_kemitraan' => ['nullable', 'string'],
            'bpybds' => ['nullable', 'string'],
            'usulan_barang_hilang' => ['nullable', 'string'],
            'usulan_barang_rb' => ['nullable', 'string'],
            'usul_hapus' => ['nullable', 'string'],
            'hibah_dktp' => ['nullable', 'string'],
            'konsensi_jasa' => ['nullable', 'string'],
            'properti_investasi' => ['nullable', 'string'],
            'jenis_dokumen' => ['nullable', 'string'],
            'no_dokumen' => ['nullable', 'string'],
            'no_bpkp' => ['nullable', 'string'],
            'no_polisi' => ['nullable', 'string'],
            'status_sertifikasi' => ['nullable', 'string'],
            'jenis_sertipikat' => ['nullable', 'string'],
            'no_sertifikat' => ['nullable', 'string'],
            'nama' => ['nullable', 'string'],
            'tanggal_buku_pertama' => ['nullable', 'date'],
            'tanggal_perolehan' => ['nullable', 'date'],
            'tanggal_pengapusan' => ['nullable', 'date'],
            'nilai_perolehan_pertama' => ['nullable', 'numeric'],
            'nilai_mutasi' => ['nullable', 'numeric'],
            'nilai_penyusutan' => ['nullable', 'numeric'],
            'luas_tanah_seluruhnya' => ['nullable', 'numeric'],
            'luas_tanah_bangunan' => ['nullable', 'numeric'],
            'luas_tanah_sarana' => ['nullable', 'numeric'],
            'luas_lahan_kosong' => ['nullable', 'numeric'],
            'luas_bangunan' => ['nullable', 'numeric'],
            'luas_tapak_bangunan' => ['nullable', 'numeric'],
            'luas_pemanfaatan' => ['nullable', 'numeric'],
            'jumlah_lantai' => ['nullable', 'integer'],
            'jumlah_foto' => ['nullable', 'integer'],
            'status_penggunaan' => ['nullable', 'string'],
            'no_psp' => ['nullable', 'string'],
            'tanggal_psp' => ['nullable', 'date'],
            'alamat' => ['nullable', 'string'],
            'rt_rw' => ['nullable', 'string'],
            'kelurahan_desa' => ['nullable', 'string'],
            'kecamatan' => ['nullable', 'string'],
            'kab_kota' => ['nullable', 'string'],
            'kode_kab_kota' => ['nullable', 'string'],
            'provinsi' => ['nullable', 'string'],
            'kode_provinsi' => ['nullable', 'string'],
            'kode_pos' => ['nullable', 'string'],
            'sbsk' => ['nullable', 'string'],
            'optimalisasi' => ['nullable', 'string'],
            'penghuni' => ['nullable', 'string'],
            'pengguna' => ['nullable', 'string'],
            'kode_kpknl' => ['nullable', 'string'],
            'uraian_kpknl' => ['nullable', 'string'],
            'uraian_kanwil_djkn' => ['nullable', 'string'],
            'nama_kl' => ['nullable', 'string'],
            'nama_e1' => ['nullable', 'string'],
            'nama_korwil' => ['nullable', 'string'],
            'kode_register' => ['nullable', 'string'],
            'lokasi_ruang' => ['nullable', 'string'],
            'lokasi_spesifik' => ['nullable', 'string'],
            'jenis_identitas' => ['nullable', 'string'],
            'no_identitas' => ['nullable', 'string'],
            'no_stnk' => ['nullable', 'string'],
            'nama_pengguna' => ['nullable', 'string'],
            'status_pmk' => ['nullable', 'string'],
            'status_foto_geotag' => ['nullable', 'string'],
            'foto_geotag_url' => ['nullable', 'string'],
            'foto_url' => ['nullable', 'string'],
            'keterangan' => ['nullable', 'string'],
            'tahun_perolehan' => ['nullable', 'integer'],
        ];
    }

    public function messages(): array
    {
        return [
            'nup.unique' => 'NUP ini sudah terpakai pada Kode Barang yang sama.',
            'kondisi.in' => 'Kondisi harus: Baik, Rusak Ringan, atau Rusak Berat.',
        ];
    }
}
