<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('st_assignment_letters', function (Blueprint $table) {
            $table->foreignId('template_id')->nullable()->after('template_type')->constrained('st_templates')->nullOnDelete();
            $table->unsignedInteger('template_version')->nullable()->after('template_id');
            $table->json('template_snapshot')->nullable()->after('template_version');
        });
    }

    public function down(): void
    {
        Schema::table('st_assignment_letters', function (Blueprint $table) {
            $table->dropForeign(['template_id']);
            $table->dropColumn(['template_id', 'template_version', 'template_snapshot']);
        });
    }
};
