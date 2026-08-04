<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('bmn_auction_batches', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('batch_number', 50)->unique();
            $table->string('name', 255);
            $table->string('status', 30)->default('DRAFT');

            $table->string('no_surat_persetujuan', 100)->nullable();
            $table->date('tanggal_surat_persetujuan')->nullable();
            $table->string('no_surat_penetapan', 100)->nullable();
            $table->date('tanggal_lelang')->nullable();

            $table->unsignedInteger('reauction_count')->default(0);
            $table->string('no_surat_jadwal_ulang', 100)->nullable();
            $table->date('tanggal_lelang_ulang')->nullable();
            $table->text('reauction_notes')->nullable();

            $table->unsignedBigInteger('kepala_balai_id')->nullable();
            $table->jsonb('metadata')->nullable();

            $table->timestamp('realized_at')->nullable();
            $table->timestamp('canceled_at')->nullable();
            $table->unsignedBigInteger('created_by')->nullable();
            $table->unsignedBigInteger('updated_by')->nullable();

            $table->timestamps();
            $table->softDeletes();

            $table->index('status');
            $table->index('tanggal_lelang');
            $table->index('created_by');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('bmn_auction_batches');
    }
};
