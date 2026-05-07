<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('st_assignment_letter_employees', function (Blueprint $table) {
            $table->id();

            // Relasi ke Induk Surat Tugas
            $table->foreignUuid('assignment_letter_id')->constrained('st_assignment_letters')->onDelete('cascade');

            // Relasi ke Lintas-Modul (Kepegawaian)
            $table->foreignUuid('employee_id')->constrained('kpg_employees')->onDelete('cascade');

            $table->string('peran')->nullable()->comment('Contoh: Ketua Tim, Anggota');
            $table->timestamps();

            // Rule 3.3 Indexing Otomatis dari foreignUuid()
            // Constraint tambahan: 1 Pegawai cuma boleh masuk 1 kali di 1 Surat Tugas yang sama
            $table->unique(['assignment_letter_id', 'employee_id'], 'st_al_employee_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('st_assignment_letter_employees');
    }
};
