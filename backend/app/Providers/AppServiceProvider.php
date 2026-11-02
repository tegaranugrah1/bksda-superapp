<?php

namespace App\Providers;

use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Auth\Notifications\VerifyEmail;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Mail\Events\MessageSent;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\Str;
use Illuminate\Support\ServiceProvider;
use App\Listeners\LogSentEmail;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        RateLimiter::for('login', function (Request $request) {
            $username = Str::lower((string) $request->input('username'));

            return Limit::perMinute(5)->by($username.'|'.$request->ip());
        });

        // Signed URL untuk verifikasi email pegawai (mengutamakan PUBLIC_APP_URL agar bisa dibuka di HP)
        VerifyEmail::createUrlUsing(function ($notifiable) {
            $rootUrl = env('PUBLIC_APP_URL') ?: config('app.url');
            if ($rootUrl) {
                URL::forceRootUrl(rtrim($rootUrl, '/'));
                if (str_starts_with($rootUrl, 'https://')) {
                    URL::forceScheme('https');
                }
            }
            return URL::temporarySignedRoute(
                'verification.verify',
                now()->addMinutes(60),
                [
                    'id' => $notifiable->getKey(),
                    'hash' => sha1($notifiable->getEmailForVerification()),
                ]
            );
        });

        // Link reset password mandiri yang mengarah langsung ke frontend Next.js
        ResetPassword::createUrlUsing(function ($user, string $token) {
            $frontendUrl = rtrim(config('app.frontend_url') ?: config('app.url', 'http://localhost:3000'), '/');
            return "{$frontendUrl}/reset-password?token={$token}&email=".urlencode((string) $user->email);
        });

        // Audit log pengiriman email
        Event::listen(MessageSent::class, LogSentEmail::class);
    }
}
