<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('bmn_assets', function (Blueprint $table) {
            $table->string('foto_bpkb_1_path')->nullable()->after('foto_lokasi_path');
            $table->string('foto_bpkb_2_path')->nullable()->after('foto_bpkb_1_path');
            $table->string('foto_bpkb_3_path')->nullable()->after('foto_bpkb_2_path');
            $table->string('foto_bpkb_4_path')->nullable()->after('foto_bpkb_3_path');
            $table->string('foto_stnk_1_path')->nullable()->after('foto_bpkb_4_path');
            $table->string('foto_stnk_2_path')->nullable()->after('foto_stnk_1_path');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('bmn_assets', function (Blueprint $table) {
            $table->dropColumn([
                'foto_bpkb_1_path',
                'foto_bpkb_2_path',
                'foto_bpkb_3_path',
                'foto_bpkb_4_path',
                'foto_stnk_1_path',
                'foto_stnk_2_path'
            ]);
        });
    }
};
