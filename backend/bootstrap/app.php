<?php

use App\Http\Middleware\AuditLogMiddleware;
use App\Http\Middleware\CheckModuleAccess;
use App\Http\Middleware\CheckRole;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {

        // 1. Mendaftarkan Alias (Agar bisa dipanggil di route misal: middleware('role:admin'))
        $middleware->alias([
            'module.access' => CheckModuleAccess::class,
            'role' => CheckRole::class,
        ]);

        // 2. Mendaftarkan Global API Middleware (Berjalan otomatis di seluruh rute /api/*)
        // Kita masukkan AuditLog ke grup 'api' agar kita tidak pernah lupa me-log aktivitas
        $middleware->api(append: [
            AuditLogMiddleware::class,
        ]);

    })
    ->withExceptions(function (Exceptions $exceptions): void {
        // API error handler: return JSON untuk semua API requests
        $exceptions->render(function (Throwable $e, Request $request) {
            if ($request->is('api/*') || $request->wantsJson()) {
                // Biarkan ValidationException lewat (422 dengan field errors)
                if ($e instanceof ValidationException) {
                    return null;
                }

                // Biarkan AuthenticationException return 401
                if ($e instanceof AuthenticationException) {
                    return response()->json([
                        'error' => 'Unauthenticated',
                        'message' => 'Silakan login terlebih dahulu.',
                    ], 401);
                }

                // Production: sembunyikan detail error 500
                if (! config('app.debug')) {
                    $status = method_exists($e, 'getStatusCode')
                        ? $e->getStatusCode()
                        : 500;

                    if ($status >= 500) {
                        return response()->json([
                            'error' => 'Server Error',
                            'message' => 'Terjadi kesalahan pada server.',
                        ], 500);
                    }
                }
            }
        });
    })->create();
