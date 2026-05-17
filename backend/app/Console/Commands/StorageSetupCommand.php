<?php

namespace App\Console\Commands;

use Aws\S3\S3Client;
use Illuminate\Console\Command;

class StorageSetupCommand extends Command
{
    protected $signature = 'storage:setup';
    protected $description = 'Create S3 bucket and set public-read policy for RustFS/S3 storage';

    public function handle(): int
    {
        $disk = config('filesystems.default');

        if ($disk !== 's3') {
            $this->info("Skipped — current disk is '{$disk}', not 's3'.");
            return self::SUCCESS;
        }

        $bucket = config('filesystems.disks.s3.bucket');
        $endpoint = config('filesystems.disks.s3.endpoint');

        $this->info("Setting up S3 bucket '{$bucket}' at {$endpoint}...");

        $client = new S3Client([
            'version' => 'latest',
            'region' => config('filesystems.disks.s3.region'),
            'endpoint' => $endpoint,
            'use_path_style_endpoint' => true,
            'credentials' => [
                'key' => config('filesystems.disks.s3.key'),
                'secret' => config('filesystems.disks.s3.secret'),
            ],
        ]);

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

        // Set public-read policy
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
            $this->info("✓ Bucket policy set to public-read.");
        } catch (\Throwable $e) {
            $this->warn("⚠ Could not set bucket policy: " . $e->getMessage());
        }

        $this->newLine();
        $this->info("Done! Storage is ready.");
        return self::SUCCESS;
    }
}
