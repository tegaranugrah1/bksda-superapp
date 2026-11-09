<?php

namespace App\Modules\Agent\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class RestrictAgentClientIp
{
    /**
     * Handle an incoming request.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $allowedIps = config('services.agent.allowed_ips', [
            '192.168.100.205',
            '192.168.100.203',
            '192.168.100.183',
            '127.0.0.1',
            '::1',
        ]);

        $internalKey = config('services.agent.internal_key');
        $providedKey = $request->header('X-Agent-Internal-Key') ?? $request->bearerToken();

        // This allowlist trusts the socket peer; forwarded headers are client input.
        $clientIp = $request->server('REMOTE_ADDR');

        // Allow if IP is whitelisted OR if valid internal secret key is provided (e.g. for reverse-proxy / test)
        $isIpAllowed = in_array($clientIp, $allowedIps, true);
        $isKeyValid = is_string($internalKey) && $internalKey !== ''
            && !empty($providedKey) && hash_equals($internalKey, (string) $providedKey);

        if (!$isIpAllowed && !$isKeyValid) {
            return response()->json([
                'status' => 'error',
                'message' => 'Akses ditolak: IP klien atau token agen internal tidak valid.',
            ], 403);
        }

        return $next($request);
    }
}
