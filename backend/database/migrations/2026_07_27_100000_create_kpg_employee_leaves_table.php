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
        Schema::create('kpg_employee_leaves', function (Blueprint $table) {
            $table->id();
            $table->foreignId('employee_id')->constrained('kpg_employees')->onDelete('cascade');
            $table->integer('year')->default(2026);
            $table->integer('hak_cuti_n')->default(12);
            $table->integer('sisa_cuti_n1')->default(0);
            $table->integer('cuti_terpakai_n1')->default(0);
            $table->integer('sisa_cuti_n2')->default(0);
            $table->integer('cuti_terpakai_n2')->default(0);
            $table->integer('cuti_terpakai_n0')->default(0);
            $table->text('catatan')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->onDelete('set null');
            $table->foreignId('updated_by')->nullable()->constrained('users')->onDelete('set null');
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['employee_id', 'year']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('kpg_employee_leaves');
    }
};
