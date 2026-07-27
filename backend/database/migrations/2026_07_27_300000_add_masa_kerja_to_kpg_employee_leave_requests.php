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
        if (!Schema::hasColumn('kpg_employee_leave_requests', 'masa_kerja')) {
            Schema::table('kpg_employee_leave_requests', function (Blueprint $table) {
                $table->string('masa_kerja')->nullable()->after('telepon');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasColumn('kpg_employee_leave_requests', 'masa_kerja')) {
            Schema::table('kpg_employee_leave_requests', function (Blueprint $table) {
                $table->dropColumn('masa_kerja');
            });
        }
    }
};
