<?php

namespace App\Console\Commands;

use Aws\S3\S3Client;
use Illuminate\Console\Command;

class StorageSetupCommand extends Command
{
    protected $signature = 'storage:setup {--audit : Audit existing bucket policy for security} {--drive : Setup private bksda-drive bucket with CORS ExposeHeaders ETag}';
    protected $description = 'Create S3 bucket, set policy, or audit policy for RustFS/S3 storage (Fase 0B.4)';

    public function handle(): int
    {
        if ($this->option('drive')) {
            return $this->setupDriveBucket();
        }

        $disk = config('filesystems.default');

        if ($disk !== 's3') {
            $this->info("Skipped — current disk is '{$disk}', not 's3'.");
            return self::SUCCESS;
        }

        $bucket = config('filesystems.disks.s3.bucket');
        $endpoint = config('filesystems.disks.s3.endpoint');

        $this->info("Connecting to S3 at {$endpoint}...");

        $client = new S3Client([
            'version' => 'latest',
            'region' => config('filesystems.disks.s3.region', 'us-east-1'),
            'endpoint' => $endpoint,
            'use_path_style_endpoint' => true,
            'credentials' => [
                'key' => config('filesystems.disks.s3.key'),
                'secret' => config('filesystems.disks.s3.secret'),
            ],
        ]);

        if ($this->option('audit')) {
            $this->info("Auditing policy for bucket '{$bucket}' (Fase 0B.4)...");
            try {
                $policyRes = $client->getBucketPolicy(['Bucket' => $bucket]);
                $policyJson = (string) $policyRes->get('Policy');
                $decoded = json_decode($policyJson, true);

                if ($decoded == self::publicMediaPolicy($bucket)) {
                    $this->info("✓ Audit PASSED: public media allowlist matches; BMN/documents and bucket listing require authentication.");
                    return self::SUCCESS;
                }
                $this->error('Bucket policy differs from the managed public-media allowlist. Review it before applying storage:setup.');
            } catch (\Throwable $e) {
                $this->warn("Policy check note: {$e->getMessage()}");
            }
            return self::FAILURE;
        }

        // Create bucket
        try {
            $client->createBucket(['Bucket' => $bucket]);
            $this->info("✓ Bucket '{$bucket}' created.");
        } catch (\Throwable $e) {
            if (str_contains($e->getMessage(), 'BucketAlreadyOwnedByYou') || str_contains($e->getMessage(), 'BucketAlreadyExists')) {
                $this->info("✓ Bucket '{$bucket}' already exists.");
            } else {
                $this->error("✗ Failed to create bucket: " . $e->getMessage());
                return self::FAILURE;
            }
        }

        // Keep BMN and documents private even when their object key is known.
        $policy = json_encode(self::publicMediaPolicy($bucket));

        try {
            $client->putBucketPolicy(['Bucket' => $bucket, 'Policy' => $policy]);
            $this->info('✓ Public-media allowlist applied; BMN/documents and bucket listing require authentication.');
        } catch (\Throwable $e) {
            $this->warn("⚠ Could not set bucket policy: " . $e->getMessage());
            return self::FAILURE;
        }

        $this->newLine();
        $this->info("Done! Storage is ready.");
        return self::SUCCESS;
    }

    public static function publicMediaPolicy(string $bucket): array
    {
        return [
            'Version' => '2012-10-17',
            'Statement' => [[
                'Effect' => 'Allow',
                'Principal' => '*',
                'Action' => ['s3:GetObject'],
                'Resource' => array_map(fn (string $path) => "arn:aws:s3:::{$bucket}/{$path}", [
                    'cms/*', 'public/*', 'employees/*/*_profil.*', 'employees/emp-*/foto-profil/*',
                ]),
            ]],
        ];
    }

    protected function setupDriveBucket(): int
    {
        $bucket = config('filesystems.disks.drive.bucket', 'bksda-drive');
        $endpoint = config('filesystems.disks.drive.endpoint');

        $client = new S3Client([
            'version' => 'latest',
            'region' => config('filesystems.disks.drive.region', 'us-east-1'),
            'endpoint' => $endpoint,
            'use_path_style_endpoint' => true,
            'credentials' => [
                'key' => config('filesystems.disks.drive.key'),
                'secret' => config('filesystems.disks.drive.secret'),
            ],
        ]);

        try {
            $client->createBucket(['Bucket' => $bucket]);
            $this->info("✓ Private bucket '{$bucket}' created.");
        } catch (\Throwable $e) {
            if (str_contains($e->getMessage(), 'BucketAlreadyOwnedByYou') || str_contains($e->getMessage(), 'BucketAlreadyExists')) {
                $this->info("✓ Private bucket '{$bucket}' already exists.");
            } else {
                $this->error("✗ Failed to create drive bucket: " . $e->getMessage());
                return self::FAILURE;
            }
        }

        $frontendOrigin = rtrim((string) config('app.frontend_url', env('FRONTEND_URL', '*')), '/');
        $origins = $frontendOrigin && $frontendOrigin !== '*' ? [$frontendOrigin] : ['*'];

        try {
            $client->putBucketCors([
                'Bucket' => $bucket,
                'CORSConfiguration' => [
                    'CORSRules' => [[
                        'AllowedOrigins' => $origins,
                        'AllowedMethods' => ['GET', 'HEAD', 'PUT'],
                        'AllowedHeaders' => ['*'],
                        'ExposeHeaders' => ['ETag'],
                        'MaxAgeSeconds' => 3600,
                    ]],
                ],
            ]);
            $this->info("✓ CORS configured on '{$bucket}' (ExposeHeaders: ETag).");
        } catch (\Throwable $e) {
            $this->warn("⚠ Could not set bucket CORS: " . $e->getMessage());
            return self::FAILURE;
        }

        return self::SUCCESS;
    }
}
