<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('bmn_assets', function (Blueprint $table) {
            // Drop old columns
            $table->dropColumn(['foto_depan_path', 'foto_belakang_path', 'foto_kiri_path', 'foto_kanan_path']);
        });

        Schema::table('bmn_assets', function (Blueprint $table) {
            // Create new columns with correct names
            $table->string('foto_belakang_path')->nullable()->after('foto_geotag_url');
            $table->string('foto_kiri_path')->nullable()->after('foto_belakang_path');
            $table->string('foto_kanan_path')->nullable()->after('foto_kiri_path');
            $table->string('foto_lokasi_path')->nullable()->after('foto_kanan_path');
        });
    }

    public function down(): void
    {
        Schema::table('bmn_assets', function (Blueprint $table) {
            $table->dropColumn(['foto_belakang_path', 'foto_kiri_path', 'foto_kanan_path', 'foto_lokasi_path']);
        });

        Schema::table('bmn_assets', function (Blueprint $table) {
            $table->string('foto_depan_path')->nullable();
            $table->string('foto_belakang_path')->nullable();
            $table->string('foto_kiri_path')->nullable();
            $table->string('foto_kanan_path')->nullable();
        });
    }
};
