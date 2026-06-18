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
        // Mengaktifkan stateful API middleware agar cookie session/CSRF Sanctum aktif untuk SPA
        $middleware->statefulApi();

        // 1. Mendaftarkan Alias (Agar bisa dipanggil di route misal: middleware('role:admin'))
        $middleware->alias([
            'module.access' => CheckModuleAccess::class,
            'role' => CheckRole::class,
            'permission' => \App\Http\Middleware\CheckPermission::class,
        ]);

        // 2. Mendaftarkan Global API Middleware (Berjalan otomatis di seluruh rute /api/*)
        $middleware->api(append: [
            AuditLogMiddleware::class,
        ]);

    })
    ->withExceptions(function (Exceptions $exceptions): void {
        // API error handler: return JSON untuk semua API requests
        $exceptions->render(function (Throwable $e, Request $request) {
            if ($request->is('api/*') || $request->wantsJson()) {
                // 1. ValidationException (422) -> let Laravel handle it (returns {message, errors})
                if ($e instanceof ValidationException) {
                    return null;
                }

                // 2. AuthenticationException (401)
                if ($e instanceof AuthenticationException) {
                    return response()->json([
                        'error' => 'Unauthenticated',
                        'message' => 'Silakan login terlebih dahulu.',
                    ], 401);
                }

                // 3. AuthorizationException or AccessDeniedHttpException (403)
                if ($e instanceof \Illuminate\Auth\Access\AuthorizationException || $e instanceof \Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException) {
                    return response()->json([
                        'error' => 'Forbidden',
                        'message' => $e->getMessage() ?: 'Anda tidak memiliki hak akses (permission) yang cukup untuk melakukan operasi ini.',
                    ], 403);
                }

                // 4. ModelNotFoundException or NotFoundHttpException (404)
                if ($e instanceof \Illuminate\Database\Eloquent\ModelNotFoundException || $e instanceof \Symfony\Component\HttpKernel\Exception\NotFoundHttpException) {
                    return response()->json([
                        'error' => 'Not Found',
                        'message' => 'Resource tidak ditemukan.',
                    ], 404);
                }

                // 5. MethodNotAllowedHttpException (405)
                if ($e instanceof \Symfony\Component\HttpKernel\Exception\MethodNotAllowedHttpException) {
                    return response()->json([
                        'error' => 'Method Not Allowed',
                        'message' => 'Method request tidak diizinkan.',
                    ], 405);
                }

                // 6. Generic HttpExceptionInterface
                if ($e instanceof \Symfony\Component\HttpKernel\Exception\HttpExceptionInterface) {
                    return response()->json([
                        'error' => class_basename($e),
                        'message' => $e->getMessage(),
                    ], $e->getStatusCode());
                }

                // 7. Generic internal server errors (500)
                $statusCode = 500;
                $response = [
                    'error' => 'Server Error',
                    'message' => config('app.debug') ? $e->getMessage() : 'Terjadi kesalahan pada server.',
                ];
                if (config('app.debug')) {
                    $response['trace'] = array_slice($e->getTrace(), 0, 10);
                }
                return response()->json($response, $statusCode);
            }
        });
    })->create();
