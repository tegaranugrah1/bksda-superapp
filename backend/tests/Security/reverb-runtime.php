<?php
// Build/runtime prerequisite check; no application bootstrap, network or database.
require dirname(__DIR__, 2).'/vendor/autoload.php';

if (!extension_loaded('pcntl') || !defined('SIGINT') || !defined('SIGTERM') || !defined('SIGTSTP')
    || !function_exists('pcntl_signal') || !function_exists('pcntl_async_signals')) {
    fwrite(STDERR, "Reverb CLI requires pcntl and POSIX signal support.\n");
    exit(1);
}
$signals = (new Laravel\Reverb\Servers\Reverb\Console\Commands\StartServer)->getSubscribedSignals();
if (!in_array(SIGINT, $signals, true) || !in_array(SIGTERM, $signals, true)) {
    fwrite(STDERR, "Native Reverb signal subscriptions are unavailable.\n");
    exit(1);
}
echo "PASS: pcntl, POSIX constants and native Reverb signal subscriptions available.\n";
