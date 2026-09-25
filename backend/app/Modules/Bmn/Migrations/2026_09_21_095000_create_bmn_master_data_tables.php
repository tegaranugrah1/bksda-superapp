<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('bmn_locations', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('unit_kerja'); // e.g. "Kantor Balai KSDA Kalimantan Timur", "Seksi KSDA Wilayah I (Berau)"
            $table->string('name')->unique(); // e.g. "Urusan Umum dan Perlengkapan", "Resor 01. Berau"
            $table->text('description')->nullable();
            $table->timestamps();

            $table->index('unit_kerja');
        });

        Schema::create('bmn_asset_types', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('name')->unique(); // e.g. "ALAT ANGKUTAN BERMOTOR", "TANAH"
            $table->string('category_mode', 50)->default('peralatan'); // kendaraan, tanah, bangunan, peralatan
            $table->text('description')->nullable();
            $table->timestamps();

            $table->index('category_mode');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('bmn_asset_types');
        Schema::dropIfExists('bmn_locations');
    }
};
