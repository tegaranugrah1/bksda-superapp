<?php

namespace Database\Seeders;

use App\Constants\BksdaConstants;
use App\Models\DriveFolder;
use App\Models\DriveUnit;
use App\Models\User;
use Illuminate\Database\Seeder;

class DriveHierarchicalFoldersSeeder extends Seeder
{
    public function run(): void
    {
        $superAdminId = User::where('role', 'super_admin')->value('id') ?: (User::value('id') ?: 1);

        // 1. Pastikan 4 Unit Utama terdaftar
        $units = [
            1 => ['name' => 'Balai BKSDA Kalimantan Timur', 'slug' => 'balai-samarinda'],
            2 => ['name' => 'Seksi Konservasi Wilayah I Berau', 'slug' => 'skw-1-berau'],
            3 => ['name' => 'Seksi Konservasi Wilayah II Tenggarong', 'slug' => 'skw-2-tenggarong'],
            4 => ['name' => 'Seksi Konservasi Wilayah III Balikpapan', 'slug' => 'skw-3-balikpapan'],
        ];

        foreach ($units as $id => $u) {
            DriveUnit::updateOrCreate(
                ['id' => $id],
                ['name' => $u['name'], 'slug' => $u['slug']]
            );
        }

        // JANGAN hapus unit seksi tambahan ID > 4 yang dibuat dari UI Master Lokasi

        $locationsByCode = \App\Modules\Bmn\Models\Location::whereNotNull('code')
            ->get()
            ->keyBy('code');

        // 2. Buat / Perbarui Folder Ruangan di Balai BKSDA Samarinda (Unit 1)
        foreach (BksdaConstants::BALAI_ROOMS as $roomCode => $roomName) {
            $loc = $locationsByCode->get($roomCode);
            $folder = DriveFolder::withTrashed()
                ->where('unit_id', 1)
                ->whereNull('parent_id')
                ->where(function ($q) use ($roomCode, $roomName, $loc) {
                    $q->where('room_code', $roomCode)->orWhere('name', $loc?->name ?: $roomName);
                })
                ->first();

            if (! $folder) {
                DriveFolder::create([
                    'unit_id' => 1,
                    'location_id' => $loc?->id,
                    'user_id' => $superAdminId,
                    'parent_id' => null,
                    'name' => $loc?->name ?: $roomName,
                    'is_restricted' => $loc ? (bool) $loc->is_restricted : false,
                    'folder_scope' => 'ruangan',
                    'room_code' => $roomCode,
                    'color' => '#059669',
                ]);
            }
        }

        // 3. Buat 14 Folder Resor Resmi di bawah SKW I, II, III
        foreach (BksdaConstants::RESORS as $resorCode => $resor) {
            $loc = $locationsByCode->get($resorCode);
            DriveFolder::firstOrCreate([
                'unit_id' => $loc?->effectiveDriveUnitId() ?: $resor['unit_id'],
                'parent_id' => null,
                'resor_code' => $resorCode,
            ], [
                'location_id' => $loc?->id,
                'name' => $loc?->name ?: $resor['name'],
                'user_id' => $superAdminId,
                'is_restricted' => $loc ? (bool) $loc->is_restricted : true,
                'folder_scope' => 'resor',
                'color' => '#10B981',
            ]);
        }

        // 4. Buat Folder Umum di bawah Balai & SKW I, II, III
        $generalFolders = [
            1 => ['name' => 'Berkas Umum & Koordinasi Balai', 'code' => 'balai-samarinda'],
            2 => ['name' => 'Berkas Umum & Koordinasi SKW I', 'code' => 'skw-1-berau'],
            3 => ['name' => 'Berkas Umum & Koordinasi SKW II', 'code' => 'skw-2-tenggarong'],
            4 => ['name' => 'Berkas Umum & Koordinasi SKW III', 'code' => 'skw-3-balikpapan'],
        ];

        foreach ($generalFolders as $unitId => $meta) {
            $loc = $locationsByCode->get($meta['code']);
            DriveFolder::firstOrCreate([
                'unit_id' => $unitId,
                'parent_id' => null,
                'name' => $meta['name'],
            ], [
                'location_id' => $loc?->id,
                'user_id' => $superAdminId,
                'is_restricted' => false,
                'folder_scope' => 'general',
                'color' => '#64748B',
            ]);
        }

        \App\Modules\Bmn\Models\Location::syncHierarchyAndBackfill();
    }
}
