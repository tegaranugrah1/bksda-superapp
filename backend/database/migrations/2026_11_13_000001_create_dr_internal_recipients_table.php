<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Tambah kolom target_scope, review_status, review_notes ke dr_internals
        Schema::table('dr_internals', function (Blueprint $table) {
            $table->string('target_scope', 20)->default('all')->after('user_id');
            $table->string('review_status', 30)->default('terkirim')->after('keterangan');
            $table->text('review_notes')->nullable()->after('review_status');
        });

        // 2. Buat tabel pivot penerima multi-target (Urusan & Personal)
        Schema::create('dr_internal_recipients', function (Blueprint $table) {
            $table->id();
            $table->foreignUuid('internal_id')->constrained('dr_internals')->onDelete('cascade');
            $table->string('recipient_type', 20); // 'user' atau 'urusan'
            $table->foreignId('user_id')->nullable()->constrained('users')->onDelete('set null');
            $table->string('urusan_name', 150)->nullable();
            $table->timestamp('read_at')->nullable();
            $table->timestamps();

            // Indeks komposit untuk performa pencarian query O(1)
            $table->index(['recipient_type', 'user_id'], 'idx_dr_recipients_user');
            $table->index(['recipient_type', 'urusan_name'], 'idx_dr_recipients_urusan');
            $table->index('internal_id', 'idx_dr_recipients_internal');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('dr_internal_recipients');

        Schema::table('dr_internals', function (Blueprint $table) {
            $table->dropColumn(['target_scope', 'review_status', 'review_notes']);
        });
    }
};
