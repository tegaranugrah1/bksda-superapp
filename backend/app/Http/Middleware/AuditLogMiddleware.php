<?php

namespace App\Http\Middleware;

use App\Models\AuditLog;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Symfony\Component\HttpFoundation\Response;

class AuditLogMiddleware
{
    private const MAX_STRING_LENGTH = 1000;
    private const MAX_ARRAY_ITEMS = 50;

    private const SENSITIVE_KEYS = [
        'password',
        'password_confirmation',
        'current_password',
        'new_password',
        'token',
        'access_token',
        'refresh_token',
        'authorization',
        'api_key',
        'secret',
    ];

    /**
     * Handle an incoming request.
     */
    public function handle(Request $request, Closure $next): Response
    {
        // 1. Biarkan proses Laravel (Controller, dll) berjalan sampai selesai
        //    Ini disebut pola "Post-Middleware"
        $response = $next($request);

        // 2. Filter: Hanya catat log untuk metode yang memanipulasi data
        $writeMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];
        if (! in_array($request->method(), $writeMethods)) {
            return $response; // Jika cuma GET data, jangan dicatat (memenuhi DB)
        }

        // 3. Sensor Data Sensitif (Best Practice Security)
        // Kita tidak mau password, token, atau isi file terekam secara mentah di tabel logs.
        $payload = $this->sanitizePayload($request->all());

        // 4. Catat aktivitas ke database menggunakan Eloquent
        AuditLog::create([
            'user_id' => $request->user()?->id,
            'method' => $request->method(),
            'url' => $request->fullUrl(),
            'ip_address' => $request->ip(),
            'status_code' => $response->getStatusCode(),
            'payload' => empty($payload) ? null : $payload,
        ]);

        // 5. Kembalikan response ke pengguna
        return $response;
    }

    /**
     * Keep audit logs useful without storing secrets, raw files, or huge payloads.
     */
    private function sanitizePayload(mixed $value): mixed
    {
        if ($value instanceof UploadedFile) {
            return [
                '_type' => 'uploaded_file',
                'name' => $value->getClientOriginalName(),
                'mime' => $value->getClientMimeType(),
                'extension' => $value->getClientOriginalExtension(),
                'size' => $value->getSize(),
            ];
        }

        if (is_array($value)) {
            $sanitized = [];
            $index = 0;

            foreach ($value as $key => $item) {
                if ($index >= self::MAX_ARRAY_ITEMS) {
                    $sanitized['_truncated'] = true;
                    break;
                }

                $normalizedKey = strtolower((string) $key);
                if ($this->isSensitiveKey($normalizedKey)) {
                    $sanitized[$key] = '[redacted]';
                } else {
                    $sanitized[$key] = $this->sanitizePayload($item);
                }

                $index++;
            }

            return $sanitized;
        }

        if (is_string($value) && strlen($value) > self::MAX_STRING_LENGTH) {
            return substr($value, 0, self::MAX_STRING_LENGTH).'...[truncated]';
        }

        if (is_scalar($value) || $value === null) {
            return $value;
        }

        return '['.get_debug_type($value).']';
    }

    private function isSensitiveKey(string $key): bool
    {
        foreach (self::SENSITIVE_KEYS as $sensitiveKey) {
            if (str_contains($key, $sensitiveKey)) {
                return true;
            }
        }

        return false;
    }
}
