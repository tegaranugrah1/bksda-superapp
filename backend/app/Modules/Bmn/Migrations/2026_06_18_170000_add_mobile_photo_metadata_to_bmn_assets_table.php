<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('bmn_assets', function (Blueprint $table) {
            $table->decimal('foto_geotag_latitude', 10, 7)->nullable()->after('foto_geotag_path');
            $table->decimal('foto_geotag_longitude', 10, 7)->nullable()->after('foto_geotag_latitude');
            $table->string('foto_geotag_location_note', 500)->nullable()->after('foto_geotag_longitude');
        });
    }

    public function down(): void
    {
        Schema::table('bmn_assets', function (Blueprint $table) {
            $table->dropColumn([
                'foto_geotag_latitude',
                'foto_geotag_longitude',
                'foto_geotag_location_note',
            ]);
        });
    }
};
