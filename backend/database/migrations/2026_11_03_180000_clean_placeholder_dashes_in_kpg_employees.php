<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        try {
            DB::table('kpg_employees')
                ->where('telepon', '-')
                ->update(['telepon' => null]);

            DB::table('kpg_employees')
                ->where('nomor_rekening', '-')
                ->update(['nomor_rekening' => null]);

            DB::table('kpg_employees')
                ->where('email', '-')
                ->update(['email' => null]);
        } catch (\Throwable $e) {}
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // No reverse needed for data sanitization
    }
};
