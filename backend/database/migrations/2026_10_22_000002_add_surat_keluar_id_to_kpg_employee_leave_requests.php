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
            $table->unsignedBigInteger('surat_keluar_id')->nullable()->after('employee_id')->index();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('kpg_employee_leave_requests', function (Blueprint $table) {
            $table->dropIndex(['surat_keluar_id']);
            $table->dropColumn('surat_keluar_id');
        });
    }
};
