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
        if (! $request->headers->has('Authorization') && $request->filled('token')) {
            $token = urldecode((string) $request->query('token'));
            $request->headers->set('Authorization', 'Bearer ' . $token);
        }

        return $next($request);
    }
}
