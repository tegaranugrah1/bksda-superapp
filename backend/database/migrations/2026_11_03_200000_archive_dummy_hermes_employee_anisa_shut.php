<?php

use Carbon\Carbon;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Mengarsipkan pegawai dummy 'Anisa Rahmawati, S.Hut.' (NIP: 199608142024042001)
     * sisa percobaan pengujian Hermes Agent agar tidak muncul di roster aktif pegawai definitif.
     */
    public function up(): void
    {
        $now = Carbon::now();
        $targetNip = '199608142024042001';
        $targetName = 'Anisa Rahmawati, S.Hut.';

        // 1. Soft-delete & nonaktifkan di kpg_employees
        DB::table('kpg_employees')
            ->where(function ($q) use ($targetNip, $targetName) {
                $q->where('nip', $targetNip)
                  ->orWhere('nama_lengkap', $targetName);
            })
            ->update([
                'is_active' => false,
                'deleted_at' => $now,
                'updated_at' => $now,
            ]);

        // 2. Nonaktifkan akun user jika ada
        DB::table('users')
            ->where(function ($q) use ($targetNip, $targetName) {
                $q->where('username', $targetNip)
                  ->orWhere('name', $targetName);
            })
            ->update([
                'is_active' => false,
                'deleted_at' => $now,
                'updated_at' => $now,
            ]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        $now = Carbon::now();
        $targetNip = '199608142024042001';
        $targetName = 'Anisa Rahmawati, S.Hut.';

        DB::table('kpg_employees')
            ->where('nip', $targetNip)
            ->orWhere('nama_lengkap', $targetName)
            ->update([
                'is_active' => true,
                'deleted_at' => null,
                'updated_at' => $now,
            ]);

        DB::table('users')
            ->where('username', $targetNip)
            ->orWhere('name', $targetName)
            ->update([
                'is_active' => true,
                'deleted_at' => null,
                'updated_at' => $now,
            ]);
    }
};
