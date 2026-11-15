<?php

use App\Modules\Bmn\Models\Location;
use Illuminate\Database\Migrations\Migration;

return new class extends Migration
{
    public function up(): void
    {
        Location::syncHierarchyAndBackfill();
    }

    public function down(): void
    {
        // Idempotent data alignment; no destructive rollback required.
    }
};
