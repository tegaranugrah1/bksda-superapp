<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasColumn('bmn_assets', 'foto_depan_path')) {
            return;
        }

        Schema::table('bmn_assets', function (Blueprint $table) {
            $table->string('foto_depan_path')->nullable()->after('foto_geotag_path');
        });
    }

    public function down(): void
    {
        if (!Schema::hasColumn('bmn_assets', 'foto_depan_path')) {
            return;
        }

        Schema::table('bmn_assets', function (Blueprint $table) {
            $table->dropColumn('foto_depan_path');
        });
    }
};
