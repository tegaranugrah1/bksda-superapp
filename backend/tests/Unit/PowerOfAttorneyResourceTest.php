<?php

namespace Tests\Unit;

use App\Modules\Bmn\Models\PowerOfAttorney;
use App\Modules\Bmn\Resources\PowerOfAttorneyResource;
use Tests\TestCase;

class PowerOfAttorneyResourceTest extends TestCase
{
    public function test_it_keeps_history_response_alive_when_ktp_url_cannot_be_generated(): void
    {
        config([
            'filesystems.default' => 's3',
            'filesystems.disks.s3.bucket' => null,
            'filesystems.disks.s3.endpoint' => null,
            'filesystems.disks.s3.url' => null,
        ]);

        $agreement = new PowerOfAttorney([
            'id' => '00000000-0000-0000-0000-000000000000',
            'employee_id' => 129,
            'number' => 'KS.TEST/K.18/TU/KAP.03.02/B/06/2026',
            'kap' => 'KAP.03.02',
            'document_date' => '2026-06-22',
            'first_party_snapshot' => ['name' => 'Pemberi Kuasa'],
            'second_party_snapshot' => ['name' => 'Penerima Kuasa'],
            'assets_snapshot' => [],
            'asset_ids' => [],
            'ktp_path' => 'bmn/power-of-attorneys/ktp/KTP-TEST.jpg',
        ]);

        $payload = (new PowerOfAttorneyResource($agreement))->resolve(request());

        $this->assertSame('bmn/power-of-attorneys/ktp/KTP-TEST.jpg', $payload['ktp_path']);
        $this->assertNull($payload['ktp_url']);
    }
}
