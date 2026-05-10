<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('inv_offices', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('nama_kantor'); // Misal: Kantor Seksi Wilayah I
            $table->string('lokasi')->nullable();
            // Relasi ke penanggung jawab kantor (Mengarah ke Modul Kepegawaian)
            $table->foreignId('penanggung_jawab_id')->nullable()->constrained('kpg_employees')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('inv_offices');
    }
};
