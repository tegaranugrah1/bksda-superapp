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
        return [
            'kode_barang' => ['sometimes', 'string', 'max:50'],
            'nup' => ['sometimes', 'string', 'max:50'],
            'nama_barang' => ['sometimes', 'string', 'max:255'],
            'jenis_bmn' => ['sometimes', 'nullable', 'string'],
            'status_bmn' => ['sometimes', 'nullable', 'string'],
            'merk' => ['sometimes', 'nullable', 'string'],
            'tipe' => ['sometimes', 'nullable', 'string'],
            'nama' => ['sometimes', 'nullable', 'string'],
            'merk_tipe' => ['sometimes', 'nullable', 'string'],
            'kondisi' => ['sometimes', 'string', Rule::in(['Baik', 'Rusak Ringan', 'Rusak Berat'])],
            'no_polisi' => ['sometimes', 'nullable', 'string'],
            'no_stnk' => ['sometimes', 'nullable', 'string'],
            'no_mesin' => ['sometimes', 'nullable', 'string'],
            'no_rangka' => ['sometimes', 'nullable', 'string'],
            'no_bpkp' => ['sometimes', 'nullable', 'string'],
            'no_dokumen' => ['sometimes', 'nullable', 'string'],
            'jenis_dokumen' => ['sometimes', 'nullable', 'string'],
            'no_sertifikat' => ['sometimes', 'nullable', 'string'],
            'status_sertifikasi' => ['sometimes', 'nullable', 'string'],
            'jenis_sertipikat' => ['sometimes', 'nullable', 'string'],
            'tanggal_pajak_stnk' => ['sometimes', 'nullable', 'date'],
            'tanggal_ganti_plat' => ['sometimes', 'nullable', 'date'],
            'nilai_perolehan' => ['sometimes', 'nullable', 'numeric', 'min:0'],
            'nilai_perolehan_pertama' => ['sometimes', 'nullable', 'numeric', 'min:0'],
            'nilai_mutasi' => ['sometimes', 'nullable', 'numeric'],
            'nilai_penyusutan' => ['sometimes', 'nullable', 'numeric'],
            'nilai_buku' => ['sometimes', 'nullable', 'numeric'],
            'tanggal_perolehan' => ['sometimes', 'nullable', 'date'],
            'tanggal_buku_pertama' => ['sometimes', 'nullable', 'date'],
            'status_sbsn' => ['sometimes', 'nullable', 'string'],
            'status_bmn_idle' => ['sometimes', 'nullable', 'string'],
            'status_kemitraan' => ['sometimes', 'nullable', 'string'],
            'bpybds' => ['sometimes', 'nullable', 'string'],
            'usulan_barang_hilang' => ['sometimes', 'nullable', 'string'],
            'usulan_barang_rb' => ['sometimes', 'nullable', 'string'],
            'usul_hapus' => ['sometimes', 'nullable', 'string'],
            'hibah_dktp' => ['sometimes', 'nullable', 'string'],
            'konsensi_jasa' => ['sometimes', 'nullable', 'string'],
            'properti_investasi' => ['sometimes', 'nullable', 'string'],
            'status_penggunaan' => ['sometimes', 'nullable', 'string'],
            'no_psp' => ['sometimes', 'nullable', 'string'],
            'tanggal_psp' => ['sometimes', 'nullable', 'date'],
            'status_pmk' => ['sometimes', 'nullable', 'string'],
            'sbsk' => ['sometimes', 'nullable', 'string'],
            'optimalisasi' => ['sometimes', 'nullable', 'string'],
            'alamat' => ['sometimes', 'nullable', 'string'],
            'rt_rw' => ['sometimes', 'nullable', 'string'],
            'kelurahan_desa' => ['sometimes', 'nullable', 'string'],
            'kecamatan' => ['sometimes', 'nullable', 'string'],
            'kab_kota' => ['sometimes', 'nullable', 'string'],
            'provinsi' => ['sometimes', 'nullable', 'string'],
            'kode_pos' => ['sometimes', 'nullable', 'string'],
            'lokasi_ruang' => ['sometimes', 'nullable', 'string'],
            'penghuni' => ['sometimes', 'nullable', 'string'],
            'pengguna' => ['sometimes', 'nullable', 'string'],
            'nama_pengguna' => ['sometimes', 'nullable', 'string'],
            'lokasi_spesifik' => ['sometimes', 'nullable', 'string'],
            'tahun_perolehan' => ['sometimes', 'nullable', 'integer'],
            'foto_geotag_url' => ['sometimes', 'nullable', 'string'],
            'keterangan' => ['sometimes', 'nullable', 'string'],
            'keterangan_audit' => ['sometimes', 'nullable', 'string', 'max:255'],
        ];
    }
}
