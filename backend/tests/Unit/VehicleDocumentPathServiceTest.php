<?php

namespace Tests\Unit;

use App\Modules\Bmn\Models\Asset;
use App\Modules\Bmn\Services\VehicleDocumentPathService;
use Tests\TestCase;

class VehicleDocumentPathServiceTest extends TestCase
{
    public function test_it_builds_human_readable_vehicle_document_paths(): void
    {
        $asset = new Asset([
            'id' => '019eabcd-1234-5678-9012-abcdefabcdef',
            'jenis_bmn' => 'ALAT ANGKUTAN BERMOTOR',
            'nup' => '123',
            'no_polisi' => 'KT 1234 AB',
        ]);

        $service = new VehicleDocumentPathService;
        $path = $service->documentPath($asset, 'bpkb', 'pdf');

        $this->assertStringStartsWith(
            'bmn/assets/ALAT-ANGKUTAN-BERMOTOR-123-019EABCD/bpkb/BPKB-KT-1234-AB-',
            $path
        );
        $this->assertStringEndsWith('.pdf', $path);
    }

    public function test_it_uses_fallback_segments_when_vehicle_metadata_is_empty(): void
    {
        $asset = new Asset([
            'id' => '019eabcd-1234-5678-9012-abcdefabcdef',
        ]);

        $service = new VehicleDocumentPathService;

        $this->assertStringStartsWith(
            'bmn/assets/ASET-TANPA-NUP-019EABCD/stnk/STNK-TANPA-NOPOL-',
            $service->documentPath($asset, 'stnk', 'pdf')
        );
    }
}
