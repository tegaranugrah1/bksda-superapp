<?php

namespace App\Services;

use Illuminate\Http\UploadedFile;

class SupabaseStorageService
{
    private string $supabaseUrl;
    private string $serviceRoleKey;
    private string $bucket;

    public function __construct()
    {
        $this->supabaseUrl = env('SUPABASE_PROJECT_URL', 'https://xxx.supabase.co');
        $this->serviceRoleKey = env('SUPABASE_SERVICE_ROLE_KEY', '');
        $this->bucket = env('SUPABASE_BUCKET', 'cms');
    }

    public function upload(UploadedFile $file, string $folder = ''): string
    {
        $extension = $file->getClientOriginalExtension();
        $filename = uniqid() . '_' . time() . '.' . $extension;

        $storagePath = $folder ? "{$folder}/{$filename}" : $filename;

        $url = "{$this->supabaseUrl}/storage/v1/object/{$this->bucket}/{$storagePath}";

        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_CUSTOMREQUEST => 'POST',
            CURLOPT_POSTFIELDS => file_get_contents($file->getRealPath()),
            CURLOPT_HTTPHEADER => [
                "Authorization: Bearer {$this->serviceRoleKey}",
                "Content-Type: {$file->getMimeType()}",
                "x-upsert: true",
            ],
            CURLOPT_SSL_VERIFYPEER => false,
            CURLOPT_TIMEOUT => 30,
        ]);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($httpCode < 200 || $httpCode >= 300) {
            throw new \RuntimeException(
                "Supabase upload gagal (HTTP {$httpCode}): {$response}"
            );
        }

        return $storagePath;
    }

    public function delete(string $path): void
    {
        if (!$path) return;

        $url = "{$this->supabaseUrl}/storage/v1/object/{$this->bucket}/{$path}";

        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_CUSTOMREQUEST => 'DELETE',
            CURLOPT_HTTPHEADER => [
                "Authorization: Bearer {$this->serviceRoleKey}",
            ],
            CURLOPT_SSL_VERIFYPEER => false,
            CURLOPT_TIMEOUT => 10,
        ]);

        curl_exec($ch);
        curl_close($ch);
    }

    public static function publicUrl(?string $path): ?string
    {
        if (!$path) return null;

        if (filter_var($path, FILTER_VALIDATE_URL)) {
            return $path;
        }

        $baseUrl = env('SUPABASE_PROJECT_URL', 'https://xxx.supabase.co');
        $bucket = env('SUPABASE_BUCKET', 'cms');
        return "{$baseUrl}/storage/v1/object/public/{$bucket}/{$path}";
    }
}
