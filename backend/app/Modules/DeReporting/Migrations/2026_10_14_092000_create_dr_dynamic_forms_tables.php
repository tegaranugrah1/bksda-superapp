<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('dr_forms', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('title', 255);
            $table->string('slug', 255)->unique();
            $table->text('description')->nullable();
            $table->jsonb('fields')->default('[]');
            $table->boolean('is_active')->default(true);
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('dr_form_responses', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('form_id')->constrained('dr_forms')->cascadeOnDelete();
            $table->jsonb('answers')->default('{}');
            $table->jsonb('file_paths')->nullable()->default('{}');
            $table->string('ip_address', 45)->nullable();
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('dr_form_responses');
        Schema::dropIfExists('dr_forms');
    }
};
