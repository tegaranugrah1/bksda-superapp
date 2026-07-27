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
        if (!Schema::hasColumn('kpg_employee_leave_requests', 'status')) {
            Schema::table('kpg_employee_leave_requests', function (Blueprint $table) {
                $table->string('status')->default('PENGAJUAN')->after('sisa_n0');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasColumn('kpg_employee_leave_requests', 'status')) {
            Schema::table('kpg_employee_leave_requests', function (Blueprint $table) {
                $table->dropColumn('status');
            });
        }
    }
};
