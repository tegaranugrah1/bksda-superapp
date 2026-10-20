<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('kpg_incoming_letters', function (Blueprint $table) {
            $table->id();
            $table->string('no_agenda')->index();
            $table->string('no_surat_masuk')->nullable()->index();
            $table->date('tanggal_surat')->nullable()->index();
            $table->date('tanggal_diterima')->index();
            $table->string('asal_surat');
            $table->string('kategori')->index();
            $table->text('perihal')->nullable();
            $table->text('catatan')->nullable();
            $table->string('no_surat_balasan')->nullable()->index();
            $table->date('tanggal_surat_balasan')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('kpg_incoming_letter_attachments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('incoming_letter_id')->constrained('kpg_incoming_letters')->cascadeOnDelete();
            $table->string('type')->index();
            $table->string('original_name');
            $table->string('storage_path');
            $table->string('mime_type', 150);
            $table->unsignedBigInteger('size');
            $table->string('note')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('kpg_incoming_letter_attachments');
        Schema::dropIfExists('kpg_incoming_letters');
    }
};
