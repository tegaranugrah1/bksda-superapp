<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Khusus CPNS pengangkatan 2025 (NIP mengandung 202506):
     * Tahun pertama (2025) tidak berhak atas cuti tahunan (hak_cuti_n = 0, sisa = 0).
     * Tahun kedua (2026) mulai berhak atas cuti tahunan diawal sebesar 12 hari (sisa_cuti_n1 = 0).
     */
    public function up(): void
    {
        // 1. Dapatkan semua ID pegawai CPNS 202506
        $cpnsIds = DB::table('kpg_employees')
            ->where('nip', 'like', '%202506%')
            ->whereNull('deleted_at')
            ->pluck('id');

        if ($cpnsIds->isNotEmpty()) {
            // 2. Update record cuti tahun 2025: hak_cuti_n = 0, sisa_cuti_n1 = 0, cuti_terpakai_n0 = 0
            DB::table('kpg_employee_leaves')
                ->whereIn('employee_id', $cpnsIds)
                ->where('year', 2025)
                ->update([
                    'hak_cuti_n' => 0,
                    'sisa_cuti_n1' => 0,
                    'sisa_cuti_n2' => 0,
                    'cuti_terpakai_n1' => 0,
                    'cuti_terpakai_n2' => 0,
                    'cuti_terpakai_n0' => 0,
                    'updated_at' => now(),
                ]);

            // 3. Update record cuti tahun 2026: hak_cuti_n = 12, sisa_cuti_n1 = 0, sisa_cuti_n2 = 0
            DB::table('kpg_employee_leaves')
                ->whereIn('employee_id', $cpnsIds)
                ->where('year', 2026)
                ->update([
                    'hak_cuti_n' => 12,
                    'sisa_cuti_n1' => 0,
                    'sisa_cuti_n2' => 0,
                    'updated_at' => now(),
                ]);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        $cpnsIds = DB::table('kpg_employees')
            ->where('nip', 'like', '%202506%')
            ->pluck('id');

        if ($cpnsIds->isNotEmpty()) {
            DB::table('kpg_employee_leaves')
                ->whereIn('employee_id', $cpnsIds)
                ->where('year', 2025)
                ->update([
                    'hak_cuti_n' => 12,
                    'updated_at' => now(),
                ]);

            DB::table('kpg_employee_leaves')
                ->whereIn('employee_id', $cpnsIds)
                ->where('year', 2026)
                ->update([
                    'sisa_cuti_n1' => 12,
                    'updated_at' => now(),
                ]);
        }
    }
};
