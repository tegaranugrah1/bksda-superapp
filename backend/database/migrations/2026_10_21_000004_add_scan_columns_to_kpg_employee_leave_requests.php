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
            $table->string('scan_surat_path')->nullable()->after('catatan_atasan');
            $table->string('scan_surat_nama')->nullable()->after('scan_surat_path');
            $table->timestamp('scan_surat_uploaded_at')->nullable()->after('scan_surat_nama');
            $table->unsignedBigInteger('scan_surat_uploaded_by')->nullable()->after('scan_surat_uploaded_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('kpg_employee_leave_requests', function (Blueprint $table) {
            $table->dropColumn([
                'scan_surat_path',
                'scan_surat_nama',
                'scan_surat_uploaded_at',
                'scan_surat_uploaded_by',
            ]);
        });
    }
};
