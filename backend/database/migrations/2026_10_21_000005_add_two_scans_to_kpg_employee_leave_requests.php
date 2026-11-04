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
        Schema::table('kpg_employee_leave_requests', function (Blueprint $table) {
            $table->string('scan_formulir_path')->nullable()->after('scan_surat_uploaded_by');
            $table->string('scan_formulir_nama')->nullable()->after('scan_formulir_path');
            $table->string('scan_surat_izin_path')->nullable()->after('scan_formulir_nama');
            $table->string('scan_surat_izin_nama')->nullable()->after('scan_surat_izin_path');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('kpg_employee_leave_requests', function (Blueprint $table) {
            $table->dropColumn([
                'scan_formulir_path',
                'scan_formulir_nama',
                'scan_surat_izin_path',
                'scan_surat_izin_nama',
            ]);
        });
    }
};
