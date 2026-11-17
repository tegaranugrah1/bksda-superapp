<?php

use App\Modules\Bmn\Models\Location;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('bmn_locations', function (Blueprint $table) {
            if (! Schema::hasColumn('bmn_locations', 'parent_id')) {
                $table->uuid('parent_id')->nullable()->after('id')->index();
            }
            if (! Schema::hasColumn('bmn_locations', 'location_type')) {
                $table->string('location_type', 20)->default('room')->after('parent_id');
            }
            if (! Schema::hasColumn('bmn_locations', 'drive_unit_id')) {
                $table->unsignedBigInteger('drive_unit_id')->nullable()->after('unit_kerja')->index();
            }
            if (! Schema::hasColumn('bmn_locations', 'code')) {
                $table->string('code', 64)->nullable()->unique()->after('name');
            }
            if (! Schema::hasColumn('bmn_locations', 'is_restricted')) {
                $table->boolean('is_restricted')->default(false)->after('description');
            }
            if (! Schema::hasColumn('bmn_locations', 'is_active')) {
                $table->boolean('is_active')->default(true)->after('is_restricted');
            }
        });

        Schema::table('kpg_employees', function (Blueprint $table) {
            if (! Schema::hasColumn('kpg_employees', 'location_id')) {
                $table->uuid('location_id')->nullable()->after('resor')->index();
            }
        });

        Schema::table('drive_folders', function (Blueprint $table) {
            if (! Schema::hasColumn('drive_folders', 'location_id')) {
                $table->uuid('location_id')->nullable()->after('unit_id')->index();
            }
        });

        if (DB::getDriverName() !== 'sqlite') {
            Schema::table('bmn_locations', function (Blueprint $table) {
                $table->foreign('parent_id')
                    ->references('id')
                    ->on('bmn_locations')
                    ->nullOnDelete();
                $table->foreign('drive_unit_id')
                    ->references('id')
                    ->on('drive_units')
                    ->nullOnDelete();
            });

            Schema::table('kpg_employees', function (Blueprint $table) {
                $table->foreign('location_id')
                    ->references('id')
                    ->on('bmn_locations')
                    ->nullOnDelete();
            });

            Schema::table('drive_folders', function (Blueprint $table) {
                $table->foreign('location_id')
                    ->references('id')
                    ->on('bmn_locations')
                    ->nullOnDelete();
            });
        }

        if (class_exists(Location::class)) {
            Location::syncHierarchyAndBackfill();
        }
    }

    public function down(): void
    {
        if (DB::getDriverName() !== 'sqlite') {
            Schema::table('drive_folders', function (Blueprint $table) {
                $table->dropForeign(['location_id']);
            });
            Schema::table('kpg_employees', function (Blueprint $table) {
                $table->dropForeign(['location_id']);
            });
            Schema::table('bmn_locations', function (Blueprint $table) {
                $table->dropForeign(['drive_unit_id']);
                $table->dropForeign(['parent_id']);
            });
        }

        Schema::table('drive_folders', function (Blueprint $table) {
            if (Schema::hasColumn('drive_folders', 'location_id')) {
                $table->dropIndex(['location_id']);
                $table->dropColumn('location_id');
            }
        });

        Schema::table('kpg_employees', function (Blueprint $table) {
            if (Schema::hasColumn('kpg_employees', 'location_id')) {
                $table->dropIndex(['location_id']);
                $table->dropColumn('location_id');
            }
        });

        Schema::table('bmn_locations', function (Blueprint $table) {
            if (Schema::hasColumn('bmn_locations', 'is_active')) {
                $table->dropColumn('is_active');
            }
            if (Schema::hasColumn('bmn_locations', 'is_restricted')) {
                $table->dropColumn('is_restricted');
            }
            if (Schema::hasColumn('bmn_locations', 'code')) {
                $table->dropUnique(['code']);
                $table->dropColumn('code');
            }
            if (Schema::hasColumn('bmn_locations', 'drive_unit_id')) {
                $table->dropIndex(['drive_unit_id']);
                $table->dropColumn('drive_unit_id');
            }
            if (Schema::hasColumn('bmn_locations', 'location_type')) {
                $table->dropColumn('location_type');
            }
            if (Schema::hasColumn('bmn_locations', 'parent_id')) {
                $table->dropIndex(['parent_id']);
                $table->dropColumn('parent_id');
            }
        });
    }
};
