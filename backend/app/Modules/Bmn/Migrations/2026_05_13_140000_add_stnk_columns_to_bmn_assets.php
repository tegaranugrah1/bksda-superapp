<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('bmn_assets', function (Blueprint $table) {
            $table->date('tanggal_pajak_stnk')->nullable()->after('no_stnk');
            $table->date('tanggal_ganti_plat')->nullable()->after('tanggal_pajak_stnk');
        });
    }

    public function down(): void
    {
        Schema::table('bmn_assets', function (Blueprint $table) {
            $table->dropColumn(['tanggal_pajak_stnk', 'tanggal_ganti_plat']);
        });
    }
};
