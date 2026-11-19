<?php

namespace Tests\Unit;

use App\Console\Commands\StorageSetupCommand;
use PHPUnit\Framework\TestCase;

class StorageBucketPolicyTest extends TestCase
{
    public function test_only_public_media_can_be_read_without_authentication(): void
    {
        $policy = StorageSetupCommand::publicMediaPolicy('dummy-bucket');
        $statement = $policy['Statement'][0];
        $this->assertSame(['s3:GetObject'], $statement['Action']);
        $this->assertSame('*', $statement['Principal']);
        $this->assertSame('Allow', $statement['Effect']);
        $allows = fn (string $key): bool => (bool) array_filter($statement['Resource'],
            fn (string $pattern) => fnmatch($pattern, 'arn:aws:s3:::dummy-bucket/'.$key));

        foreach (['cms/public.jpg', 'public/logo.png', 'employees/dummy/dummy_profil.jpg', 'employees/emp-17/foto-profil/dummy.png'] as $key) {
            $this->assertTrue($allows($key), $key);
        }
        foreach ([
            'bmn-photos/dummy/dummy_geotag.jpg', 'bmn-photos/dummy/dummy_bpkb_1.jpg',
            'bmn/assets/dummy/bpkb/document.pdf', 'bmn/power-of-attorneys/ktp/dummy.jpg',
            'private/bmn-documents/dummy/stnk.jpg', 'private/kepegawaian/dummy.pdf',
            'private/cms/config.json', 'surat-tugas/dummy.pdf', 'employees/dummy/ktp.jpg',
        ] as $key) {
            $this->assertFalse($allows($key), $key);
        }
    }
}
