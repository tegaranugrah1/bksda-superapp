<?php

use App\Providers\AppServiceProvider;
use App\Modules\Kepegawaian\Providers\KepegawaianServiceProvider;
use App\Modules\SuratTugas\SuratTugasServiceProvider;
use App\Modules\Inventory\InventoryServiceProvider;
use App\Modules\Bmn\BmnServiceProvider;

return [
    AppServiceProvider::class,
    KepegawaianServiceProvider::class,
    SuratTugasServiceProvider::class,
    InventoryServiceProvider::class,
    BmnServiceProvider::class,
];
