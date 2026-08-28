<?php

namespace App\Modules\Keuangan;

use Illuminate\Support\Facades\Route;
use Illuminate\Support\ServiceProvider;

class KeuanganServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        $this->registerRoutes();
    }

    protected function registerRoutes(): void
    {
        Route::middleware('api')
            ->prefix('api')
            ->group(__DIR__ . '/Routes/api.php');
    }
}
