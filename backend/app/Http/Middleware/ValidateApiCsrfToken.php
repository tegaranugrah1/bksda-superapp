<?php

namespace App\Http\Middleware;

use Illuminate\Foundation\Http\Middleware\ValidateCsrfToken;

class ValidateApiCsrfToken extends ValidateCsrfToken
{
    /**
     * Cookie-authenticated stateful browser mutations still enforce CSRF.
     * Pre-auth, webhook, public submission, and Bearer-authenticated API requests bypass CSRF.
     *
     * @var array<int, string>
     */
    protected $except = [
        'sanctum/csrf-cookie',
        'login',
        'logout',
        'api/login',
        'api/login/2fa',
        'api/forgot-password',
        'api/reset-password',
        'api/webhooks/*',
        'api/drive/s/*/download',
        'api/surat-tugas/check-conflicts',
        'api/surat-tugas/submit',
        'api/dereporting/eksternals/public',
        'api/dereporting/public-forms/*/submit',
        'api/agent/*',
    ];

    protected function inExceptArray($request)
    {
        if ($request->bearerToken() !== null) {
            return true;
        }

        return parent::inExceptArray($request);
    }
}
