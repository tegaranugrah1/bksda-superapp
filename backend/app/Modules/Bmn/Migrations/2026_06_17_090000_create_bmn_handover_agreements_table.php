<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('bmn_handover_agreements', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('variant', 40);
            $table->foreignId('first_party_employee_id')->nullable()->constrained('kpg_employees')->nullOnDelete();
            $table->foreignId('second_party_employee_id')->nullable()->constrained('kpg_employees')->nullOnDelete();
            $table->foreignId('generated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('title', 180);
            $table->string('number', 120);
            $table->string('kap', 30)->default('KAP.03.02');
            $table->date('document_date');
            $table->json('first_party_snapshot');
            $table->json('second_party_snapshot');
            $table->json('witness_snapshot')->nullable();
            $table->json('items_snapshot');
            $table->json('asset_ids')->nullable();
            $table->json('metadata')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index(['variant', 'document_date']);
            $table->index('first_party_employee_id');
            $table->index('second_party_employee_id');
            $table->index('generated_by');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('bmn_handover_agreements');
    }
};
