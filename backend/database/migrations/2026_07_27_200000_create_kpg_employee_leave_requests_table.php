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
        Schema::create('kpg_employee_leave_requests', function (Blueprint $table) {
            $table->id();
            $table->foreignId('employee_id')->constrained('kpg_employees')->onDelete('cascade');
            $table->string('nomor_pengajuan')->nullable();
            $table->date('tanggal_pengajuan');
            $table->string('jenis_cuti');
            $table->text('alasan_cuti');
            $table->integer('jumlah_hari')->default(1);
            $table->date('tanggal_mulai');
            $table->date('tanggal_selesai');
            $table->text('alamat_menjalankan_cuti');
            $table->string('telepon')->nullable();
            $table->integer('sisa_n2')->default(0);
            $table->integer('sisa_n1')->default(0);
            $table->integer('sisa_n0')->default(12);
            $table->string('status_pertimbangan_atasan')->default('DISETUJUI');
            $table->string('status_pertimbangan_pejabat')->default('DISETUJUI');
            $table->string('kasubbag_nama')->nullable();
            $table->string('kasubbag_nip')->nullable();
            $table->string('kepala_balai_nama')->nullable();
            $table->string('kepala_balai_nip')->nullable();
            $table->text('catatan_atasan')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('kpg_employee_leave_requests');
    }
};
