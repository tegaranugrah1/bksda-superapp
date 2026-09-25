<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('bmn_tags', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('name')->unique();
            $table->string('label');
            $table->string('color', 50)->default('emerald');
            $table->text('description')->nullable();
            $table->timestamps();
        });

        Schema::create('bmn_asset_tag', function (Blueprint $table) {
            $table->uuid('asset_id');
            $table->uuid('tag_id');
            $table->timestamps();

            $table->foreign('asset_id')
                ->references('id')
                ->on('bmn_assets')
                ->cascadeOnDelete();

            $table->foreign('tag_id')
                ->references('id')
                ->on('bmn_tags')
                ->cascadeOnDelete();

            $table->primary(['asset_id', 'tag_id']);
            $table->index('asset_id');
            $table->index('tag_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('bmn_asset_tag');
        Schema::dropIfExists('bmn_tags');
    }
};
