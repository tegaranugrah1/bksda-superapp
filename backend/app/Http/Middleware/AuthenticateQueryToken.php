<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class AuthenticateQueryToken
{
    /**
     * Handle an incoming request.
     * If request contains ?token= query parameter and no Authorization header,
     * inject it into Authorization header as Bearer token for Sanctum authentication.
     */
    public function handle(Request $request, Closure $next)
    {
        if (! $request->headers->has('Authorization') && $request->filled('token') && $this->allowsQueryToken($request)) {
            $token = urldecode((string) $request->query('token'));
            $request->headers->set('Authorization', 'Bearer ' . $token);
        }

        return $next($request);
    }

    private function allowsQueryToken(Request $request): bool
    {
        if (! in_array($request->method(), ['GET', 'HEAD'], true)) {
            return false;
        }

        return $request->is(
            'api/bmn/assets/*/photo/*/view',
            'api/bmn/assets/*/photo/*/download',
            'api/bmn/assets/*/document/*/view',
            'api/bmn/assets/*/document/*/preview',
            'api/bmn/assets/*/document/*/preview/*',
            'api/bmn/assets/*/document/*/download',
            'api/bmn/power-of-attorneys/*/ktp',
        );
    }
}
