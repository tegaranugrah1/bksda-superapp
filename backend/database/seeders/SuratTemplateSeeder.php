<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Modules\Surat\Models\SuratTemplate;

class SuratTemplateSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $templates = [
            [
                'key' => 'surat_izin_cuti',
                'nama' => 'Surat Izin Cuti Resmi (TTE Kepala Balai)',
                'kategori' => 'Izin & Kepegawaian',
                'deskripsi' => 'Format resmi surat penetapan izin cuti pegawai negeri sipil Balai KSDA Kalimantan Timur.',
                'nomor_prefix' => 'SI',
                'kode_klasifikasi' => 'PEG.11.01',
                'judul_dokumen' => 'SURAT IZIN CUTI',
                'default_payload' => [
                    'ketentuan_a' => 'Selama menjalankan Cuti {jenis_cuti} wajib menyerahkan pekerjaan pada atasan langsungnya atau pejabat lain yang ditunjuk.',
                    'ketentuan_b' => 'Setelah selesai menjalankan Cuti {jenis_cuti} wajib melaporkan diri kepada atasan langsungnya dan bekerja kembali sebagaimana biasa.',
                    'penutup' => 'Demikian Surat Izin Cuti {jenis_cuti} ini dibuat untuk dapat dipergunakan sebagaimana mestinya.',
                    'nama_penandatangan' => 'M. ARI WIBAWANTO, S.Hut., M.Sc.',
                    'nip_penandatangan' => '19740514 199903 1 001',
                    'jabatan_penandatangan' => 'Kepala Balai,',
                    'kota' => 'Samarinda',
                ],
                'is_system' => true,
                'is_active' => true,
            ],
            [
                'key' => 'surat_dinas',
                'nama' => 'Surat Dinas Standar',
                'kategori' => 'Naskah Dinas Arahan',
                'deskripsi' => 'Naskah dinas resmi untuk korespondensi eksternal antar instansi/satker.',
                'nomor_prefix' => 'S',
                'kode_klasifikasi' => 'KSA.01.05',
                'judul_dokumen' => 'SURAT DINAS',
                'default_payload' => [
                    'nama_penandatangan' => 'M. ARI WIBAWANTO, S.Hut., M.Sc.',
                    'nip_penandatangan' => '19740514 199903 1 001',
                    'jabatan_penandatangan' => 'Kepala Balai,',
                    'kota' => 'Samarinda',
                ],
                'is_system' => true,
                'is_active' => true,
            ],
            [
                'key' => 'nota_dinas',
                'nama' => 'Nota Dinas',
                'kategori' => 'Korespondensi Intern',
                'deskripsi' => 'Naskah dinas intern antar pejabat dalam lingkup Balai KSDA Kaltim.',
                'nomor_prefix' => 'ND',
                'kode_klasifikasi' => 'KSA.01.05',
                'judul_dokumen' => 'NOTA DINAS',
                'default_payload' => [
                    'nama_penandatangan' => 'M. ARI WIBAWANTO, S.Hut., M.Sc.',
                    'nip_penandatangan' => '19740514 199903 1 001',
                    'jabatan_penandatangan' => 'Kepala Balai,',
                    'kota' => 'Samarinda',
                ],
                'is_system' => true,
                'is_active' => true,
            ],
            [
                'key' => 'surat_izin',
                'nama' => 'Surat Izin Masuk Kawasan (SIMAKSI)',
                'kategori' => 'Izin & Dispensasi',
                'deskripsi' => 'Surat izin memasuki kawasan konservasi untuk penelitian, liputan, atau kunjungan.',
                'nomor_prefix' => 'SI',
                'kode_klasifikasi' => 'KSA.01.05',
                'judul_dokumen' => 'SURAT IZIN',
                'default_payload' => [
                    'nama_penandatangan' => 'M. ARI WIBAWANTO, S.Hut., M.Sc.',
                    'nip_penandatangan' => '19740514 199903 1 001',
                    'jabatan_penandatangan' => 'Kepala Balai,',
                    'kota' => 'Samarinda',
                ],
                'is_system' => true,
                'is_active' => true,
            ],
            [
                'key' => 'surat_pengantar',
                'nama' => 'Surat Pengantar',
                'kategori' => 'Naskah Dinas Khusus',
                'deskripsi' => 'Surat pengantar naskah/dokumen/berkas resmi ke instansi lain.',
                'nomor_prefix' => 'SP',
                'kode_klasifikasi' => 'KSA.01.05',
                'judul_dokumen' => 'SURAT PENGANTAR',
                'default_payload' => [
                    'nama_penandatangan' => 'M. ARI WIBAWANTO, S.Hut., M.Sc.',
                    'nip_penandatangan' => '19740514 199903 1 001',
                    'jabatan_penandatangan' => 'Kepala Balai,',
                    'kota' => 'Samarinda',
                ],
                'is_system' => true,
                'is_active' => true,
            ],
            [
                'key' => 'surat_pernyataan',
                'nama' => 'Surat Pernyataan Kedinasan',
                'kategori' => 'Naskah Dinas Khusus',
                'deskripsi' => 'Surat pernyataan kebenaran data kedinasan.',
                'nomor_prefix' => 'SM',
                'kode_klasifikasi' => 'KSA.01.05',
                'judul_dokumen' => 'SURAT PERNYATAAN',
                'default_payload' => [
                    'nama_penandatangan' => 'M. ARI WIBAWANTO, S.Hut., M.Sc.',
                    'nip_penandatangan' => '19740514 199903 1 001',
                    'jabatan_penandatangan' => 'Kepala Balai,',
                    'kota' => 'Samarinda',
                ],
                'is_system' => true,
                'is_active' => true,
            ],
        ];

        foreach ($templates as $tpl) {
            SuratTemplate::updateOrCreate(
                ['key' => $tpl['key']],
                $tpl
            );
        }
    }
}
