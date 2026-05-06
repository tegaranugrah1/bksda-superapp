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
        Schema::create('audit_logs', function (Blueprint $table) {
            $table->id();
            // user_id nullable karena bisa jadi aktivitas dilakukan oleh Guest (belum login)
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            
            $table->string('method'); // POST, PUT, DELETE
            $table->text('url'); // Path yang diakses
            $table->string('ip_address')->nullable();
            $table->integer('status_code'); // Contoh: 200 (OK), 403 (Forbidden)
            
            // Simpan body request (apa saja yang dikirim oleh user)
            $table->json('payload')->nullable(); 
            
            // Kita hanya butuh created_at (kapan dicatat). Tidak butuh updated_at.
            $table->timestamp('created_at')->useCurrent();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('audit_logs');
    }
};
