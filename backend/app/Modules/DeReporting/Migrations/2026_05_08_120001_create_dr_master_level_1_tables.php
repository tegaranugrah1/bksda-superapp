<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Tahun Pelaporan
        Schema::create('dr_tahun', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->integer('tahun')->unique();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->softDeletes();
        });

        // 2. Bidang (Level Teratas)
        Schema::create('dr_bidang', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('nama', 100)->unique();
            $table->timestamps();
            $table->softDeletes();
        });

        // 3. Koordinator / Penanggung Jawab
        Schema::create('dr_koordinator', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('nama', 150)->unique();
            $table->timestamps();
            $table->softDeletes();
        });

        // 4. Sumber Anggaran
        Schema::create('dr_anggaran', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('nama', 100)->unique();
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('dr_anggaran');
        Schema::dropIfExists('dr_koordinator');
        Schema::dropIfExists('dr_bidang');
        Schema::dropIfExists('dr_tahun');
    }
};
