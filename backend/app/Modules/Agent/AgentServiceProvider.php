<?php

namespace App\Modules\Agent;

use Illuminate\Support\Facades\Route;
use Illuminate\Support\ServiceProvider;

class AgentServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        //
    }

    public function boot(): void
    {
        Route::prefix('api/agent/v1')
            ->middleware(['api', \App\Modules\Agent\Middleware\RestrictAgentClientIp::class])
            ->group(__DIR__ . '/Routes/api.php');
    }
}
