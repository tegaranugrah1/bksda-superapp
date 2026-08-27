<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('bmn_covering_letters', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignId('sender_employee_id')->nullable()->constrained('kpg_employees')->nullOnDelete();
            $table->foreignId('generated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('number', 120);
            $table->string('regarding', 255);
            $table->date('document_date');
            $table->string('recipient_title', 255)->default('Kepala Kantor Pelayanan Kekayaan Negara dan Lelang');
            $table->string('recipient_location', 255)->default('Samarinda');
            $table->json('items_snapshot');
            $table->text('closing_phrase');
            $table->date('received_date')->nullable();
            $table->boolean('show_signatures')->default(true);
            $table->json('sender_snapshot');
            $table->json('receiver_snapshot')->nullable();
            $table->json('metadata')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index('document_date');
            $table->index('sender_employee_id');
            $table->index('generated_by');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('bmn_covering_letters');
    }
};
