<?php

namespace Database\Seeders;

use App\Models\User;
use App\Modules\Kepegawaian\Models\Employee;
use Illuminate\Database\Seeder;

class SuperAdminSeeder extends Seeder
{
    public function run(): void
    {
        // NIP Fiktif untuk Super Admin (18 digit standar BKN)
        $nipAdmin = '198001012005011001';

        // 1. Buat Akun Akses NIP (Super Admin)
        User::updateOrCreate(
            ['username' => $nipAdmin], // Cari berdasarkan NIP
            [
                'name' => 'Administrator Pusat BKSDA',
                'email' => 'admin@bksda.local', // Required by database constraint
                'password' => 'Bksda2026!@#', // Password polos (Akan otomatis di-hash oleh sistem casts User.php)
                'role' => 'super_admin',
                'access_modules' => ['kepegawaian', 'bmn', 'inventory', 'dereporting', 'surat'],
                'is_active' => true,
            ]
        );

        // 3. Buat Akun Direct Username `superadmin`
        User::updateOrCreate(
            ['username' => 'superadmin'],
            [
                'name' => 'Super Admin System',
                'email' => 'superadmin@bksdakaltim.net',
                'password' => 'Lolipop@147258379',
                'role' => 'super_admin',
                'access_modules' => ['kepegawaian', 'bmn', 'inventory', 'dereporting', 'surat'],
                'is_active' => true,
            ]
        );

        // 4. Buat Akun Anak Magang
        User::updateOrCreate(
            ['username' => 'magang'],
            [
                'name' => 'Anak Magang',
                'email' => 'magang@bksdakaltim.net',
                'password' => 'konservasi#ksdae',
                'role' => 'user',
                'access_modules' => ['surat', 'kepegawaian', 'bmn', 'inventory', 'dereporting'],
                'is_active' => true,
            ]
        );

        $this->command->info('Akun Super Admin & User Magang berhasil ditanamkan ke Database!');
    }
}
