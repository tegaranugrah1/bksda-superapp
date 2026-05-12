<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('bmn_assets', function (Blueprint $table) {
            $table->string('foto_geotag_url', 1000)->nullable()->after('status_foto_geotag');
            $table->string('foto_depan_path')->nullable()->after('foto_geotag_url');
            $table->string('foto_belakang_path')->nullable()->after('foto_depan_path');
            $table->string('foto_kiri_path')->nullable()->after('foto_belakang_path');
            $table->string('foto_kanan_path')->nullable()->after('foto_kiri_path');
        });
    }

    public function down(): void
    {
        Schema::table('bmn_assets', function (Blueprint $table) {
            $table->dropColumn(['foto_geotag_url', 'foto_depan_path', 'foto_belakang_path', 'foto_kiri_path', 'foto_kanan_path']);
        });
    }
};
