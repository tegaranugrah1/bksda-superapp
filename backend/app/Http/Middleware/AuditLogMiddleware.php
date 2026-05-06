<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use App\Models\AuditLog;

class AuditLogMiddleware
{
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
        if (!in_array($request->method(), $writeMethods)) {
            return $response; // Jika cuma GET data, jangan dicatat (memenuhi DB)
        }

        // 3. Sensor Data Sensitif (Best Practice Security)
        // Kita tidak mau password user terekam secara plain-text di tabel logs
        $payload = $request->except([
            'password', 
            'password_confirmation', 
            'current_password', 
            'new_password', 
            'token'
        ]);

        // 4. Catat aktivitas ke database menggunakan Eloquent
        AuditLog::create([
            'user_id'     => $request->user()?->id,
            'method'      => $request->method(),
            'url'         => $request->fullUrl(),
            'ip_address'  => $request->ip(),
            'status_code' => $response->getStatusCode(),
            'payload'     => empty($payload) ? null : $payload,
        ]);

        // 5. Kembalikan response ke pengguna
        return $response;
    }
}
