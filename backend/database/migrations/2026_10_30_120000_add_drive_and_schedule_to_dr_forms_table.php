<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('dr_forms', function (Blueprint $table) {
            $table->foreignId('drive_folder_id')->nullable()->constrained('drive_folders')->nullOnDelete();
            $table->timestamp('closed_at')->nullable();
            $table->text('closed_message')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('dr_forms', function (Blueprint $table) {
            $table->dropForeign(['drive_folder_id']);
            $table->dropColumn(['drive_folder_id', 'closed_at', 'closed_message']);
        });
    }
};
