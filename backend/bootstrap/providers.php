<?php

use App\Modules\Bmn\BmnServiceProvider;
use App\Modules\CMS\Providers\CMSServiceProvider;
use App\Modules\DeReporting\Providers\DeReportingServiceProvider;
use App\Modules\Inventory\InventoryServiceProvider;
use App\Modules\Kepegawaian\Providers\KepegawaianServiceProvider;
use App\Modules\SuratTugas\SuratTugasServiceProvider;
use App\Providers\AppServiceProvider;

return [
    AppServiceProvider::class,
    KepegawaianServiceProvider::class,
    SuratTugasServiceProvider::class,
    InventoryServiceProvider::class,
    BmnServiceProvider::class,
    DeReportingServiceProvider::class,
    CMSServiceProvider::class,
];
