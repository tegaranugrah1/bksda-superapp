<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('kpg_employees') && ! Schema::hasColumn('kpg_employees', 'masa_kerja')) {
            Schema::table('kpg_employees', function (Blueprint $table) {
                $table->string('masa_kerja', 100)->nullable()->after('pangkat_golongan');
            });
        }

        if (! Schema::hasTable('kpg_employee_histories')) {
            Schema::create('kpg_employee_histories', function (Blueprint $table) {
                $table->id();
                $table->foreignId('employee_id')->constrained('kpg_employees')->cascadeOnDelete();
                $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
                $table->string('action', 50)->default('UPDATE_BIODATA');
                $table->json('changes');
                $table->text('notes')->nullable();
                $table->timestamp('created_at')->useCurrent();

                $table->index(['employee_id', 'created_at']);
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('kpg_employee_histories');

        if (Schema::hasTable('kpg_employees') && Schema::hasColumn('kpg_employees', 'masa_kerja')) {
            Schema::table('kpg_employees', function (Blueprint $table) {
                $table->dropColumn('masa_kerja');
            });
        }
    }
};
