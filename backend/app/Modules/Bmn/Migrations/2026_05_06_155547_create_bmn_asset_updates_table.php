<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('bmn_asset_updates', function (Blueprint $table) {
            $table->uuid('id')->primary();

            $table->foreignUuid('asset_id')->constrained('bmn_assets')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();

            $table->string('field_changed');
            $table->text('old_value')->nullable();
            $table->text('new_value')->nullable();

            $table->string('alasan_perubahan')->nullable();

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('bmn_asset_updates');
    }
};
