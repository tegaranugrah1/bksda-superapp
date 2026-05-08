<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Level 2: Jenis (Terkait Bidang)
        Schema::create('dr_jenis', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('bidang_id')->constrained('dr_bidang')->onDelete('restrict');
            $table->string('nama', 150);
            $table->timestamps();
            $table->softDeletes();

            // Cegah Nama Jenis yang sama di dalam satu Bidang
            $table->unique(['bidang_id', 'nama']);
        });

        // Level 3: Kategori (Terkait Jenis)
        Schema::create('dr_kategori', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('jenis_id')->constrained('dr_jenis')->onDelete('restrict');
            $table->string('nama', 200);
            $table->timestamps();
            $table->softDeletes();
            $table->unique(['jenis_id', 'nama']);
        });

        // Level 4: Jenis Data (Terkait Kategori & Koordinator)
        Schema::create('dr_jenis_data', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('kategori_id')->constrained('dr_kategori')->onDelete('restrict');
            $table->foreignUuid('koordinator_id')->nullable()->constrained('dr_koordinator')->onDelete('restrict');
            $table->string('nama', 255);
            $table->timestamps();
            $table->softDeletes();
            $table->unique(['kategori_id', 'nama']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('dr_jenis_data');
        Schema::dropIfExists('dr_kategori');
        Schema::dropIfExists('dr_jenis');
    }
};
