<?php

require __DIR__ . '/../vendor/autoload.php';

// Self-check for departure & lampiran configuration merging logic
function mergeSnapshotConfig(?array $baseSnapshot, ?array $reqSnapshot): array {
    $baseConfig = $baseSnapshot['configuration'] ?? [];
    $reqConfig = $reqSnapshot['configuration'] ?? [];
    if (is_array($reqConfig)) {
        $baseSnapshot['configuration'] = array_merge($baseConfig, $reqConfig);
    }
    return $baseSnapshot ?? $reqSnapshot ?? [];
}

// Case 1: Beda Hari with custom departures
$base = [
    'code' => 'beda-hari',
    'configuration' => ['default_city' => 'Samarinda']
];
$client = [
    'configuration' => [
        'show_departure_column' => true,
        'employee_departures' => ['1' => 'Samarinda', '2' => 'Balikpapan'],
        'employee_dates' => ['1' => ['mulai' => '2026-10-01', 'selesai' => '2026-10-03']]
    ]
];
$merged = mergeSnapshotConfig($base, $client);
assert($merged['configuration']['show_departure_column'] === true, 'show_departure_column must be true');
assert($merged['configuration']['employee_departures']['2'] === 'Balikpapan', 'departures must be preserved');
assert($merged['configuration']['default_city'] === 'Samarinda', 'base config must be preserved');

// Case 2: Non-Beda Hari, enable_lampiran = false (default)
$baseStandard = [
    'code' => 'standard',
    'configuration' => []
];
$clientNoLampiran = [
    'configuration' => [
        'enable_lampiran' => false,
        'show_departure_column' => false,
    ]
];
$mergedStandard = mergeSnapshotConfig($baseStandard, $clientNoLampiran);
assert($mergedStandard['configuration']['enable_lampiran'] === false, 'enable_lampiran must be false');
assert($mergedStandard['configuration']['show_departure_column'] === false, 'show_departure_column must be false');

// Case 3: Non-Beda Hari, user explicitly enabled lampiran
$clientWithLampiran = [
    'configuration' => [
        'enable_lampiran' => true,
        'show_departure_column' => true,
        'employee_departures' => ['1' => 'Samarinda', '2' => 'Tenggarong']
    ]
];
$mergedCustom = mergeSnapshotConfig($baseStandard, $clientWithLampiran);
assert($mergedCustom['configuration']['enable_lampiran'] === true, 'enable_lampiran must be true');
assert($mergedCustom['configuration']['show_departure_column'] === true, 'show_departure_column must be true');
assert($mergedCustom['configuration']['employee_departures']['2'] === 'Tenggarong', 'departures must be preserved');

echo "PASS: departure_column_check assertions passed!\n";
