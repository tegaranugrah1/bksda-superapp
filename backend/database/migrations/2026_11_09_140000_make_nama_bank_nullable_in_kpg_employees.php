<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('kpg_employees') && Schema::hasColumn('kpg_employees', 'nama_bank')) {
            Schema::table('kpg_employees', function (Blueprint $table) {
                $table->string('nama_bank', 50)->nullable()->default(null)->change();
            });

            // Bersihkan data bank untuk personil MMP
            DB::table('kpg_employees')
                ->where('nip', 'LIKE', 'MMP-%')
                ->update([
                    'nama_bank' => null,
                    'nomor_rekening' => null,
                ]);
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('kpg_employees') && Schema::hasColumn('kpg_employees', 'nama_bank')) {
            DB::table('kpg_employees')
                ->whereNull('nama_bank')
                ->update(['nama_bank' => 'BRI']);

            Schema::table('kpg_employees', function (Blueprint $table) {
                $table->string('nama_bank', 50)->default('BRI')->nullable(false)->change();
            });
        }
    }
};
