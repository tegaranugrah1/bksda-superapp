<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('bmn_power_of_attorneys', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignId('employee_id')->constrained('kpg_employees')->cascadeOnDelete();
            $table->foreignId('generated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('number', 120);
            $table->string('kap', 30)->default('KAP.03.02');
            $table->date('document_date');
            $table->json('first_party_snapshot');
            $table->json('second_party_snapshot');
            $table->json('assets_snapshot');
            $table->json('asset_ids')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index(['employee_id', 'document_date']);
            $table->index('generated_by');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('bmn_power_of_attorneys');
    }
};
