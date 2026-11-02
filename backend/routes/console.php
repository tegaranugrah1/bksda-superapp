<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Jadwal Pemeliharaan & Monitoring Infrastruktur (Fase 0B.5 & Fase 2.7)
Illuminate\Support\Facades\Schedule::command('app:monitor-health')->everyFiveMinutes()->withoutOverlapping();
Illuminate\Support\Facades\Schedule::command('drive:cleanup-uploads')->hourly()->withoutOverlapping();
Illuminate\Support\Facades\Schedule::command('drive:purge-trash')->dailyAt('02:00')->withoutOverlapping();
