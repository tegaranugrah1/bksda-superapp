<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

$employees = App\Modules\Kepegawaian\Models\Employee::all()->toJson();
file_put_contents('employees_export.json', $employees);
echo "Exported " . App\Modules\Kepegawaian\Models\Employee::count() . " employees\n";
