<?php

namespace App\Modules\Bmn;

use Illuminate\Support\Facades\Route;
use Illuminate\Support\ServiceProvider;

class BmnServiceProvider extends ServiceProvider
{
    public function register(): void {}

    public function boot(): void
    {
        $this->loadMigrationsFrom(__DIR__.'/Migrations');

        Route::middleware(['api', 'auth:sanctum', 'module.access:bmn'])
            ->prefix('api/bmn')
            ->group(__DIR__.'/Routes/api.php');
    }
}
