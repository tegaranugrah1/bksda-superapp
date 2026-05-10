<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class CleanupBidangSeeder extends Seeder
{
    public function run()
    {
        // Define the mapping from Old Name (or pattern) to New Name
        // We will find the ID of the New Name, and update all records pointing to Old Names to this New ID.
        // Then delete Old Names.

        $mapping = [
            'PEMEGANG IZIN TSL' => [
                'Pemegang Izin Pemanfaatan TSL and Jasling',
                'Pemegang Izin Pemanfaatan TSL dan Jasling', // just in case
            ],
            'KERJASAMA TSL' => [
                'Perjanjian Kerjasama',
            ],
            'DATA TSL' => [
                'Data TSL diluar Kawasan Konservasi',
                'Data TSL Luar Kawasan',
            ],
            'LAIN-LAIN' => [
                'Lain - Lain',
                'Lain-Lain',
            ],
        ];

        foreach ($mapping as $targetName => $oldNames) {
            // Find target ID
            $target = DB::table('dr_bidangs')->where('bidang', $targetName)->first();

            if (! $target) {
                echo "Target '$targetName' not found. Skipping.\n";

                continue;
            }

            $targetId = $target->id;
            echo "Target '$targetName' found with ID: $targetId\n";

            foreach ($oldNames as $oldName) {
                $old = DB::table('dr_bidangs')->where('bidang', $oldName)->get();

                foreach ($old as $o) {
                    echo "  Merging '$o->bidang' (ID: $o->id) -> '$targetName' (ID: $targetId)\n";

                    // Update external reports
                    DB::table('dr_ekternals')
                        ->where('bidang_id', $o->id)
                        ->update(['bidang_id' => $targetId]);

                    // Delete old bidang
                    DB::table('dr_bidangs')->where('id', $o->id)->delete();
                }
            }
        }

        echo "Bidang cleanup complete.\n";
    }
}
