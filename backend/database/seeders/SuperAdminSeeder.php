<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;
use App\Modules\Kepegawaian\Models\Employee;

class SuperAdminSeeder extends Seeder
{
    public function run(): void
    {
        // NIP Fiktif untuk Super Admin (18 digit standar BKN)
        $nipAdmin = '198001012005011001';

        // 1. Buat Data Master Pegawai
        Employee::updateOrCreate(
            ['nip' => $nipAdmin], // Cari berdasarkan NIP
            [
                'nama_lengkap' => 'Administrator Pusat BKSDA',
                'jabatan' => 'Kepala Satuan Teknologi',
                'pangkat_golongan' => 'Pembina Utama / IV.c',
                'satuan_kerja' => 'BKSDA Pusat Provinsi',
                'is_active' => true,
            ]
        );

        // 2. Buat Akun Aksesnya
        User::updateOrCreate(
            ['username' => $nipAdmin], // Username = NIP
            [
                'name' => 'Administrator Pusat BKSDA',
                'password' => 'Bksda2026!@#', // Password polos (Akan otomatis di-hash oleh sistem casts User.php)
                'role' => 'super_admin',
                'access_modules' => ['kepegawaian', 'bmn', 'inventory', 'dereporting'],
            ]
        );

        $this->command->info('Akun Super Admin berhasil ditanamkan ke Database!');
    }
}
