<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('email_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('mailer', 64)->default('failover');
            $table->string('to');
            $table->string('subject');
            $table->string('status', 32)->default('sent'); // sent, failed, delivered, bounced, complained
            $table->text('error_message')->nullable();
            $table->string('message_id', 255)->nullable()->index();
            $table->timestamps();
        });

        Schema::create('notification_settings', function (Blueprint $table) {
            $table->string('key', 64)->primary();
            $table->boolean('enabled')->default(true);
            $table->string('description', 255)->nullable();
            $table->timestamp('updated_at')->useCurrent();
        });

        // Seed default notification settings
        DB::table('notification_settings')->insertOrIgnore([
            [
                'key' => 'email_master_enabled',
                'enabled' => true,
                'description' => 'Master switch email notifications seluruh sistem',
                'updated_at' => now(),
            ],
            [
                'key' => 'mail.security_alert',
                'enabled' => true,
                'description' => 'Peringatan keamanan (ganti password, login baru, reset akun)',
                'updated_at' => now(),
            ],
            [
                'key' => 'mail.cuti_status',
                'enabled' => true,
                'description' => 'Pemberitahuan perubahan status permohonan cuti (disetujui/ditolak)',
                'updated_at' => now(),
            ],
            [
                'key' => 'mail.surat_tugas',
                'enabled' => true,
                'description' => 'Pemberitahuan penerbitan atau penugasan Surat Tugas resmi',
                'updated_at' => now(),
            ],
        ]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('email_logs');
        Schema::dropIfExists('notification_settings');
    }
};
