<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('st_template_versions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('st_template_id')->constrained('st_templates')->cascadeOnDelete();
            $table->unsignedInteger('version');
            $table->json('snapshot');
            $table->foreignId('changed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('created_at')->useCurrent();
            $table->unique(['st_template_id', 'version']);
            $table->index('changed_by');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('st_template_versions');
    }
};
