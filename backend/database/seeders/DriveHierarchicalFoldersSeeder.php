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

        // Hapus unit > 4
        DriveUnit::where('id', '>', 4)->delete();

        // 2. Buat / Perbarui Folder Ruangan di Balai BKSDA Samarinda (Unit 1)
        foreach (BksdaConstants::BALAI_ROOMS as $roomCode => $roomName) {
            DriveFolder::firstOrCreate([
                'unit_id' => 1,
                'parent_id' => null,
                'name' => $roomName,
            ], [
                'user_id' => $superAdminId,
                'is_restricted' => false,
                'folder_scope' => 'ruangan',
                'room_code' => $roomCode,
                'color' => '#059669',
            ]);
        }

        // 3. Buat 14 Folder Resor Resmi di bawah SKW I, II, III
        foreach (BksdaConstants::RESORS as $resorCode => $resor) {
            DriveFolder::firstOrCreate([
                'unit_id' => $resor['unit_id'],
                'parent_id' => null,
                'resor_code' => $resorCode,
            ], [
                'name' => $resor['name'],
                'user_id' => $superAdminId,
                'is_restricted' => true,
                'folder_scope' => 'resor',
                'color' => '#10B981',
            ]);
        }

        // 4. Buat Folder Umum di bawah SKW I, II, III
        $generalFolders = [
            2 => 'Berkas Umum & Koordinasi SKW I',
            3 => 'Berkas Umum & Koordinasi SKW II',
            4 => 'Berkas Umum & Koordinasi SKW III',
        ];

        foreach ($generalFolders as $unitId => $folderName) {
            DriveFolder::firstOrCreate([
                'unit_id' => $unitId,
                'parent_id' => null,
                'name' => $folderName,
            ], [
                'user_id' => $superAdminId,
                'is_restricted' => false,
                'folder_scope' => 'general',
                'color' => '#64748B',
            ]);
        }
    }
}
