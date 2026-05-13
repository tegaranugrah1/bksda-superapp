<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Batch metadata table
        Schema::create('bmn_import_batches', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignId('uploaded_by')->constrained('users')->cascadeOnDelete();
            $table->string('filename');
            $table->integer('total_rows')->default(0);
            $table->integer('new_rows')->default(0);
            $table->integer('updated_rows')->default(0);
            $table->integer('unchanged_rows')->default(0);
            $table->enum('status', ['pending', 'approved', 'rejected', 'expired'])->default('pending');
            $table->timestamp('approved_at')->nullable();
            $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        // Staging rows table
        Schema::create('bmn_import_staging', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('batch_id');
            $table->foreign('batch_id')->references('id')->on('bmn_import_batches')->cascadeOnDelete();
            $table->uuid('existing_asset_id')->nullable(); // null = new asset
            $table->enum('diff_status', ['new', 'updated', 'unchanged'])->default('new');
            $table->json('imported_data'); // full row from Excel
            $table->json('changed_fields')->nullable(); // only fields that differ from existing
            $table->boolean('selected')->default(true); // user can deselect rows
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('bmn_import_staging');
        Schema::dropIfExists('bmn_import_batches');
    }
};
