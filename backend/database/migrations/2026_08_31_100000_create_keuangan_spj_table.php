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
        Schema::create('keuangan_spj', function (Blueprint $table) {
            $table->id();
            $table->string('nomor_spj')->nullable()->index();
            $table->string('tipe_anggaran')->default('FOLU')->index(); // FOLU or DIPA
            $table->string('nama_kegiatan'); // Nama / Judul SPJ
            $table->string('nomor_spt')->nullable()->index();
            $table->string('surat_tugas_id')->nullable();
            $table->string('sumber_dana')->default('FOLU-NC-23');
            $table->string('kode_awp')->nullable();
            $table->string('satuan_kerja')->default('Balai Konservasi Sumber Daya Alam Kalimantan Timur');
            $table->string('asal')->default('Samarinda');
            $table->string('tujuan')->default('Kabupaten Kutai Barat');
            $table->date('tanggal_mulai')->nullable();
            $table->date('tanggal_selesai')->nullable();
            
            // Officials (JSON)
            $table->json('pejabat_ppk')->nullable();
            $table->json('pejabat_pdo')->nullable();
            $table->json('pejabat_verifikator')->nullable();
            $table->json('pejabat_kasubbag')->nullable();
            
            // Recipients and breakdown RINBA (JSON)
            $table->json('recipients')->nullable();
            
            // Totals
            $table->decimal('total_anggaran', 15, 2)->default(0);
            $table->unsignedInteger('employee_count')->default(1);
            
            // Status and Creator
            $table->string('status')->default('Draft')->index(); // Draft, Diajukan, Diproses, Disetujui, Selesai
            $table->foreignId('created_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('creator_name')->nullable();
            
            $table->timestamps();
            $table->softDeletes();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('keuangan_spj');
    }
};
