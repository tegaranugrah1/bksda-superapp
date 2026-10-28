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
        Schema::create('portal_notifications', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
            $table->unsignedBigInteger('employee_id')->nullable()->index();
            $table->string('title', 255);
            $table->text('message');
            $table->string('type', 50)->default('system'); // surat_tugas, cuti, bmn, system
            $table->string('action_tab', 50)->nullable(); // surat_tugas, cuti, pinjaman, aset
            $table->string('reference_id', 255)->nullable();
            $table->json('data')->nullable();
            $table->timestamp('read_at')->nullable()->index();
            $table->timestamps();

            // Compound index for fast user querying and unread counts
            $table->index(['user_id', 'read_at', 'created_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('portal_notifications');
    }
};
