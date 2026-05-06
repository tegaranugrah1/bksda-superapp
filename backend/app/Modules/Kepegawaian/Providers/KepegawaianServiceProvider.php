<?php

namespace App\Modules\Kepegawaian\Providers;

use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Facades\Route;

class KepegawaianServiceProvider extends ServiceProvider
{
    /**
     * Dijalankan untuk meregistrasi bindings di memori (IOC container).
     */
    public function register(): void
    {
        //
    }

    /**
     * Dijalankan terakhir, untuk menghubungkan modul (seperti route, views, migration).
     */
    public function boot(): void
    {
        $this->registerRoutes();
    }

    /**
     * Daftarkan routing API khusus modul ini (Sesuai Rule 8.3).
     * Semua endpoint di modul ini tak perlu ditulis prefix-nya lagi, sudah diurus otomatis.
     */
    protected function registerRoutes(): void
    {
        $routePath = base_path('app/Modules/Kepegawaian/Routes/api.php');

        if (file_exists($routePath)) {
            Route::prefix('api/kepegawaian')
                ->middleware('api') // Membawa serta perlindungan dasar API seperti JSON & log
                ->group($routePath);
        }
    }
}
