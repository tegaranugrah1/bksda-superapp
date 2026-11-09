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
        Schema::table('kpg_employees', function (Blueprint $table) {
            $table->string('inactive_reason', 50)->nullable()->after('is_active');
            $table->date('inactive_effective_date')->nullable()->after('inactive_reason');
            $table->text('inactive_notes')->nullable()->after('inactive_effective_date');

            $table->index(['is_active', 'inactive_effective_date'], 'kpg_emp_lifecycle_idx');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('kpg_employees', function (Blueprint $table) {
            $table->dropIndex('kpg_emp_lifecycle_idx');
            $table->dropColumn(['inactive_reason', 'inactive_effective_date', 'inactive_notes']);
        });
    }
};
