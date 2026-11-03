<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (!Schema::hasColumn('kpg_employees', 'telepon')) {
            Schema::table('kpg_employees', function (Blueprint $table) {
                $table->string('telepon', 30)->nullable()->index()->after('satuan_kerja');
            });
        }

        // Backfill nomor telepon dari riwayat permohonan cuti (kpg_employee_leave_requests) jika ada
        try {
            $latestPhones = DB::table('kpg_employee_leave_requests')
                ->whereNotNull('telepon')
                ->where('telepon', '<>', '')
                ->orderBy('id', 'desc')
                ->select('employee_id', 'telepon')
                ->get()
                ->unique('employee_id');

            foreach ($latestPhones as $row) {
                DB::table('kpg_employees')
                    ->where('id', $row->employee_id)
                    ->whereNull('telepon')
                    ->update(['telepon' => trim($row->telepon)]);
            }
        } catch (\Throwable $e) {
            // Ignore backfill errors on empty databases during testing
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasColumn('kpg_employees', 'telepon')) {
            Schema::table('kpg_employees', function (Blueprint $table) {
                $table->dropColumn('telepon');
            });
        }
    }
};
