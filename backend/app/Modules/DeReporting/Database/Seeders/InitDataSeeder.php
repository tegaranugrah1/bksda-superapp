<?php

namespace App\Modules\DeReporting\Database\Seeders;

use App\Models\User;
use App\Modules\DeReporting\Models\Anggaran;
use App\Modules\DeReporting\Models\Bidang;
use App\Modules\DeReporting\Models\Jenis;
use App\Modules\DeReporting\Models\JenisData;
use App\Modules\DeReporting\Models\Kategori;
use App\Modules\DeReporting\Models\Koordinator;
use App\Modules\DeReporting\Models\Tahun;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class InitDataSeeder extends Seeder
{
    public function run(): void
    {
        $this->UserSeed();
        $this->TahunSeed();
        $this->AnggaranSeed();
        $this->KoordinatorSeed();
        $this->JenisDataSeed();
        $this->JenisSeed();
        $this->BidangSeed();
        $this->KategoriSeed();
    }

    public function UserSeed()
    {
        $nipAdmin = '198001012005011001';

        User::updateOrCreate(
            ['username' => $nipAdmin],
            [
                'name' => 'Administrator',
                'email' => 'admin@bksda.local',
                'password' => 'Bksda2026!@#',
                'role' => 'super_admin',
                'access_modules' => ['kepegawaian', 'bmn', 'inventory', 'dereporting'],
                'jabatan' => 'Super Administrator',
            ]
        );

        $tegarNip = '199907072025061006';
        User::updateOrCreate(
            ['username' => $tegarNip],
            [
                'name' => 'Tegar Anugrah, A.Md.Kom.',
                'email' => $tegarNip.'@gmail.com',
                'password' => Str::random(16),
                'role' => 'user',
                'access_modules' => ['bmn', 'inventory'],
                'jabatan' => 'Pranata Komputer Terampil',
            ]
        );

        $bowoNip = '198305282001121001';
        User::updateOrCreate(
            ['username' => $bowoNip],
            [
                'name' => 'Heryanto Sumanbowo, S.Hut.',
                'email' => $bowoNip.'@gmail.com',
                'password' => Str::random(16),
                'role' => 'user',
                'access_modules' => ['bmn'],
                'jabatan' => 'Pengendali Ekosistem Hutan Ahli Muda',
            ]
        );

        $dereportingNips = [
            '197503141999031004',
            '198402282009011005',
            '197511272000032001',
            '197406262001121004',
        ];

        foreach ($dereportingNips as $nip) {
            $user = User::where('username', $nip)->first();
            if ($user) {
                $currentModules = $user->access_modules ?? [];
                if (! in_array('dereporting', $currentModules)) {
                    $currentModules[] = 'dereporting';
                    $user->access_modules = $currentModules;
                    $user->save();
                }
            }
        }
    }

    public function TahunSeed()
    {
        $data = [
            ['tahun' => '2024', 'keterangan' => 'Tahun Anggaran 2024'],
            ['tahun' => '2025', 'keterangan' => 'Tahun Anggaran 2025'],
            ['tahun' => '2026', 'keterangan' => 'Tahun Anggaran 2026'],
        ];
        foreach ($data as $value) {
            Tahun::updateOrCreate(['tahun' => $value['tahun']], $value);
        }
    }

    public function AnggaranSeed()
    {
        $data = [
            ['sumber_anggaran' => 'DIPA', 'keterangan' => 'Daftar Isian Pelaksanaan Anggaran (DIPA)'],
            ['sumber_anggaran' => 'NONDIPA', 'keterangan' => 'Anggaran bersumber tidak dari Daftar Isian Pelaksanaan Anggaran'],
            ['sumber_anggaran' => 'PKS', 'keterangan' => 'Anggaran bersumber Perjanjian Kerjasama termasuk PNBP'],
        ];
        foreach ($data as $value) {
            Anggaran::updateOrCreate(['sumber_anggaran' => $value['sumber_anggaran']], $value);
        }
    }

    public function KoordinatorSeed()
    {
        $data = [
            ['koordinator' => 'Tata Usaha'],
            ['koordinator' => 'Teknis'],
            ['koordinator' => 'Perlindungan'],
            ['koordinator' => 'IKN'],
            ['koordinator' => 'NONDIPA'],
            ['koordinator' => 'PKS'],
        ];
        foreach ($data as $value) {
            Koordinator::updateOrCreate(['koordinator' => $value['koordinator']], $value);
        }
    }

    public function JenisDataSeed()
    {
        $data = [
            ['koordinator_id' => 1, 'jenis_data' => 'Perencanaan', 'keterangan' => 'Data Perencanaan'],
            ['koordinator_id' => 1, 'jenis_data' => 'Kepegawaian', 'keterangan' => 'Data Kepegawaian'],
            ['koordinator_id' => 1, 'jenis_data' => 'Perlengkapan/Umum', 'keterangan' => 'Data Perlengkapan/Umum'],
            ['koordinator_id' => 1, 'jenis_data' => 'Data dan Evaluasi', 'keterangan' => 'Data dan Evaluasi'],
            ['koordinator_id' => 2, 'jenis_data' => 'RKK', 'keterangan' => 'RKK - Perencanaan Kawasan konservasi'],
            ['koordinator_id' => 2, 'jenis_data' => 'PKK', 'keterangan' => 'PKK - Pengelolaan Kawasan Konservasi'],
            ['koordinator_id' => 2, 'jenis_data' => 'PJLKK', 'keterangan' => 'PJLKK - Pemanfaatan jasa Lingkungan Kawasan Konservasi'],
            ['koordinator_id' => 2, 'jenis_data' => 'KKHSG', 'keterangan' => 'KKHSG - Konservasi Keanekaragaman Hayati'],
            ['koordinator_id' => 2, 'jenis_data' => 'BPPE', 'keterangan' => 'BPPE - Bina Pengelolaan dan Pemulihan Ekosistem'],
            ['koordinator_id' => 3, 'jenis_data' => 'Perambahan', 'keterangan' => 'Perambahan'],
            ['koordinator_id' => 3, 'jenis_data' => 'Kebakaran Hutan', 'keterangan' => 'Kebakaran Hutan'],
            ['koordinator_id' => 3, 'jenis_data' => 'Konflik Satwa', 'keterangan' => 'Konflik Satwa'],
            ['koordinator_id' => 3, 'jenis_data' => 'Illegal Logging', 'keterangan' => 'Illegal Logging'],
            ['koordinator_id' => 4, 'jenis_data' => 'IKN', 'keterangan' => 'IKN'],
            ['koordinator_id' => 5, 'jenis_data' => 'Rapat/Diklat Non DIPA', 'keterangan' => 'Rapat/Diklat dengan sumber dana dari luar DIPA'],
            ['koordinator_id' => 5, 'jenis_data' => 'Laporan SAT-DN', 'keterangan' => 'Laporan SAT-DN'],
            ['koordinator_id' => 5, 'jenis_data' => 'Laporan SIMAKSI', 'keterangan' => 'Laporan SIMAKSI'],
            ['koordinator_id' => 5, 'jenis_data' => 'Laporan Realisasi PNBP', 'keterangan' => 'Laporan Realisasi PNBP'],
            ['koordinator_id' => 5, 'jenis_data' => 'Laporan Perjumpaan Satwa', 'keterangan' => 'Laporan Perjumpaan Satwa'],
            ['koordinator_id' => 5, 'jenis_data' => 'Laporan Pengunjung', 'keterangan' => 'Laporan Pengunjung'],
            ['koordinator_id' => 6, 'jenis_data' => 'Dok. Perjanjian Kerjasama', 'keterangan' => 'Dok. Perjanjian Kerjasama'],
            ['koordinator_id' => 6, 'jenis_data' => 'Dok. RPP', 'keterangan' => 'Dok. RPP'],
            ['koordinator_id' => 6, 'jenis_data' => 'Dok. RKL', 'keterangan' => 'Dok. RKL'],
            ['koordinator_id' => 6, 'jenis_data' => 'Dok. RKT', 'keterangan' => 'Dok. RKT'],
            ['koordinator_id' => 6, 'jenis_data' => 'Laporan Monitoring', 'keterangan' => 'Laporan Monitoring'],
            ['koordinator_id' => 6, 'jenis_data' => 'Laporan Tahunan', 'keterangan' => 'Laporan Tahunan'],
            ['koordinator_id' => 6, 'jenis_data' => 'Laporan Kegiatan', 'keterangan' => 'Laporan Kegiatan'],
        ];
        foreach ($data as $value) {
            JenisData::updateOrCreate(
                ['koordinator_id' => $value['koordinator_id'], 'jenis_data' => $value['jenis_data']],
                $value
            );
        }
    }

    public function JenisSeed()
    {
        $data = [
            ['keterangan' => 'Laporan Bulanan'],
            ['keterangan' => 'Laporan Triwulan'],
            ['keterangan' => 'Laporan Tahunan'],
            ['keterangan' => 'Laporan Keuangan'],
            ['keterangan' => 'Dok. Perjanjian Kerjasama'],
            ['keterangan' => 'Dok. RPP'],
            ['keterangan' => 'Dok. RKT'],
            ['keterangan' => 'Laporan Kegiatan'],
            ['keterangan' => 'Laporan Monitoring'],
            ['keterangan' => 'Perusahaan Bidang Kehutanan'],
            ['keterangan' => 'Perusahaan Bidang Non Kehutanan'],
        ];
        foreach ($data as $value) {
            Jenis::updateOrCreate(['keterangan' => $value['keterangan']], $value);
        }
    }

    public function BidangSeed()
    {
        $data = [
            ['bidang' => 'PEMEGANG IZIN TSL'],
            ['bidang' => 'KERJASAMA TSL'],
            ['bidang' => 'DATA TSL'],
            ['bidang' => 'LAIN-LAIN'],
        ];
        foreach ($data as $value) {
            Bidang::updateOrCreate(['bidang' => $value['bidang']], $value);
        }
    }

    public function KategoriSeed()
    {
        $data = [
            ['kategori' => 'Penangkaran TSL'],
            ['kategori' => 'Perusahaan Pengedar/Pengumpul TSL'],
            ['kategori' => 'Lembaga Konservasi Umum'],
            ['kategori' => 'Pemegang izin jasa lingkungan'],
            ['kategori' => 'Penguatan fungsi'],
            ['kategori' => 'Areal Konservasi Tinggi'],
            ['kategori' => 'Lain - Lain'],
        ];
        foreach ($data as $value) {
            Kategori::updateOrCreate(['kategori' => $value['kategori']], $value);
        }
    }
}
