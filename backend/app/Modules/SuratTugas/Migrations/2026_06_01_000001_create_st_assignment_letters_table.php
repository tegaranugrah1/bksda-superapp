<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('st_assignment_letters', function (Blueprint $table) {
            $table->uuid('id')->primary();

            // Meta Data Surat
            $table->string('nomor_surat')->nullable()->unique()->comment('Bisa diisi belakangan saat approved');
            $table->text('dasar_hukum')->nullable();
            $table->text('maksud_tujuan');
            $table->date('tanggal_mulai');
            $table->date('tanggal_selesai');
            $table->string('tempat_tujuan');

            // Workflow Status
            $table->enum('status', ['draft', 'pending', 'approved', 'rejected', 'completed'])->default('draft');
            $table->string('file_surat_path')->nullable()->comment('Path PDF arsip final');

            // Audit Trails (Foreign ke UUID tabel users di Fase 1)
            $table->foreignId('created_by')->constrained('users')->onDelete('restrict');
            $table->foreignId('approved_by')->nullable()->constrained('users')->onDelete('set null');

            $table->timestamps();
            $table->softDeletes(); // Wajib SoftDeletes (Rule 3.6)
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('st_assignment_letters');
    }
};
