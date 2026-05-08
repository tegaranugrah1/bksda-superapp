<?php

use App\Providers\AppServiceProvider;
use App\Modules\Kepegawaian\Providers\KepegawaianServiceProvider;
use App\Modules\SuratTugas\SuratTugasServiceProvider;
use App\Modules\Inventory\InventoryServiceProvider;

return [
    AppServiceProvider::class,
    KepegawaianServiceProvider::class,
    SuratTugasServiceProvider::class,
    InventoryServiceProvider::class,
];
