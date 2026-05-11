<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('st_assignment_letters', function (Blueprint $table) {
            $table->string('nama_plh')->nullable()->after('nomor_surat')->comment('Nama PLH jika Kasubag/Kaseksi ikut perjalanan');
            $table->boolean('has_seksi_employee')->default(false)->after('nama_plh')->comment('Apakah ada pegawai dari Seksi');
            $table->enum('tanda_setuju', ['sudah', 'belum'])->nullable()->after('has_seksi_employee')->comment('Status persetujuan Kepala Seksi');
        });
    }

    public function down(): void
    {
        Schema::table('st_assignment_letters', function (Blueprint $table) {
            $table->dropColumn(['nama_plh', 'has_seksi_employee', 'tanda_setuju']);
        });
    }
};
