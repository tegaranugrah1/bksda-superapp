<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Menambahkan Muhammad Riezqy Senopati (MMP-034) ke kpg_employees
     * untuk melengkapi daftar riil 147 personil BKSDA Kaltim.
     */
    public function up(): void
    {
        $now = Carbon::now();

        $exists = DB::table('kpg_employees')
            ->where('nip', 'MMP-034')
            ->orWhere('nama_lengkap', 'Muhammad Riezqy Senopati')
            ->exists();

        if (!$exists) {
            DB::table('kpg_employees')->insert([
                'nip' => 'MMP-034',
                'nama_lengkap' => 'Muhammad Riezqy Senopati',
                'jabatan' => 'MMP Resor KSDA Wilayah 14 Ibu Kota Nusantara (IKN)',
                'pangkat_golongan' => null,
                'satuan_kerja' => 'Seksi KSDA Wilayah III Balikpapan',
                'is_active' => true,
                'foto_profil' => null,
                'resor' => null,
                'created_at' => $now,
                'updated_at' => $now,
                'deleted_at' => null,
            ]);
        } else {
            DB::table('kpg_employees')
                ->where('nip', 'MMP-034')
                ->orWhere('nama_lengkap', 'Muhammad Riezqy Senopati')
                ->update([
                    'is_active' => true,
                    'deleted_at' => null,
                    'updated_at' => $now,
                ]);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::table('kpg_employees')
            ->where('nip', 'MMP-034')
            ->orWhere('nama_lengkap', 'Muhammad Riezqy Senopati')
            ->delete();
    }
};
