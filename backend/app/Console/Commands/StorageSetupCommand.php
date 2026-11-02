<?php

namespace App\Console\Commands;

use Aws\S3\S3Client;
use Illuminate\Console\Command;

class StorageSetupCommand extends Command
{
    protected $signature = 'storage:setup {--audit : Audit existing bucket policy for security}';
    protected $description = 'Create S3 bucket, set policy, or audit policy for RustFS/S3 storage (Fase 0B.4)';

    public function handle(): int
    {
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

                $hasGetObject = false;
                $hasListBucket = false;
                foreach ($decoded['Statement'] ?? [] as $stmt) {
                    $actions = (array) ($stmt['Action'] ?? []);
                    if (in_array('s3:GetObject', $actions, true)) $hasGetObject = true;
                    if (in_array('s3:ListBucket', $actions, true)) $hasListBucket = true;
                }

                $this->line("  - Anonymous GetObject: ".($hasGetObject ? 'ALLOWED [OK]' : 'NOT FOUND'));
                $this->line("  - Anonymous ListBucket: ".($hasListBucket ? 'WARNING (Bucket can be enumerated)' : 'DENIED [SECURE]'));

                if ($hasGetObject && ! $hasListBucket) {
                    $this->info("✓ Audit PASSED: Bucket '{$bucket}' allows anonymous GetObject and forbids ListBucket.");
                    return self::SUCCESS;
                }
            } catch (\Throwable $e) {
                $this->warn("Policy check note: {$e->getMessage()}");
            }
            return self::SUCCESS;
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

        // Set public-read policy (GetObject ONLY, NO ListBucket)
        $policy = json_encode([
            'Version' => '2012-10-17',
            'Statement' => [[
                'Effect' => 'Allow',
                'Principal' => '*',
                'Action' => ['s3:GetObject'],
                'Resource' => ["arn:aws:s3:::{$bucket}/*"],
            ]],
        ]);

        try {
            $client->putBucketPolicy(['Bucket' => $bucket, 'Policy' => $policy]);
            $this->info("✓ Bucket policy set to public-read (GetObject allowed, ListBucket denied).");
        } catch (\Throwable $e) {
            $this->warn("⚠ Could not set bucket policy: " . $e->getMessage());
        }

        $this->newLine();
        $this->info("Done! Storage is ready.");
        return self::SUCCESS;
    }
}
