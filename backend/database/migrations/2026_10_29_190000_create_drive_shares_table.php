<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('drive_shares', function (Blueprint $table) {
            $table->id();
            $table->foreignId('file_id')->nullable()->constrained('drive_files')->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained('users')->cascadeOnDelete();
            $table->foreignId('unit_id')->nullable()->constrained('drive_units')->cascadeOnDelete();
            $table->string('share_type', 16)->default('internal'); // internal, public
            $table->string('role', 16)->default('viewer'); // viewer, editor
            $table->string('token', 64)->nullable()->unique();
            $table->string('password_hash')->nullable();
            $table->timestamp('expires_at')->nullable();
            $table->unsignedInteger('download_count')->default(0);
            $table->foreignId('created_by')->constrained('users')->cascadeOnDelete();
            $table->timestamps();

            $table->index(['user_id', 'share_type']);
            $table->index(['unit_id', 'share_type']);
            $table->index(['file_id', 'share_type']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('drive_shares');
    }
};
