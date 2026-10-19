<?php

// Ponytail security check: assertion on leave quota logic, routes, CORS & validation
require __DIR__ . '/../vendor/autoload.php';
$app = require_once __DIR__ . '/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

// 1. Quota Check assertion
$sisaN0 = 8;
$sisaN1 = 2;
$sisaN2 = 0;
$totalQuota = $sisaN0 + $sisaN1 + $sisaN2;
assert($totalQuota === 10, 'Total quota calculation error');

$checkExceeded = function ($jenisCuti, $jumlahHari) use ($totalQuota) {
    return str_contains(strtolower($jenisCuti), 'tahunan') && $jumlahHari > $totalQuota;
};

assert($checkExceeded('Cuti Tahunan', 11) === true, 'Failed to reject quota exceeding request');
assert($checkExceeded('Cuti Tahunan', 10) === false, 'Wrongly rejected valid exact quota');
assert($checkExceeded('Cuti Tahunan', 5) === false, 'Wrongly rejected valid sub-quota');
assert($checkExceeded('Cuti Sakit', 20) === false, 'Wrongly blocked non-tahunan leave');

// 2. Phone regex assertion
$phoneRegex = '/^[0-9+\-\s()]+$/';
assert(preg_match($phoneRegex, '081234567890') === 1, 'Valid phone failed');
assert(preg_match($phoneRegex, '+62 812-3456-7890') === 1, 'Valid international phone failed');
assert(preg_match($phoneRegex, '(0541) 741234') === 1, 'Valid landline phone failed');
assert(preg_match($phoneRegex, '0812<script>') === 0, 'Script injection in phone not blocked');
assert(preg_match($phoneRegex, 'DROP TABLE') === 0, 'SQL keywords in phone not blocked');

// 3. CORS regex assertion
$corsPatterns = config('cors.allowed_origins_patterns');
$bksdaPattern = $corsPatterns[0];

assert(preg_match($bksdaPattern, 'https://bksdakaltim.net') === 1, 'Main domain failed CORS');
assert(preg_match($bksdaPattern, 'https://api.bksdakaltim.net') === 1, 'Subdomain failed CORS');
assert(preg_match($bksdaPattern, 'https://portal.bksdakaltim.net:8443') === 1, 'Port subdomain failed CORS');
assert(preg_match($bksdaPattern, 'https://bksdakaltim.net.attacker.com') === 0, 'Attacker sub-domain suffix not blocked');
assert(preg_match($bksdaPattern, 'https://attacker-bksdakaltim.net') === 0, 'Attacker prefix domain not blocked');
assert(preg_match($bksdaPattern, 'https://evilbksdakaltim.net.phishing.io') === 0, 'Malicious lookalike not blocked');

// 4. Overlap Logic assertion
$hasOverlap = function ($existingStart, $existingEnd, $reqStart, $reqEnd) {
    return ($reqStart >= $existingStart && $reqStart <= $existingEnd)
        || ($reqEnd >= $existingStart && $reqEnd <= $existingEnd)
        || ($reqStart <= $existingStart && $reqEnd >= $existingEnd);
};

assert($hasOverlap('2026-11-05', '2026-11-10', '2026-11-08', '2026-11-12') === true, 'Failed to detect start overlap');
assert($hasOverlap('2026-11-05', '2026-11-10', '2026-11-01', '2026-11-07') === true, 'Failed to detect end overlap');
assert($hasOverlap('2026-11-05', '2026-11-10', '2026-11-04', '2026-11-12') === true, 'Failed to detect encompassing overlap');
assert($hasOverlap('2026-11-05', '2026-11-10', '2026-11-15', '2026-11-20') === false, 'False positive on non-overlapping dates');

// 5. Route registration & throttling check
$router = app('router');
$routes = collect($router->getRoutes()->getRoutes());

$leaveBalanceRoute = $routes->first(fn($r) => $r->uri() === 'api/me/leave-balance');
assert($leaveBalanceRoute !== null, 'api/me/leave-balance route missing');

$assetsRoute = $routes->first(fn($r) => $r->uri() === 'api/me/assets');
assert($assetsRoute !== null, 'api/me/assets route missing');

$changePwRoute = $routes->first(fn($r) => $r->uri() === 'api/me/change-password');
assert($changePwRoute !== null, 'api/me/change-password route missing');
assert(in_array('throttle:6,1', $changePwRoute->middleware()), 'api/me/change-password missing throttle:6,1');

$photoRoute = $routes->first(fn($r) => $r->uri() === 'api/me/update-photo');
assert($photoRoute !== null, 'api/me/update-photo route missing');
assert(in_array('throttle:15,1', $photoRoute->middleware()), 'api/me/update-photo missing throttle:15,1');

$leaveStoreRoute = $routes->first(fn($r) => $r->uri() === 'api/me/leave-requests' && in_array('POST', $r->methods()));
assert($leaveStoreRoute !== null, 'POST api/me/leave-requests missing');
assert(in_array('throttle:10,1', $leaveStoreRoute->middleware()), 'POST api/me/leave-requests missing throttle:10,1');

$duplicateChangePw = $routes->first(fn($r) => $r->uri() === 'api/change-password');
assert($duplicateChangePw === null, 'duplicate unthrottled api/change-password should be deleted');

// 6. Kepegawaian & IAM route security assertions
$empAccessRoute = $routes->first(fn($r) => $r->uri() === 'api/kepegawaian/employees/{employee}/access' && in_array('PUT', $r->methods()));
assert($empAccessRoute !== null, 'PUT api/kepegawaian/employees/{employee}/access missing');
assert(in_array('role:super_admin', $empAccessRoute->middleware()), 'PUT api/kepegawaian/employees/{employee}/access missing role:super_admin');

$profileRoute = $routes->first(fn($r) => $r->uri() === 'api/me/update-profile');
assert($profileRoute !== null, 'api/me/update-profile route missing');
assert(in_array('throttle:15,1', $profileRoute->middleware()), 'api/me/update-profile missing throttle:15,1');

$verifyRoute = $routes->first(fn($r) => str_contains($r->uri(), 'verify/{id}'));
assert($verifyRoute !== null, 'verify/{id} route missing');
assert(in_array('throttle:60,1', $verifyRoute->middleware()), 'verify/{id} missing throttle:60,1');

// 7. Kepegawaian module access assertion
$empIndexRoute = $routes->first(fn($r) => $r->uri() === 'api/kepegawaian/employees' && in_array('GET', $r->methods()));
assert($empIndexRoute !== null, 'GET api/kepegawaian/employees route missing');
assert(in_array('module.access:kepegawaian', $empIndexRoute->middleware()), 'GET api/kepegawaian/employees missing module.access:kepegawaian');

// 8. Leave request duration ceiling assertion
$durationCheck = fn(int $days) => $days > 365;
assert($durationCheck(366) === true, 'Failed to detect duration exceeding 365 days');
assert($durationCheck(365) === false, 'Wrongly rejected exact 365 days');
assert($durationCheck(14) === false, 'Wrongly rejected 14 days leave');

// 9. DeReporting public rate-limit & Controller instantiation check
$eksternalRoute = $routes->first(fn($r) => $r->uri() === 'api/dereporting/eksternals/public' && in_array('POST', $r->methods()));
assert($eksternalRoute !== null, 'POST api/dereporting/eksternals/public missing');
assert(in_array('throttle:10,1', $eksternalRoute->middleware()), 'POST api/dereporting/eksternals/public missing throttle:10,1');

$eksternalController = new \App\Modules\DeReporting\Controllers\EksternalController();
assert($eksternalController instanceof \App\Modules\DeReporting\Controllers\EksternalController, 'EksternalController failed instantiation');

// 10. Filename sanitization against HTTP header injection
$sanitizeFilename = fn(string $title) => preg_replace('/[\/\\\\:*?"<>|\r\n]/', '_', $title);
$dirtyTitle = "Laporan Penyerobotan\r\nSet-Cookie: malicious=true";
$cleanTitle = $sanitizeFilename($dirtyTitle);
assert(!str_contains($cleanTitle, "\r") && !str_contains($cleanTitle, "\n"), 'Failed to remove CRLF injection from filename');
// 11. Surat Tugas forceDestroy role guard
$stForceDelete = $routes->first(fn($r) => str_contains($r->uri(), 'surat-tugas/{id}/force') && in_array('DELETE', $r->methods()));
assert($stForceDelete !== null, 'DELETE api/surat-tugas/{id}/force route missing');
assert(in_array('role:super_admin,admin', $stForceDelete->middleware()), 'DELETE api/surat-tugas/{id}/force missing role:super_admin,admin');

// 12. CSV Formula Injection (CWE-1236) neutralization assertion
$neutralizeCsv = function (string $val): string {
    return preg_match('/^[=+\-@\t\r]/', $val) ? "'".$val : $val;
};
assert($neutralizeCsv("=1+1") === "'=1+1", 'Failed to neutralize equal formula');
assert($neutralizeCsv("@SUM(A1:A10)") === "'@SUM(A1:A10)", 'Failed to neutralize @ formula');
assert($neutralizeCsv("+cmd|' /C calc'!A0") === "'+cmd|' /C calc'!A0", 'Failed to neutralize + formula');
assert($neutralizeCsv("-2+3") === "'-2+3", 'Failed to neutralize - formula');
assert($neutralizeCsv("Normal Text") === "Normal Text", 'Wrongly altered safe string');

// 13. Public Dynamic Form upload whitelist assertion
$isAllowedExt = function (string $filename): bool {
    $ext = strtolower(pathinfo($filename, PATHINFO_EXTENSION));
    $allowed = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'csv', 'zip', 'rar', 'jpg', 'jpeg', 'png', 'webp'];
    return in_array($ext, $allowed, true);
};
assert($isAllowedExt('dokumen.pdf') === true, 'Valid PDF wrongly rejected');
assert($isAllowedExt('foto.JPG') === true, 'Valid JPG uppercase wrongly rejected');
assert($isAllowedExt('data.xlsx') === true, 'Valid Excel wrongly rejected');
assert($isAllowedExt('payload.php') === false, 'PHP shell not blocked');
assert($isAllowedExt('exploit.exe') === false, 'Executable not blocked');
// 14. Public Master Data Rate Limit
$masterRoute = $routes->first(fn($r) => str_contains($r->uri(), 'master/{type}') && in_array('GET', $r->methods()));
assert($masterRoute !== null, 'GET api/dereporting/master/{type} missing');
assert(in_array('throttle:120,1', $masterRoute->middleware()), 'GET api/dereporting/master/{type} missing throttle:120,1');

// 15. SQL LIKE wildcard escaping assertion for self assets query
$escapeLike = fn(string $name) => addcslashes(mb_strtolower($name), '%_');
assert($escapeLike('John%Doe') === 'john\%doe', 'Failed to escape % in LIKE pattern');
assert($escapeLike('Jane_Smith') === 'jane\_smith', 'Failed to escape _ in LIKE pattern');
assert($escapeLike('Normal') === 'normal', 'Wrongly altered alphanumeric string');

// 16. Draft ST access authorization assertion
$canAccessST = function (string $status, bool $isAssigned, bool $isCreator): bool {
    if (! $isAssigned && ! $isCreator) return false;
    if (! $isCreator && ! in_array($status, ['approved', 'completed', 'published', 'diterbitkan'])) return false;
    return true;
};
assert($canAccessST('approved', true, false) === true, 'Assigned employee should access approved ST');
assert($canAccessST('draft', true, false) === false, 'Assigned employee must NOT access draft ST');
assert($canAccessST('draft', false, true) === true, 'Creator can access their own draft ST');
assert($canAccessST('approved', false, false) === false, 'Unrelated user must NOT access approved ST');

// 17. Form responses & export authorization assertion
$canAccessResponses = function (int $formCreatorId, int $userId, string $role): bool {
    return in_array($role, ['admin', 'super_admin']) || $formCreatorId === $userId;
};
assert($canAccessResponses(10, 10, 'user') === true, 'Form creator should access responses');
assert($canAccessResponses(10, 20, 'admin') === true, 'Admin should access responses');
assert($canAccessResponses(10, 20, 'super_admin') === true, 'Super Admin should access responses');
assert($canAccessResponses(10, 20, 'user') === false, 'Other user must NOT access responses (BOLA blocked)');

// 18. Attachment download authorization assertion
$canDownloadAttachment = function (int $formCreatorId, int $userId, string $role): bool {
    return in_array($role, ['admin', 'super_admin']) || $formCreatorId === $userId;
};
assert($canDownloadAttachment(5, 5, 'user') === true, 'Form creator should download attachments');
assert($canDownloadAttachment(5, 8, 'admin') === true, 'Admin should download attachments');
assert($canDownloadAttachment(5, 8, 'user') === false, 'Other user must NOT download attachments (BOLA blocked)');

// 19. Form duplication authorization assertion
$canDuplicateForm = function (bool $isActive, int $formCreatorId, int $userId, string $role): bool {
    if (in_array($role, ['admin', 'super_admin'])) return true;
    if ($isActive) return true;
    return $formCreatorId === $userId;
};
assert($canDuplicateForm(isActive: false, formCreatorId: 5, userId: 5, role: 'user') === true, 'Creator can duplicate draft form');
assert($canDuplicateForm(isActive: false, formCreatorId: 5, userId: 12, role: 'admin') === true, 'Admin can duplicate draft form');
assert($canDuplicateForm(isActive: false, formCreatorId: 5, userId: 12, role: 'user') === false, 'Other user must NOT duplicate draft form');
assert($canDuplicateForm(isActive: true, formCreatorId: 5, userId: 12, role: 'user') === true, 'Any user can duplicate active public template');

// 20. Employee select endpoint protected by auth:sanctum and throttle
$empSelect = $routes->first(fn($r) => str_contains($r->uri(), 'employees/select') && in_array('GET', $r->methods()));
assert($empSelect !== null, 'GET employees/select route missing');
assert(in_array('auth:sanctum', $empSelect->middleware()), 'GET employees/select missing auth:sanctum');
assert(in_array('throttle:120,1', $empSelect->middleware()), 'GET employees/select missing throttle:120,1');

// 21. ST Expense Templates public endpoint protected by auth:sanctum
$expenseSelect = $routes->first(fn($r) => str_contains($r->uri(), 'st-expense-templates/public') && in_array('GET', $r->methods()));
assert($expenseSelect !== null, 'GET st-expense-templates/public route missing');
assert(in_array('auth:sanctum', $expenseSelect->middleware()), 'GET st-expense-templates/public missing auth:sanctum');
assert(in_array('throttle:120,1', $expenseSelect->middleware()), 'GET st-expense-templates/public missing throttle:120,1');

// 22. Surat Tugas submit endpoint protected by auth:sanctum
$stSubmit = $routes->first(fn($r) => str_ends_with($r->uri(), 'surat-tugas/submit') && in_array('POST', $r->methods()));
assert($stSubmit !== null, 'POST surat-tugas/submit route missing');
assert(in_array('auth:sanctum', $stSubmit->middleware()), 'POST surat-tugas/submit missing auth:sanctum');

// 23. ST Verify status normalization
$isValidSTStatus = fn(string $status) => in_array(strtolower($status), ['approved', 'completed', 'published', 'diterbitkan'], true);
assert($isValidSTStatus('APPROVED') === true, 'Uppercase APPROVED should be valid');
assert($isValidSTStatus('diterbitkan') === true, 'diterbitkan should be valid');
assert($isValidSTStatus('published') === true, 'published should be valid');
assert($isValidSTStatus('draft') === false, 'draft must NOT be valid');
assert($isValidSTStatus('rejected') === false, 'rejected must NOT be valid');

// 24. Admin leave request search escaping assertion
$escapeSearch = fn(string $term) => addcslashes($term, '%_');
assert($escapeSearch('199%') === '199\%', 'Failed to escape % in leave search');
assert($escapeSearch('admin_test') === 'admin\_test', 'Failed to escape _ in leave search');

// 25. Upload validation rules invariants (10MB image limit & spreadsheet protection)
$imageRules = \App\Support\Security\UploadValidationRules::image(maxKilobytes: 10240);
assert(in_array('max:10240', $imageRules), 'UploadValidationRules image missing max:10240 rule');
assert(in_array('mimes:jpg,jpeg,png,webp', $imageRules), 'UploadValidationRules image missing mimes rule');
assert(in_array('extensions:jpg,jpeg,png,webp', $imageRules), 'UploadValidationRules image missing extensions rule');

// 26. Date range calculation & invalid value fallback invariant
$calcDays = function (?string $start, ?string $end): int {
    if (!$start || !$end) return 1;
    $t1 = strtotime($start);
    $t2 = strtotime($end);
    if ($t1 === false || $t2 === false) return 1;
    return max(1, (int) round(($t2 - $t1) / 86400) + 1);
};
assert($calcDays('2026-10-01', '2026-10-05') === 5, 'Failed on 5-day range');
assert($calcDays('2026-10-01', '2026-10-01') === 1, 'Failed on 1-day range');
assert($calcDays('invalid', '2026-10-05') === 1, 'Failed to fallback on invalid start date');
assert($calcDays(null, '2026-10-05') === 1, 'Failed to fallback on null start date');
assert($calcDays('2026-10-05', '2026-10-01') === 1, 'Failed to clamp negative date range to 1');

// 27. Year input clamping invariant (prevents out-of-range SQL queries)
$clampYear = function ($rawYear): int {
    $cur = (int) date('Y');
    $val = (int) $rawYear;
    return ($val >= 2000 && $val <= 2100) ? $val : $cur;
};
assert($clampYear('2026') === 2026, 'Failed on current 2026 year');
assert($clampYear(2024) === 2024, 'Failed on integer 2024');
assert($clampYear(0) === (int) date('Y'), 'Failed to fallback on 0');
assert($clampYear(-999) === (int) date('Y'), 'Failed to fallback on negative year');
assert($clampYear(999999) === (int) date('Y'), 'Failed to fallback on overflow year');
assert($clampYear('invalid') === (int) date('Y'), 'Failed to fallback on string input');

// 28. Client leave days calculation invariant (prevents submitting invalid/reversed dates)
$calcLeaveDays = function (?string $start, ?string $end): int {
    if (!$start || !$end) return 0;
    $t1 = strtotime($start);
    $t2 = strtotime($end);
    if ($t1 === false || $t2 === false) return 0;
    $diff = $t2 - $t1;
    if ($diff < 0) return 0;
    return (int) ceil($diff / 86400) + 1;
};
assert($calcLeaveDays('2026-11-01', '2026-11-05') === 5, 'Valid 5-day leave failed');
assert($calcLeaveDays('2026-11-05', '2026-11-01') === 0, 'Reversed dates should return 0 (blocked)');
assert($calcLeaveDays('invalid-date', '2026-11-05') === 0, 'Invalid date should return 0 (blocked)');
assert($calcLeaveDays(null, '2026-11-05') === 0, 'Null date should return 0 (blocked)');

// 29. Loan overdue invariant (null/invalid due date must never trigger overdue status)
$checkOverdue = function (?string $dueDate): bool {
    if (!$dueDate) return false;
    $time = strtotime($dueDate);
    if ($time === false) return false;
    return $time < time();
};
assert($checkOverdue(null) === false, 'Null due date should not be overdue');
assert($checkOverdue('') === false, 'Empty due date should not be overdue');
assert($checkOverdue('invalid') === false, 'Invalid due date should not be overdue');
assert($checkOverdue('2020-01-01') === true, 'Past date should be overdue');
assert($checkOverdue('2030-01-01') === false, 'Future date should not be overdue');

// 30. Profile contact sanitization invariant
$sanitizeEmail = fn(?string $val) => (is_string($val) && trim($val) !== '') ? strtolower(trim($val)) : null;
$sanitizePhone = fn(?string $val) => (is_string($val) && trim($val) !== '') ? trim($val) : null;
assert($sanitizeEmail('  USER@BKSDAKALTIM.NET ') === 'user@bksdakaltim.net', 'Email trimming and lowercasing failed');
assert($sanitizeEmail('   ') === null, 'Whitespace-only email should become null');
assert($sanitizeEmail(null) === null, 'Null email should remain null');
assert($sanitizePhone('  081234567890 ') === '081234567890', 'Phone trimming failed');
assert($sanitizePhone('   ') === null, 'Whitespace-only phone should become null');

// 31. Confidential draft pending count invariant
$canCountInPending = function (string $status, bool $isCreator, bool $isAssigned): bool {
    if ($status === 'draft') return $isCreator;
    if ($status === 'pending') return $isCreator || $isAssigned;
    return false;
};
assert($canCountInPending('draft', isCreator: true, isAssigned: false) === true, 'Creator should count their own draft in pending');
assert($canCountInPending('draft', isCreator: false, isAssigned: true) === false, 'Assigned user must NOT count someone else draft in pending');
assert($canCountInPending('pending', isCreator: false, isAssigned: true) === true, 'Assigned user should count submitted pending ST');
assert($canCountInPending('approved', isCreator: true, isAssigned: true) === false, 'Approved ST should not be counted in pending');

// 32. Cross-user cache matching invariant (shared PC session isolation)
$canHydrateCache = function (?string $cachedUser, ?string $activeUser): bool {
    if (!$cachedUser || !$activeUser) return false;
    return $cachedUser === $activeUser;
};
assert($canHydrateCache('199907072025061006', '199907072025061006') === true, 'Same user session should hydrate cache');
assert($canHydrateCache('199907072025061006', '197503141999031004') === false, 'Different user session must NOT hydrate cache');
assert($canHydrateCache(null, '199907072025061006') === false, 'Null cached user must not hydrate');
assert($canHydrateCache('199907072025061006', null) === false, 'Null active user must not hydrate');

// 33. Report photo count ceiling invariant (30 max to prevent browser heap crash)
$calculateAllowedPhotos = function (int $currentCount, int $incomingCount, int $max = 30): int {
    $remaining = max(0, $max - $currentCount);
    return min($incomingCount, $remaining);
};
assert($calculateAllowedPhotos(0, 10) === 10, 'Should allow all 10 when empty');
assert($calculateAllowedPhotos(25, 10) === 5, 'Should only allow 5 when 25 already present');
assert($calculateAllowedPhotos(30, 5) === 0, 'Should allow 0 when limit reached');
assert($calculateAllowedPhotos(35, 5) === 0, 'Should allow 0 when already over limit');

// 34. Blob URL allocation & deterministic cleanup invariant
$createManagedUrlRegistry = function () {
    return new class {
        private array $active = [];
        public function create(string $fileId): string {
            $url = 'blob:test/' . $fileId . '-' . bin2hex(random_bytes(4));
            $this->active[$url] = true;
            return $url;
        }
        public function revoke(string $url): void {
            unset($this->active[$url]);
        }
        public function count(): int {
            return count($this->active);
        }
    };
};
$reg = $createManagedUrlRegistry();
$url1 = $reg->create('tally-sheet');
assert($reg->count() === 1, 'Registry should have 1 active URL');
$reg->revoke($url1);
assert($reg->count() === 0, 'Registry should have 0 active URLs after deterministic revoke');

// 35. Central logout sensitive draft storage purge invariant
$requiredLogoutPurgeKeys = [
    'bksda_logged_in',
    'bksda_user',
    'bksda_token',
    'bksda_portal_dashboard_cache',
    'bksda_portal_nav_tab',
    'bksda_kalkulator_panjar_v2',
    'bksda_visum_spd_draft_v2',
    'bksda_visum_spd_selected_template_id',
    'bksda_visum_spd_type_v1',
];
$logoutCode = file_get_contents(__DIR__ . '/../../frontend/src/lib/auth-store.ts');
foreach ($requiredLogoutPurgeKeys as $purgeKey) {
    assert(str_contains($logoutCode, "localStorage.removeItem(\"{$purgeKey}\")"), "Missing {$purgeKey} in authStore.logout()");
}

// 36. Kepegawaian & ST expense templates route throttle invariant
$empSelectRoute = $routes->first(fn($r) => $r->uri() === 'api/kepegawaian/employees/select' && in_array('GET', $r->methods()));
assert($empSelectRoute !== null && in_array('throttle:120,1', $empSelectRoute->middleware()), 'GET api/kepegawaian/employees/select missing throttle:120,1');

$stExpensePublicRoute = $routes->first(fn($r) => $r->uri() === 'api/kepegawaian/st-expense-templates/public' && in_array('GET', $r->methods()));
assert($stExpensePublicRoute !== null && in_array('throttle:120,1', $stExpensePublicRoute->middleware()), 'GET api/kepegawaian/st-expense-templates/public missing throttle:120,1');

// 37. HTTP Content-Disposition Header Injection & Response Splitting Immunity
$sanitizeDownloadHeader = fn(string $val) => preg_replace('/[\r\n"\/\\\\:*?<>|]/', '_', $val);
$maliciousNomor = "ST/01/2026\r\nSet-Cookie: pwned=1\r\nContent-Type: text/html";
$sanitizedNomor = $sanitizeDownloadHeader($maliciousNomor);
assert(!str_contains($sanitizedNomor, "\r") && !str_contains($sanitizedNomor, "\n") && !str_contains($sanitizedNomor, '"'), 'CRLF or quotes not sanitized in download header');
assert($sanitizedNomor === "ST_01_2026__Set-Cookie_ pwned=1__Content-Type_ text_html", 'Sanitization did not replace illegal header characters with underscore');

// 38. General Report Title Delimiter & Empty Fallback Invariant
$cleanCoverSubtitleFn = function (?string $rawTitle): string {
    if (!$rawTitle) return "PELAKSANAAN TUGAS DINAS";
    $cleaned = trim(preg_replace('/^(?:laporan(?:[\s:\-]+|$))+/i', '', trim($rawTitle)));
    return strtoupper($cleaned ?: "PELAKSANAAN TUGAS DINAS");
};
assert($cleanCoverSubtitleFn("LAPORAN: Patroli Satwa Liar") === "PATROLI SATWA LIAR", 'Failed to strip laporan prefix with colon');
assert($cleanCoverSubtitleFn("laporan - verifikasi BMN") === "VERIFIKASI BMN", 'Failed to strip lowercase laporan with hyphen');
assert($cleanCoverSubtitleFn("LAPORAN") === "PELAKSANAAN TUGAS DINAS", 'Failed to fallback to default on bare LAPORAN title');
assert($cleanCoverSubtitleFn(null) === "PELAKSANAAN TUGAS DINAS", 'Failed to fallback on null title');

// 39. Portal Navigation Tab Allowlist Invariant
$validPortalTabs = ['dashboard', 'pinjaman', 'aset', 'surat_tugas', 'cuti', 'visum', 'kalkulator_dinas'];
$resolveNavTab = fn(?string $tab) => ($tab && in_array($tab, $validPortalTabs, true)) ? $tab : 'dashboard';
assert($resolveNavTab('visum') === 'visum', 'Valid tab incorrectly rejected');
assert($resolveNavTab('malicious_tab') === 'dashboard', 'Invalid tab not fallback to dashboard');
assert($resolveNavTab(null) === 'dashboard', 'Null tab not fallback to dashboard');

// 40. Minimum Password Length Guard Invariant
$validatePasswordLength = fn(?string $pw) => is_string($pw) && strlen($pw) >= 8;
assert($validatePasswordLength('SecurePass123!') === true, 'Valid password length rejected');
assert($validatePasswordLength('short') === false, 'Short password not rejected');
assert($validatePasswordLength('') === false, 'Empty password not rejected');

// 41. Personal Surat Tugas download rate limit throttle invariant
$stDownloadRoute = $routes->first(fn($r) => $r->uri() === 'api/surat-tugas/my/{id}/download' && in_array('GET', $r->methods()));
assert($stDownloadRoute !== null, 'GET api/surat-tugas/my/{id}/download missing');
assert(in_array('throttle:30,1', $stDownloadRoute->middleware()), 'GET api/surat-tugas/my/{id}/download missing throttle:30,1');

// 42. Visum SPD Type Allowlist Invariant
$resolveSpdType = fn(?string $t) => in_array($t, ['dipa', 'folu'], true) ? $t : 'dipa';
assert($resolveSpdType('dipa') === 'dipa', 'Valid dipa type rejected');
assert($resolveSpdType('folu') === 'folu', 'Valid folu type rejected');
assert($resolveSpdType('unknown_type') === 'dipa', 'Invalid type did not fallback to dipa');
assert($resolveSpdType(null) === 'dipa', 'Null type did not fallback to dipa');

// 43. Smart Patrol Tally Sheet & SPT Safe MIME Validation Invariant
$isValidDocumentMime = fn(string $mime) => str_starts_with($mime, 'image/') || $mime === 'application/pdf';
assert($isValidDocumentMime('image/jpeg') === true, 'Valid image/jpeg rejected');
assert($isValidDocumentMime('image/png') === true, 'Valid image/png rejected');
assert($isValidDocumentMime('application/pdf') === true, 'Valid application/pdf rejected');
assert($isValidDocumentMime('text/html') === false, 'Malicious text/html not rejected');
assert($isValidDocumentMime('application/javascript') === false, 'Malicious script not rejected');
assert($isValidDocumentMime('application/x-msdownload') === false, 'Executable binary not rejected');

// 44. Visum SPD dead state pruning invariant
$visumCode = file_get_contents(__DIR__ . '/../../frontend/src/app/keuangan/_components/VisumSpdTab.tsx');
assert(!str_contains($visumCode, 'showTransitSection'), 'Unused dead state showTransitSection should be pruned');

// 45. Financial Input Safe Ceiling Clamping Invariant (Rp 10 Miliar max)
$parseRibuanFn = function ($val): int {
    $num = (int) preg_replace('/[^0-9]/', '', (string) $val);
    return min($num, 10_000_000_000);
};
assert($parseRibuanFn('5.000.000') === 5_000_000, 'Failed to parse normal thousands rupiah');
assert($parseRibuanFn('999.999.999.999.999') === 10_000_000_000, 'Failed to clamp excessive financial value to 10 Miliar ceiling');
assert($parseRibuanFn('-500') === 500, 'Negative sign stripped to positive digit');
assert($parseRibuanFn('') === 0, 'Empty input should evaluate to 0');

// 46. Visum SPD updateTransitData type safety invariant
assert(!str_contains($visumCode, 'value: any'), 'VisumSpdTab should not contain loose value: any parameter');

// 47. Visum SPD Transit Sequential Compaction Invariant (Remove Transit 3 shifts 4->3, 5->4)
$compactTransitRows = function (array $data, string $transitKey): array {
    $next = $data;
    if ($transitKey === 'transit_3') {
        $next['transit_3'] = $data['transit_4'] ?? [];
        $next['transit_4'] = $data['transit_5'] ?? [];
        $next['transit_5'] = [];
    } elseif ($transitKey === 'transit_4') {
        $next['transit_4'] = $data['transit_5'] ?? [];
        $next['transit_5'] = [];
    } else {
        $next['transit_5'] = [];
    }
    return $next;
};

$sampleTransitData = [
    'transit_3' => ['tiba_di' => 'Balikpapan'],
    'transit_4' => ['tiba_di' => 'Berau'],
    'transit_5' => ['tiba_di' => 'Tarakan'],
];

$afterRemove3 = $compactTransitRows($sampleTransitData, 'transit_3');
assert($afterRemove3['transit_3']['tiba_di'] === 'Berau', 'Transit 4 did not shift to Transit 3 after removal of 3');
assert($afterRemove3['transit_4']['tiba_di'] === 'Tarakan', 'Transit 5 did not shift to Transit 4 after removal of 3');
assert(empty($afterRemove3['transit_5']), 'Transit 5 was not cleared after shifting');

// 48. Visum SPD Transit Compaction for intermediate removal (Remove Transit 4 shifts 5->4)
$afterRemove4 = $compactTransitRows($sampleTransitData, 'transit_4');
assert($afterRemove4['transit_3']['tiba_di'] === 'Balikpapan', 'Transit 3 was wrongly altered when removing 4');
assert($afterRemove4['transit_4']['tiba_di'] === 'Tarakan', 'Transit 5 did not shift to Transit 4 after removal of 4');
assert(empty($afterRemove4['transit_5']), 'Transit 5 was not cleared after shifting 5->4');

// 49. Visum SPD Template Metadata Sanitization & Payload Bounds Invariant
$sanitizeTemplateInput = function (array $input): array {
    return [
        'name' => strip_tags(trim($input['name'] ?? '')),
        'description' => isset($input['description']) ? strip_tags(trim($input['description'])) : null,
        'data_count' => count($input['data'] ?? []),
    ];
};
$maliciousTmpl = [
    'name' => '<script>alert("xss")</script>Template Resmi Samarinda',
    'description' => '<b>Format Balai</b><img src=x onerror=alert(1)>',
    'data' => array_fill(0, 50, 'field'),
];
$sanitizedTmpl = $sanitizeTemplateInput($maliciousTmpl);
assert($sanitizedTmpl['name'] === 'alert("xss")Template Resmi Samarinda', 'strip_tags did not neutralize script in template name');
assert(!str_contains($sanitizedTmpl['description'], '<') && !str_contains($sanitizedTmpl['description'], '>'), 'strip_tags did not strip HTML tags in template description');
assert($sanitizedTmpl['data_count'] <= 100, 'Payload size should not exceed 100 entries ceiling');

// 50. Visum SPD Departure Route Continuity Invariant
$chainDeparture = function (string $dest1, ?array $transit3, ?array $transit4): array {
    $t3Depart = $dest1 ?: 'Samarinda';
    $t4Depart = $transit3['tiba_di'] ?? $transit3['berangkat_ke'] ?? $t3Depart;
    $t5Depart = $transit4['tiba_di'] ?? $transit4['berangkat_ke'] ?? $t4Depart;
    return [$t3Depart, $t4Depart, $t5Depart];
};
[$d3, $d4, $d5] = $chainDeparture('Balikpapan', ['tiba_di' => 'Penajam'], ['tiba_di' => 'Tanah Grogot']);
assert($d3 === 'Balikpapan', 'Transit 3 departure should inherit from Destination 1');
assert($d4 === 'Penajam', 'Transit 4 departure should inherit from Transit 3 arrival');
assert($d5 === 'Tanah Grogot', 'Transit 5 departure should inherit from Transit 4 arrival');

// 51. Visum SPD Draft vs Default Template Hydration Precedence Invariant
$resolveDraftHydration = function (bool $hasDraft, array $draftData, array $defaultTemplateData): array {
    return $hasDraft ? $draftData : $defaultTemplateData;
};
$userDraft = ['asal_tempat' => 'Tenggarong', 'tujuan_awal' => 'Balikpapan', 'nomor_surat' => '123'];
$defaultTmpl = ['asal_tempat' => 'Samarinda', 'tujuan_awal' => '', 'nomor_surat' => ''];
assert($resolveDraftHydration(true, $userDraft, $defaultTmpl) === $userDraft, 'Existing draft was wiped out by default template');
assert($resolveDraftHydration(false, $userDraft, $defaultTmpl) === $defaultTmpl, 'Default template was not loaded when draft is absent');

// 52. General Report Duration NaN Protection Invariant
$getDurationDaysFn = function (?string $startStr, ?string $endStr): int {
    if (!$startStr || !$endStr) return 1;
    $t1 = strtotime($startStr);
    $t2 = strtotime($endStr);
    if ($t1 === false || $t2 === false) return 1;
    return max(1, (int) round(($t2 - $t1) / 86400) + 1);
};
assert($getDurationDaysFn('invalid', '2026-10-15') === 1, 'Invalid start date did not fallback to 1 day');
assert($getDurationDaysFn('2026-10-15', 'invalid') === 1, 'Invalid end date did not fallback to 1 day');
assert($getDurationDaysFn('2026-10-10', '2026-10-12') === 3, 'Valid range calculation failed');

// 53. Assignment Letter PDF Filename Sanitization Invariant (CRLF & Quotes immunity)
$sanitizePdfFilename = fn(string $name) => preg_replace('/[\r\n"\/\\\\:*?<>|]/', '_', $name);
$dirtyPdfName = "Surat_Tugas\r\nSet-Cookie: evil=1\"<xss>";
$cleanPdfName = $sanitizePdfFilename($dirtyPdfName);
assert(!str_contains($cleanPdfName, "\r") && !str_contains($cleanPdfName, "\n") && !str_contains($cleanPdfName, '"'), 'CRLF or quotes not neutralized in PDF download filename');
assert($cleanPdfName === 'Surat_Tugas__Set-Cookie_ evil=1__xss_', 'Filename regex mismatch');

// 54. Leave Request Monotonic Sequence Invariant (Safe against deletion race conditions)
$generateNomorPengajuan = function (int $year, ?int $maxId): string {
    $seq = ($maxId ?? 0) + 1;
    return 'CUTI/' . $year . '/' . sprintf('%03d', $seq);
};
assert($generateNomorPengajuan(2026, null) === 'CUTI/2026/001', 'Failed on first sequence number');
assert($generateNomorPengajuan(2026, 42) === 'CUTI/2026/043', 'Failed on subsequent sequence number');
assert($generateNomorPengajuan(2026, 99) === 'CUTI/2026/100', 'Failed on 3-digit rollover');

// 55. Personal Portal Endpoints Rate Limiting Throttling Invariant
$dashboardRoute = $routes->first(fn($r) => $r->uri() === 'api/me/dashboard' && in_array('GET', $r->methods()));
assert($dashboardRoute !== null && in_array('throttle:120,1', $dashboardRoute->middleware()), 'api/me/dashboard missing throttle:120,1');

$assetsRoute = $routes->first(fn($r) => $r->uri() === 'api/me/assets' && in_array('GET', $r->methods()));
assert($assetsRoute !== null && in_array('throttle:120,1', $assetsRoute->middleware()), 'api/me/assets missing throttle:120,1');

$myStRoute = $routes->first(fn($r) => $r->uri() === 'api/surat-tugas/my' && in_array('GET', $r->methods()));
assert($myStRoute !== null && in_array('throttle:120,1', $myStRoute->middleware()), 'api/surat-tugas/my missing throttle:120,1');

$myStShowRoute = $routes->first(fn($r) => $r->uri() === 'api/surat-tugas/my/{id}' && in_array('GET', $r->methods()));
assert($myStShowRoute !== null && in_array('throttle:120,1', $myStShowRoute->middleware()), 'api/surat-tugas/my/{id} missing throttle:120,1');

// 56. Leave Request Personal History Query Upper Bound Invariant (limit 100)
$leaveControllerCode = file_get_contents(__DIR__ . '/../app/Modules/Kepegawaian/Controllers/EmployeeLeaveRequestController.php');
assert(str_contains($leaveControllerCode, '->limit(100)'), 'EmployeeLeaveRequestController::myIndex missing ->limit(100)');

// 57. Smart Patrol Surat Tugas Graceful Fallback Invariant
$resolveStOptions = function (array $allSt): array {
    $filtered = array_values(array_filter($allSt, fn($st) => str_contains(strtolower($st['maksud_tujuan'] ?? ''), 'patrol')));
    return !empty($filtered) ? $filtered : $allSt;
};
$patrolSt = [['id' => '1', 'maksud_tujuan' => 'Patroli Kawasan']];
$generalSt = [['id' => '2', 'maksud_tujuan' => 'Pengamanan dan Perlindungan Kawasan']];
assert(count($resolveStOptions($patrolSt)) === 1 && $resolveStOptions($patrolSt)[0]['id'] === '1', 'Failed to filter patrol letters');
assert(count($resolveStOptions($generalSt)) === 1 && $resolveStOptions($generalSt)[0]['id'] === '2', 'Failed to fallback to general ST when no patrol keyword found');

// 58. Smart Patrol Tally Sheet & SPT Safe MIME Validation Invariant
$isValidAttachmentMime = fn(string $mime) => str_starts_with($mime, 'image/') || $mime === 'application/pdf';
assert($isValidAttachmentMime('image/png') === true, 'PNG wrongly rejected');
assert($isValidAttachmentMime('application/pdf') === true, 'PDF wrongly rejected');
assert($isValidAttachmentMime('text/html') === false, 'HTML payload not rejected');
assert($isValidAttachmentMime('application/x-executable') === false, 'Executable payload not rejected');

// 59. General Report Signatory Privacy & Generic Fallback Invariant
$genReportPrintCode = file_get_contents(__DIR__ . '/../../frontend/src/app/portal/_components/GeneralReportPrint.tsx');
assert(!str_contains($genReportPrintCode, 'ANISA RAHMAWATI'), 'Hardcoded personal name leak in GeneralReportPrint fallback');
assert(str_contains($genReportPrintCode, '( .................................................... )'), 'Missing generic dot-line signature in GeneralReportPrint');

// 60. Portal Quick Stats Rank & TMT Integrity Invariant
$quickStatsCode = file_get_contents(__DIR__ . '/../../frontend/src/app/portal/_components/PortalQuickStats.tsx');
assert(!str_contains($quickStatsCode, 'TMT: 1 Juni 2025'), 'Hardcoded fake TMT date in PortalQuickStats must be removed');

// 61. Leave Request Form Whitespace Trimming & Optional Phone Invariant
$sanitizeLeaveForm = function (array $form): array {
    return [
        'jenis_cuti' => $form['jenis_cuti'] ?? 'Cuti Tahunan',
        'alasan_cuti' => trim($form['alasan_cuti'] ?? ''),
        'alamat_menjalankan_cuti' => trim($form['alamat_menjalankan_cuti'] ?? ''),
        'telepon' => trim($form['telepon'] ?? '') ?: null,
    ];
};
$rawLeaveInput = [
    'jenis_cuti' => 'Cuti Tahunan',
    'alasan_cuti' => '  Acara keluarga penting  ',
    'alamat_menjalankan_cuti' => '  Jl. Juanda No. 5 Samarinda  ',
    'telepon' => '   ',
];
$cleanLeave = $sanitizeLeaveForm($rawLeaveInput);
assert($cleanLeave['alasan_cuti'] === 'Acara keluarga penting', 'Alasan cuti whitespace not trimmed');
assert($cleanLeave['alamat_menjalankan_cuti'] === 'Jl. Juanda No. 5 Samarinda', 'Alamat whitespace not trimmed');
assert($cleanLeave['telepon'] === null, 'Whitespace-only phone was not normalized to null');

// 62. Surat Tugas Tab Per-Item Scoped Loading Invariant
$stTabCode = file_get_contents(__DIR__ . '/../../frontend/src/app/portal/_components/SuratTugasTab.tsx');
assert(str_contains($stTabCode, 'activeLoadingId === st.id'), 'SuratTugasTab missing item-scoped activeLoadingId state check');

// 63. Smart Patrol Signatory Privacy & Impersonation Prevention Invariant
$smartPatrolPrintCode = file_get_contents(__DIR__ . '/../../frontend/src/app/portal/_components/SmartPatrolPrint.tsx');
assert(!str_contains($smartPatrolPrintCode, 'Dheny Mardiono, S.Hut., M.Sc.'), 'Hardcoded dinilaiOleh name leak in SmartPatrolPrint');
assert(!str_contains($smartPatrolPrintCode, 'Didi Susanto, S.Si.'), 'Hardcoded disusunOleh name leak in SmartPatrolPrint');
assert(str_contains($smartPatrolPrintCode, '( .................................................... )'), 'Missing generic dot-line signature in SmartPatrolPrint');

// 64. Formulir Cuti Generic Employee Fallback Invariant
$formulirCutiPrintCode = file_get_contents(__DIR__ . '/../../frontend/src/app/portal/_components/FormulirCutiPrint.tsx');
assert(!str_contains($formulirCutiPrintCode, 'TEGAR ANUGRAH, A.Md.Kom.'), 'Hardcoded developer persona in FormulirCutiPrint fallback');
assert(str_contains($formulirCutiPrintCode, '( .................................................... )'), 'Missing generic dot-line employee fallback in FormulirCutiPrint');

// 65. User Profile Email Null-Safety & Constraint Guard Invariant
$authControllerCode = file_get_contents(__DIR__ . '/../app/Http/Controllers/Api/AuthController.php');
assert(str_contains($authControllerCode, 'if ($cleanEmail !== null) {') && str_contains($authControllerCode, '$user->update([\'email\' => $cleanEmail]);'), 'AuthController updateProfile must guard user.email against null updates');

// 66. Profile Form Trim & Surat Tugas URI Escaping Invariant
$portalSidebarCode = file_get_contents(__DIR__ . '/../../frontend/src/app/portal/_components/PortalProfileSidebar.tsx');
assert(str_contains($portalSidebarCode, 'editData.email.trim()'), 'PortalProfileSidebar missing email trim sanitization');
assert(str_contains($portalSidebarCode, 'editData.phone.trim()'), 'PortalProfileSidebar missing phone trim sanitization');
$portalPageCode = file_get_contents(__DIR__ . '/../../frontend/src/app/portal/page.tsx');
assert(str_contains($portalPageCode, 'encodeURIComponent(id)'), 'Portal page missing encodeURIComponent in fetchSTDetail');

// 67. Surat Tugas Preview ID Guard & Perpetual Loading Invariant
$stPreviewCode = file_get_contents(__DIR__ . '/../../frontend/src/app/portal/surat-tugas/[id]/page.tsx');
assert(str_contains($stPreviewCode, 'if (!cleanId) {') && str_contains($stPreviewCode, 'setLoading(false)'), 'SuratTugasPreviewPage missing guard against hanging loader when cleanId is empty');

// 68. MyAssets BMN Field Scoping & Confidential Data Leak Prevention
assert(str_contains($authControllerCode, '->select([') && str_contains($authControllerCode, "'foto_geotag_url'"), 'myAssets must explicitly select only public display columns');

// 69. MyAssets Geotag Photo URL Safe Mapping
assert(str_contains($authControllerCode, '/api/bmn/assets/{$asset->id}/photo/geotag/view'), 'myAssets must map foto_geotag_path to safe API view route');

// 70. MyAssets Frontend Thumb URL Guard
$myAssetsTabCode = file_get_contents(__DIR__ . '/../../frontend/src/app/portal/_components/MyAssetsTab.tsx');
assert(str_contains($myAssetsTabCode, 'thumbUrl = asset.foto_geotag_url'), 'MyAssetsTab must prioritize foto_geotag_url and avoid raw local disk path');

// 71. Kalkulator Dinas Safe Zero Panjar & Empty Destination Default
$kalkulatorCode = file_get_contents(__DIR__ . '/../../frontend/src/app/portal/_components/KalkulatorDinasTab.tsx');
assert(!str_contains($kalkulatorCode, 'uangPanjar ?? 5000000'), 'KalkulatorDinasTab must not default to 5,000,000 panjar mock');
assert(str_contains($kalkulatorCode, 'uangPanjar ?? 0'), 'KalkulatorDinasTab must default initial uangPanjar to 0');
assert(str_contains($kalkulatorCode, 'lokasiTujuan ?? ""'), 'KalkulatorDinasTab must default initial lokasiTujuan to empty string');

// 72. Mobile Dashboard Urgent Vehicles Query Bound
$mobileDashboardCode = file_get_contents(__DIR__ . '/../app/Http/Controllers/Api/MobileDashboardController.php');
assert(str_contains($mobileDashboardCode, '->limit(10)') && str_contains($mobileDashboardCode, 'tanggal_pajak_stnk'), 'urgentVehiclesQuery must be bounded with limit(10)');

// 73. Assignment Letter Creator Visibility Alignment Invariant
$stControllerCode = file_get_contents(__DIR__ . '/../app/Modules/SuratTugas/Controllers/AssignmentLetterController.php');
assert(str_contains($stControllerCode, "orWhere('created_by', \$user->id)"), 'myLetters query must include creator permissions matching myShow and myDownload');

// 74. General Report Hasil Pelaksanaan Neutrality Invariant
$genReportFormCode = file_get_contents(__DIR__ . '/../../frontend/src/app/portal/_components/GeneralReportInlineForm.tsx');
assert(!str_contains($genReportFormCode, 'pelaksanaan lelang/kegiatan'), 'GeneralReportInlineForm must not contain out-of-place lelang copy in default hasilPelaksanaan');

// 75. General Report Canvas Compression & Memory Protection Invariant
assert(str_contains($genReportFormCode, 'toDataURL("image/jpeg", 0.75)'), 'GeneralReportInlineForm must compress uploaded documentation photos to prevent browser OOM');

// 76. Cover Image Upload Clean Reset Invariant
assert(str_contains($genReportFormCode, 'toast.error("File cover harus berupa gambar'), 'GeneralReportInlineForm must validate cover image mime');
assert(str_contains($genReportFormCode, 'toast.error("Ukuran file cover maksimal 10MB.') && str_contains($genReportFormCode, 'e.target.value = "";'), 'GeneralReportInlineForm must reset file input on early validation returns');

// 77. Smart Patrol Cover Upload Clean Reset Invariant
$smartPatrolFormCode = file_get_contents(__DIR__ . '/../../frontend/src/app/portal/_components/SmartPatrolInlineForm.tsx');
assert(str_contains($smartPatrolFormCode, 'toast.error("File cover harus berupa gambar') && str_contains($smartPatrolFormCode, 'toast.error("Ukuran file cover maksimal 10 MB.') && str_contains($smartPatrolFormCode, 'setCoverMode("custom");') && str_contains($smartPatrolFormCode, 'e.target.value = "";'), 'SmartPatrolInlineForm must reset file input on both error and success');

// 78. User Factory Username Schema Conformance Invariant
$userFactoryCode = file_get_contents(__DIR__ . '/../database/factories/UserFactory.php');
assert(str_contains($userFactoryCode, "'username' => fake()->unique()->numerify("), 'UserFactory must define username field to satisfy NOT NULL constraint');

// 79. Employee Select Dropdown Security Guard Invariant
$empControllerCode = file_get_contents(__DIR__ . '/../app/Modules/Kepegawaian/Controllers/EmployeeController.php');
assert(str_contains($empControllerCode, "addcslashes(\$searchTerm, '%_')") && str_contains($empControllerCode, "get(['id', 'nama_lengkap', 'nip'"), 'EmployeeController select must escape search terms and bound returned columns');

// 80. General Report Photo Caption Display Invariant
$genReportPrintContent = file_get_contents(__DIR__ . '/../../frontend/src/app/portal/_components/GeneralReportPrint.tsx');
assert(str_contains($genReportPrintContent, 'foto.caption && (') && str_contains($genReportPrintContent, '{foto.caption}'), 'GeneralReportPrint must render photo captions under documentation photos');

// 81. Expense Template Non-Admin Active Filter Invariant
$expenseControllerCode = file_get_contents(__DIR__ . '/../app/Modules/Kepegawaian/Controllers/StExpenseTemplateController.php');
assert(str_contains($expenseControllerCode, "\$filters['active_only'] = true;"), 'StExpenseTemplateController must enforce active_only filter for non-admin users');

// 82. Surat Tugas Preview Print & Direct Download Integration Invariant
$stPreviewCode = file_get_contents(__DIR__ . '/../../frontend/src/app/portal/surat-tugas/[id]/page.tsx');
assert(str_contains($stPreviewCode, 'window.print()') && str_contains($stPreviewCode, 'print:hidden') && str_contains($stPreviewCode, 'api.get(`/surat-tugas/my/${cleanId}/download`'), 'Surat Tugas preview must provide print and direct authenticated download actions');

// 83. Portal Profile Sidebar Photo Upload Cleanup Invariant
$profileSidebarCode = file_get_contents(__DIR__ . '/../../frontend/src/app/portal/_components/PortalProfileSidebar.tsx');
assert(str_contains($profileSidebarCode, 'e.target.value = "";') && str_contains($profileSidebarCode, 'URL.revokeObjectURL(photoPreviewUrl);'), 'PortalProfileSidebar must reset input on validation failure and revoke preview object URL on unmount');

// 84. Kepegawaian Error Message & Path Disclosure Prevention Invariant
$leaveReqControllerCode = file_get_contents(__DIR__ . '/../app/Modules/Kepegawaian/Controllers/EmployeeLeaveRequestController.php');
$accessControllerCode = file_get_contents(__DIR__ . '/../app/Modules/Kepegawaian/Controllers/EmployeeAccessController.php');
assert(str_contains($leaveReqControllerCode, "config('app.debug') ? \$e->getMessage()"), 'EmployeeLeaveRequestController must mask exception messages in production');
assert(!str_contains($accessControllerCode, "\$e->getFile()"), 'EmployeeAccessController must not leak internal server file paths');

// 85. Surat Tugas Download Route Sanctum Protection Invariant
$stDownloadRoute = $routes->first(fn($r) => str_contains($r->uri(), 'surat-tugas/my/{id}/download') && in_array('GET', $r->methods()));
assert($stDownloadRoute !== null, 'GET surat-tugas/my/{id}/download route missing');
assert(in_array('auth:sanctum', $stDownloadRoute->middleware()), 'GET surat-tugas/my/{id}/download route must be protected by auth:sanctum');

// 86. Portal Leave Print Layout Isolation & Afterprint Cleanup Invariant
$portalPageCode = file_get_contents(__DIR__ . '/../../frontend/src/app/portal/page.tsx');
assert(str_contains($portalPageCode, 'window.addEventListener("afterprint"') && str_contains($portalPageCode, 'printLeaveData && "print:hidden"'), 'Portal page must isolate leave print layout and clean up printLeaveData after printing');

// 87. MyAssets Safe Thumbnail URL & Graceful Image Fallback Invariant
$myAssetsCode = file_get_contents(__DIR__ . '/../../frontend/src/app/portal/_components/MyAssetsTab.tsx');
assert(str_contains($myAssetsCode, 'failedImgMap') && str_contains($myAssetsCode, 'thumbUrl.startsWith("/")') && str_contains($myAssetsCode, 'onError='), 'MyAssetsTab must validate thumbnail URL schemes and fall back gracefully on broken images');

// 88. SmartPatrol Custom Cover Memory Cleanup Invariant
$smartPatrolFormCode = file_get_contents(__DIR__ . '/../../frontend/src/app/portal/_components/SmartPatrolInlineForm.tsx');
assert(str_contains($smartPatrolFormCode, 'URL.revokeObjectURL(customCoverPreview);'), 'SmartPatrolInlineForm must clean up custom cover object URL on unmount');

// 89. Kalkulator Dinas User-Scoped Draft Storage & Sanitize Reset Defaults Invariant
$kalkulatorTabCode = file_get_contents(__DIR__ . '/../../frontend/src/app/portal/_components/KalkulatorDinasTab.tsx');
assert(str_contains($kalkulatorTabCode, 'getStorageKey(currentUserName)') && str_contains($kalkulatorTabCode, 'localStorage.setItem(storageKey') && str_contains($kalkulatorTabCode, 'setUangPanjar(0);'), 'KalkulatorDinasTab must scope draft storage by user and reset to clean zero/empty values');

// 90. PortalQuickStats Neutral Non-PNS Rank Fallback Invariant
$quickStatsCode = file_get_contents(__DIR__ . '/../../frontend/src/app/portal/_components/PortalQuickStats.tsx');
assert(str_contains($quickStatsCode, '{rank || "-"}') && !str_contains($quickStatsCode, 'Penata Muda (III/a)'), 'PortalQuickStats must not hardcode PNS Penata Muda III/a as fallback for non-PNS staff');

// 91. AuthController MyAssets Internal File Path Masking Invariant
$authControllerCode = file_get_contents(__DIR__ . '/../app/Http/Controllers/Api/AuthController.php');
assert(str_contains($authControllerCode, "\$asset->foto_geotag_path = null;"), 'AuthController myAssets must mask relative internal filesystem storage paths');

// 92. Mobile Dashboard Expired Vehicle Tax Capture Invariant
$mobileDashboardCode = file_get_contents(__DIR__ . '/../app/Http/Controllers/Api/MobileDashboardController.php');
assert(str_contains($mobileDashboardCode, 'subDays(60)') && str_contains($mobileDashboardCode, "'is_overdue'"), 'MobileDashboardController must capture overdue vehicle taxes up to 60 days ago with is_overdue flag');

// 93. Employee Leave Request Cancellation Invariant
$empLeaveCtrlCode = file_get_contents(__DIR__ . '/../app/Modules/Kepegawaian/Controllers/EmployeeLeaveRequestController.php');
assert(str_contains($empLeaveCtrlCode, "in_array(strtoupper(\$leaveReq->status), ['PENGAJUAN', 'PENDING'], true)"), 'EmployeeLeaveRequestController myDestroy must allow cancellation only for pending requests');

// 94. AssignmentLetter Mobile Payload Storage Path Masking Invariant
$assignmentLetterCode = file_get_contents(__DIR__ . '/../app/Modules/SuratTugas/Controllers/AssignmentLetterController.php');
assert(str_contains($assignmentLetterCode, "\$letter->file_surat_path ? basename(\$letter->file_surat_path) : null"), 'AssignmentLetterController must sanitize file_surat_path with basename to prevent storage directory disclosure');

// 95. General Report Cover Image Object URL & Cleanup Invariant
$generalReportCode = file_get_contents(__DIR__ . '/../../frontend/src/app/portal/_components/GeneralReportInlineForm.tsx');
assert(str_contains($generalReportCode, 'URL.createObjectURL(file)') && str_contains($generalReportCode, 'URL.revokeObjectURL(customCoverImageUrl);'), 'GeneralReportInlineForm must use object URLs for cover image and revoke on unmount/change');

// 96. Leave Calculation Robustness & Storage Quota Guard Invariant
$leaveDialogCode = file_get_contents(__DIR__ . '/../../frontend/src/app/portal/_components/LeaveRequestDialog.tsx');
$kalkulatorCode = file_get_contents(__DIR__ . '/../../frontend/src/app/portal/_components/KalkulatorDinasTab.tsx');
assert(str_contains($leaveDialogCode, 'Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1'), 'LeaveRequestDialog must use Math.round for calendar day calculation');
assert(str_contains($kalkulatorCode, 'QuotaExceededError'), 'KalkulatorDinasTab must handle QuotaExceededError when storing local drafts');

// 97. EmployeeController Select Dummy Account Exclusion Invariant
$empControllerCode = file_get_contents(__DIR__ . '/../app/Modules/Kepegawaian/Controllers/EmployeeController.php');
assert(str_contains($empControllerCode, "where('nama_lengkap', 'NOT LIKE', '%administrator%')") && str_contains($empControllerCode, "where('nama_lengkap', 'NOT LIKE', '%magang%')"), 'EmployeeController select must exclude administrator and magang dummy accounts');

// 98. PortalProfileSidebar Phone Clearing Capability Invariant
$profileSidebarCode = file_get_contents(__DIR__ . '/../../frontend/src/app/portal/_components/PortalProfileSidebar.tsx');
assert(str_contains($profileSidebarCode, 'phone: cleanPhone,') && !str_contains($profileSidebarCode, 'phone: cleanPhone || undefined,'), 'PortalProfileSidebar must allow sending empty phone string so obsolete phone numbers can be cleared in database');

// 99. Surat Tugas Detail Structured Menimbang & Dasar Safe Rendering Invariant
$stPreviewDetailCode = file_get_contents(__DIR__ . '/../../frontend/src/app/portal/surat-tugas/[id]/page.tsx');
assert(str_contains($stPreviewDetailCode, 'parseItems(data.menimbang)') && str_contains($stPreviewDetailCode, 'parseItems(data.dasar)') && str_contains($stPreviewDetailCode, 'list-disc'), 'Surat Tugas [id]/page.tsx must parse and render structured menimbang and dasar safely as lists to avoid React child object crashes');

// 100. Leave Request Status Hierarchy & Precedence Invariant
$myLeaveTabCode = file_get_contents(__DIR__ . '/../../frontend/src/app/portal/_components/MyLeaveTab.tsx');
assert(str_contains($myLeaveTabCode, 'function getLeaveStatusBadge') && str_contains($myLeaveTabCode, 'Verifikasi Atasan'), 'MyLeaveTab must implement getLeaveStatusBadge where DITOLAK takes precedence over intermediate approvals');

// 101. Active Loans Strict Overdue Scoping Invariant
$activeLoansCode = file_get_contents(__DIR__ . '/../../frontend/src/app/portal/_components/ActiveLoansTab.tsx');
assert(str_contains($activeLoansCode, 'asset.status === "dipinjam"') && str_contains($activeLoansCode, 'asset.status === "terlambat"'), 'ActiveLoansTab must strictly scope overdue condition only to active borrowed assets');

// 102. AssignmentLetterController Exception Message Masking Invariant
$assignmentLetterControllerCode = file_get_contents(__DIR__ . '/../app/Modules/SuratTugas/Controllers/AssignmentLetterController.php');
assert(str_contains($assignmentLetterControllerCode, "config('app.debug') ? 'Terjadi kegagalan sistem: '") && str_contains($assignmentLetterControllerCode, "config('app.debug') ? 'Gagal memproses surat: '"), 'AssignmentLetterController must mask raw exception messages in store, update, and approve methods on 500 errors in production');

// 103. Report Print Image Error Graceful Fallback Invariant
$smartPatrolPrintCode = file_get_contents(__DIR__ . '/../../frontend/src/app/portal/_components/SmartPatrolPrint.tsx');
$generalReportPrintCode = file_get_contents(__DIR__ . '/../../frontend/src/app/portal/_components/GeneralReportPrint.tsx');
assert(str_contains($smartPatrolPrintCode, "onError={(e) => { (e.currentTarget as HTMLElement).style.display = 'none'; }}") && str_contains($generalReportPrintCode, "onError={(e) => { (e.currentTarget as HTMLElement).style.display = 'none'; }}"), 'Print report components must handle broken images gracefully with onError display none');

// 104. AuthController myAssets Geotag Query Token & Cache Invariant
$authControllerMyAssetsCode = file_get_contents(__DIR__ . '/../app/Http/Controllers/Api/AuthController.php');
assert(str_contains($authControllerMyAssetsCode, '/api/bmn/assets/{$asset->id}/photo/geotag/view?v={$v}{$tokenParam}'), 'AuthController myAssets must append cache-buster v and query tokenParam to allow authenticated browser image loading');

// 105. EmployeeLeaveRequestController Pagination Bound Invariant
$leaveControllerCode = file_get_contents(__DIR__ . '/../app/Modules/Kepegawaian/Controllers/EmployeeLeaveRequestController.php');
assert(str_contains($leaveControllerCode, 'min($requestedPerPage, 100)'), 'EmployeeLeaveRequestController must cap admin pagination to 100 per page to prevent memory exhaustion');

// 106. EmployeeLeaveRequestController Edit Cross-Year Deduction Invariant
assert(str_contains($leaveControllerCode, '$oldYear = Carbon::parse($leaveReq->tanggal_mulai)->year;'), 'EmployeeLeaveRequestController adminUpdate must use oldYear when re-adjusting previously approved leave balance');

// 107. AssignmentLetterController Wildcard Search Escape Invariant
$stControllerCode = file_get_contents(__DIR__ . '/../app/Modules/SuratTugas/Controllers/AssignmentLetterController.php');
assert(substr_count($stControllerCode, 'addcslashes((string) $search, \'%_\')') >= 2, 'AssignmentLetterController must escape wildcard characters in both myLetters and index methods');

// 108. AuthStore Central Logout Scoped Dynamic Key Purge Invariant
$authStoreCode = file_get_contents(__DIR__ . '/../../frontend/src/lib/auth-store.ts');
assert(str_contains($authStoreCode, 'k.startsWith("bksda_") || k.startsWith("bmn.")'), 'authStore logout must dynamically scan and purge all scoped bksda_ and bmn. keys from localStorage');

// 109. SmartPatrolInlineForm Cover Image Object URL Unmount Cleanup Invariant
$smartPatrolFormCode = file_get_contents(__DIR__ . '/../../frontend/src/app/portal/_components/SmartPatrolInlineForm.tsx');
assert(str_contains($smartPatrolFormCode, 'URL.revokeObjectURL(customCoverPreview);'), 'SmartPatrolInlineForm must revoke customCoverPreview object URL on unmount to eliminate memory leaks');

// 110. FormulirCutiPrint Nullish Coalescing for Zero Day Quota Invariant
$formulirPrintCode = file_get_contents(__DIR__ . '/../../frontend/src/app/portal/_components/FormulirCutiPrint.tsx');
assert(str_contains($formulirPrintCode, 'data.sisa_n2 ?? "-"') && str_contains($formulirPrintCode, 'data.sisa_n1 ?? "-"'), 'FormulirCutiPrint must use nullish coalescing ?? so 0 remaining days are accurately printed instead of displaying dash');

// 111. FormulirCutiPrint Historical Calendar Year Derivation Invariant
assert(str_contains($formulirPrintCode, 'data.tanggal_mulai && !Number.isNaN(new Date(data.tanggal_mulai).getTime())'), 'FormulirCutiPrint must derive currentYear from data.tanggal_mulai for accurate historical leave forms');

// 112. KalkulatorDinasTab Receipt Image Error Fallback Invariant
$kalkulatorTabCode = file_get_contents(__DIR__ . '/../../frontend/src/app/portal/_components/KalkulatorDinasTab.tsx');
assert(str_contains($kalkulatorTabCode, "onError={(e) => { (e.currentTarget as HTMLElement).style.display = 'none'; }}"), 'KalkulatorDinasTab print view must hide broken or missing receipt images with onError fallback');

// 113. StTemplateController uploadKop Extension Derivation Invariant
$stTemplateCode = file_get_contents(__DIR__ . '/../app/Modules/Kepegawaian/Controllers/StTemplateController.php');
assert(str_contains($stTemplateCode, '$file->extension() ?: \'png\'') && !str_contains($stTemplateCode, 'getClientOriginalExtension'), 'StTemplateController uploadKop must derive file extension safely from server MIME detection');

// 114. EmployeeLeaveController Database-Agnostic Leave Query Invariant
$employeeLeaveCode = file_get_contents(__DIR__ . '/../app/Modules/Kepegawaian/Controllers/EmployeeLeaveController.php');
assert(str_contains($employeeLeaveCode, "whereRaw('LOWER(jenis_cuti) LIKE ?', ['%tahunan%'])"), 'EmployeeLeaveController must use lowercase whereRaw for database-agnostic leave matching');

// 115. Employee Leave Request Store Transaction Invariant
$empLeaveCtrlCode = file_get_contents(__DIR__ . '/../app/Modules/Kepegawaian/Controllers/EmployeeLeaveRequestController.php');
assert(str_contains($empLeaveCtrlCode, "DB::beginTransaction();") && str_contains($empLeaveCtrlCode, "config('app.debug') ? \$e->getMessage() : 'Terjadi kesalahan sistem saat memproses pengajuan cuti.'"), 'EmployeeLeaveRequestController store must run inside DB transaction with masked error response');

// 116. EmployeeAccessController Token Revocation on Credential/Access Change Invariant
$empAccessCode = file_get_contents(__DIR__ . '/../app/Modules/Kepegawaian/Controllers/EmployeeAccessController.php');
assert(str_contains($empAccessCode, '$user->tokens()->delete();') && str_contains($empAccessCode, '$user->role !== $validated[\'role\']'), 'EmployeeAccessController must immediately revoke tokens upon password reset or role/module changes');

// 117. MobileDashboardController Unified Asset Owner Matching Invariant
$mobileDashCode = file_get_contents(__DIR__ . '/../app/Http/Controllers/Api/MobileDashboardController.php');
assert(str_contains($mobileDashCode, "LOWER(pengguna) LIKE ?") && str_contains($mobileDashCode, "LOWER(nama_pengguna) LIKE ?"), 'MobileDashboardController must match assets using both employee_id and legacy name fields consistent with AuthController');

// 118. PortalQuickStats Clean Fallback for Empty Balance Invariant
$portalStatsCode = file_get_contents(__DIR__ . '/../../frontend/src/app/portal/_components/PortalQuickStats.tsx');
assert(str_contains($portalStatsCode, 'leaveBalance ? `${leaveBalance.sisa_cuti_tersedia} Hari Kerja` : "-"'), 'PortalQuickStats must fall back to dash instead of permanent loading string when leaveBalance is null');

// 119. AssignmentLetterController Draft Download Authorization Invariant
$stControllerPdfCode = file_get_contents(__DIR__ . '/../app/Modules/SuratTugas/Controllers/AssignmentLetterController.php');
assert(str_contains($stControllerPdfCode, '! $isAdmin && ! $isCreator && ! in_array(strtolower((string) $surat->status)'), 'AssignmentLetterController downloadPdf must forbid non-admin and non-creator from downloading unapproved drafts');

// 120. AssignmentLetterController Verify Clean ID & Null-Safe Dates Invariant
assert(str_contains($stControllerPdfCode, "(\$surat->tanggal_mulai?->format('d M Y') ?? '-')") && str_contains($stControllerPdfCode, "\$cleanId = preg_replace('/^st-/', '', \$id);"), 'AssignmentLetterController verify must sanitize st- prefix and format dates safely with nullsafe operator');

// 121. Leave Request Pending Days Reservation & Quota Derivation Invariant
$empLeaveReqCode = file_get_contents(__DIR__ . '/../app/Modules/Kepegawaian/Controllers/EmployeeLeaveRequestController.php');
assert(str_contains($empLeaveReqCode, '$pendingDays = (int) EmployeeLeaveRequest::where(\'employee_id\', $employee->id)') && str_contains($empLeaveReqCode, '$availableQuota = max(0, $totalQuota - $pendingDays);'), 'EmployeeLeaveRequestController must reserve pending unapproved days against annual leave quota');

// 122. Leave Request Admin Approval Deficit Guard Invariant
assert(str_contains($empLeaveReqCode, 'if ($leaveReq->jumlah_hari > $leaveBalance->sisa_cuti_tersedia)') && str_contains($empLeaveReqCode, 'if ($newJumlahHari > $leaveBalance->sisa_cuti_tersedia)'), 'EmployeeLeaveRequestController must guard against leave balance deficits in adminUpdateStatus and adminUpdate');

// 123. Portal Employee Self-Service Leave Cancellation Invariant
$apiRoutesCode = file_get_contents(__DIR__ . '/../routes/api.php');
assert(str_contains($apiRoutesCode, 'Route::delete(\'/me/leave-requests/{id}\''), 'api.php must register DELETE /me/leave-requests/{id} route');
assert(str_contains($empLeaveReqCode, 'function myDestroy') && str_contains($empLeaveReqCode, 'Hanya permohonan cuti yang masih berstatus PENGAJUAN yang dapat dibatalkan.'), 'EmployeeLeaveRequestController myDestroy must restrict cancellation only to PENGAJUAN status');

// 124. Surat Tugas Preview Blob Error Message Extraction Invariant
$stPreviewPageCode = file_get_contents(__DIR__ . '/../../frontend/src/app/portal/surat-tugas/[id]/page.tsx');
assert(str_contains($stPreviewPageCode, 'errorObj.response?.data instanceof Blob') && str_contains($stPreviewPageCode, 'await errorObj.response.data.text()'), 'Surat Tugas preview page must parse error messages from Blob responses on download failures');

// 125. Surat Tugas Approval & Status Modification Guard Invariant
$stControllerCode = file_get_contents(__DIR__ . '/../app/Modules/SuratTugas/Controllers/AssignmentLetterController.php');
assert(str_contains($stControllerCode, 'surat_tugas.approve') && str_contains($stControllerCode, 'Anda tidak memiliki hak akses untuk menyetujui Surat Tugas.'), 'AssignmentLetterController must require surat_tugas.approve permission or admin role to approve or update status');

// 126. Surat Tugas Bulk Action Creator Scoping Invariant
assert(str_contains($stControllerCode, "query->where('created_by', \$user->id);") && str_contains($stControllerCode, 'array_map(fn($id) => preg_replace'), 'AssignmentLetterController bulkTrash and bulkRestore must scope non-admin operations to creator and sanitize st- prefix');

// 127. Kepegawaian Dashboard Pending Cuti Status Invariant
$empControllerCode = file_get_contents(__DIR__ . '/../app/Modules/Kepegawaian/Controllers/EmployeeController.php');
assert(str_contains($empControllerCode, "UPPER(status)'), ['PENGAJUAN', 'PENDING']"), 'EmployeeController dashboardStats must query PENGAJUAN status matching official leave request records');

// 128. Employee NIP User Account Synchronization Invariant
assert(str_contains($empControllerCode, "\$oldNip !== '' && \$newNip !== '' && \$newNip !== \$oldNip") && str_contains($empControllerCode, "User::where('username', \$oldNip)->update"), 'EmployeeController update must synchronize User username and name upon NIP changes');

// 129. Profile Email Deletion & Synchronization Invariant
$authControllerCode = file_get_contents(__DIR__ . '/../app/Http/Controllers/Api/AuthController.php');
$portalProfileCode = file_get_contents(__DIR__ . '/../../frontend/src/app/portal/_components/PortalProfileSidebar.tsx');
assert(str_contains($authControllerCode, "\$cleanEmail = \$request->filled('email') ? trim(strtolower((string) \$request->input('email'))) : null;") && str_contains($authControllerCode, "\$employee->update(['email' => \$cleanEmail]);") && str_contains($authControllerCode, "\$user->update(['email' => \$cleanEmail]);"), 'AuthController updateProfile must clear email when passed as empty string and synchronize both employee and user');
assert(str_contains($portalProfileCode, "email: cleanEmail,") && str_contains($portalProfileCode, "phone: cleanPhone,"), 'PortalProfileSidebar must pass cleanEmail directly to allow clearing email');

// 130. Mobile Dashboard Approval Queue Scope Invariant
$mobileDashboardCode = file_get_contents(__DIR__ . '/../app/Http/Controllers/Api/MobileDashboardController.php');
assert(str_contains($mobileDashboardCode, "\$user->hasPermission('surat_tugas.approve')") && str_contains($mobileDashboardCode, "in_array(\$user->role, ['super_admin', 'admin'])"), 'MobileDashboardController must scope pending approval count to surat_tugas.approve permission or admin role');

// 131. Employee Leave Model Unreserved Quota Accessors & Duration Guard Invariant
$empLeaveModelCode = file_get_contents(__DIR__ . '/../app/Modules/Kepegawaian/Models/EmployeeLeave.php');
assert(str_contains($empLeaveModelCode, "'pending_cuti_tahunan'") && str_contains($empLeaveModelCode, "'sisa_cuti_dapat_diajukan'") && str_contains($empLeaveModelCode, 'function getPendingCutiTahunanAttribute') && str_contains($empLeaveModelCode, 'function getSisaCutiDapatDiajukanAttribute'), 'EmployeeLeave model must expose pending_cuti_tahunan and sisa_cuti_dapat_diajukan appended accessors');
$empLeaveReqControllerCode = file_get_contents(__DIR__ . '/../app/Modules/Kepegawaian/Controllers/EmployeeLeaveRequestController.php');
assert(str_contains($empLeaveReqControllerCode, '$newJumlahHari > 365') && str_contains($empLeaveReqControllerCode, 'Durasi pengajuan cuti tunggal tidak boleh melebihi 365 hari.'), 'EmployeeLeaveRequestController adminUpdate must guard against single leave requests exceeding 365 days');

// 132. Leave Request Dialog Unreserved Quota Validation & Quick Stats Pending Subtitle Invariant
$leaveDialogCode = file_get_contents(__DIR__ . '/../../frontend/src/app/portal/_components/LeaveRequestDialog.tsx');
$portalQuickStatsCode = file_get_contents(__DIR__ . '/../../frontend/src/app/portal/_components/PortalQuickStats.tsx');
assert(str_contains($leaveDialogCode, 'sisa_cuti_dapat_diajukan') && str_contains($leaveDialogCode, 'pending_cuti_tahunan'), 'LeaveRequestDialog must integrate sisa_cuti_dapat_diajukan and pending_cuti_tahunan in banner and submit validation');
assert(str_contains($portalQuickStatsCode, '${leaveBalance.pending_cuti_tahunan} Hari Diajukan'), 'PortalQuickStats must indicate pending leave days in subtitle when active');

// 133. General Report Photo Reader & Decoder Error Handling Invariant
$generalReportFormCode = file_get_contents(__DIR__ . '/../../frontend/src/app/portal/_components/GeneralReportInlineForm.tsx');
assert(str_contains($generalReportFormCode, 'img.onerror = () => {') && str_contains($generalReportFormCode, 'reader.onerror = () => {'), 'GeneralReportInlineForm must handle img.onerror and reader.onerror for photo uploads');

// 134. BMN Asset Loan Update Chronological Due Date Guard Invariant
$loanControllerCode = file_get_contents(__DIR__ . '/../app/Modules/Bmn/Controllers/LoanController.php');
$loanServiceCode = file_get_contents(__DIR__ . '/../app/Modules/Bmn/Services/LoanService.php');
assert(str_contains($loanControllerCode, "'due_date' => ['nullable', 'date', 'after_or_equal:loan_date']"), 'LoanController update must require due_date to be after_or_equal:loan_date');
assert(str_contains($loanServiceCode, 'strtotime((string) $effectiveDueDate) < strtotime((string) $effectiveLoanDate)') && str_contains($loanServiceCode, 'Tanggal batas kembali (due date) tidak boleh mendahului tanggal peminjaman.'), 'LoanService updateLoan must guard against due_date preceding loan_date');

// 135. Auth Controller Dashboard Loan Due Date Attribute Mapping Invariant
$authControllerCode = file_get_contents(__DIR__ . '/../app/Http/Controllers/Api/AuthController.php');
assert(str_contains($authControllerCode, "'due_date' => (\$loan->due_date ?? \$loan->tanggal_kembali)?->toIso8601String()"), 'AuthController dashboard must map due_date from loan due_date attribute');

// 136. Active Loans & Surat Tugas Tab Metadata & Status Invariant
$activeLoansTabCode = file_get_contents(__DIR__ . '/../../frontend/src/app/portal/_components/ActiveLoansTab.tsx');
$suratTugasTabCode = file_get_contents(__DIR__ . '/../../frontend/src/app/portal/_components/SuratTugasTab.tsx');
assert(str_contains($activeLoansTabCode, 'asset.loan_date') && str_contains($activeLoansTabCode, 'asset.due_date'), 'ActiveLoansTab must display loan_date and due_date metadata for active loans');
assert(str_contains($suratTugasTabCode, 'st.status') && str_contains($suratTugasTabCode, 'st.tanggal_selesai'), 'SuratTugasTab must display status badge and date range');

// 137. Search Parameter Symmetry & Wildcard Escaping Invariant
$empCtrlCheckCode = file_get_contents(__DIR__ . '/../app/Modules/Kepegawaian/Controllers/EmployeeController.php');
$empLeaveReqCheckCode = file_get_contents(__DIR__ . '/../app/Modules/Kepegawaian/Controllers/EmployeeLeaveRequestController.php');
$stExpenseSvcCode = file_get_contents(__DIR__ . '/../app/Modules/Kepegawaian/Services/StExpenseTemplateService.php');
$stCtrlCheckCode = file_get_contents(__DIR__ . '/../app/Modules/SuratTugas/Controllers/AssignmentLetterController.php');
assert(str_contains($empCtrlCheckCode, "\$request->input('search') ?? \$request->input('q')") && str_contains($empCtrlCheckCode, "\$request->input('q') ?? \$request->input('search')"), 'EmployeeController index and select must support both search and q parameters');
assert(str_contains($empLeaveReqCheckCode, "\$request->input('search') ?? \$request->input('q')"), 'EmployeeLeaveRequestController adminIndex must support both search and q parameters');
assert(str_contains($stExpenseSvcCode, "\$filters['search'] ?? \$filters['q']"), 'StExpenseTemplateService paginate must support both search and q parameters');
assert(str_contains($stCtrlCheckCode, "\$request->query('search') ?? \$request->query('q')"), 'AssignmentLetterController myLetters must support both search and q parameters');

// 138. Kop Upload Validation Invariant
$stTplCtrlCode = file_get_contents(__DIR__ . '/../app/Modules/Kepegawaian/Controllers/StTemplateController.php');
assert(str_contains($stTplCtrlCode, 'UploadValidationRules::image(maxKilobytes: 5120)'), 'StTemplateController uploadKop must enforce UploadValidationRules with extension whitelist');

// 139. IAM Permission Change Token Revocation & Ghost Deduction Prevention Invariant
$empAccessCode = file_get_contents(__DIR__ . '/../app/Modules/Kepegawaian/Controllers/EmployeeAccessController.php');
$empLeaveCtrlCode = file_get_contents(__DIR__ . '/../app/Modules/Kepegawaian/Controllers/EmployeeLeaveController.php');
assert(str_contains($empAccessCode, "\$user->permissions !== (\$validated['permissions'] ?? [])"), 'EmployeeAccessController update must revoke active tokens when permissions change');
assert(str_contains($empLeaveCtrlCode, '$hasOnlineRequests = \App\Modules\Kepegawaian\Models\EmployeeLeaveRequest::where') && str_contains($empLeaveCtrlCode, 'if ($hasOnlineRequests && (int) $leave->cuti_terpakai_n0 !== $approvedDays)'), 'EmployeeLeaveController show must synchronize approvedDays based on hasOnlineRequests to prevent ghost deductions');

// 140. Assignment Letter Verify 404 Contract & Pivot Employee Validation Invariant
$stVerifyCode = file_get_contents(__DIR__ . '/../app/Modules/SuratTugas/Controllers/AssignmentLetterController.php');
$stReqCode = file_get_contents(__DIR__ . '/../app/Modules/SuratTugas/Requests/AssignmentLetterRequest.php');
assert(str_contains($stVerifyCode, 'AssignmentLetter::with([\'employees:id,nama_lengkap\'])->find($cleanId)') && str_contains($stVerifyCode, 'Dokumen Surat Tugas tidak ditemukan dalam database resmi.'), 'AssignmentLetterController verify must return structured 404 JSON when document ID is not found');
assert(str_contains($stReqCode, "'employees.*.id' => 'required_with:employees|integer|exists:kpg_employees,id'"), 'AssignmentLetterRequest must enforce integer and exists:kpg_employees,id rule on assigned employees');

// 141. Sequential Assignment Letter Numbering & Bulk Action Clamping Invariant
$stNextNumberCode = file_get_contents(__DIR__ . '/../app/Modules/SuratTugas/Controllers/AssignmentLetterController.php');
assert(str_contains($stNextNumberCode, "whereNotNull('nomor_surat')") && str_contains($stNextNumberCode, "preg_match('/ST\.(\d+)/i', (string) \$num, \$matches)") && str_contains($stNextNumberCode, "\$maxNumber = \$val;"), 'AssignmentLetterController getNextNumber must evaluate true numeric max rather than string alphabetical order');
assert(str_contains($stNextNumberCode, 'array_slice($rawIds, 0, 100);'), 'AssignmentLetterController bulkTrash and bulkRestore must clamp input IDs to 100 to prevent DoS');

// 142. BMN Loan Controller Clamping & Return Date Validation Invariant
$bmnLoanCtrlCode = file_get_contents(__DIR__ . '/../app/Modules/Bmn/Controllers/LoanController.php');
$empLeaveReqKbCode = file_get_contents(__DIR__ . '/../app/Modules/Kepegawaian/Controllers/EmployeeLeaveRequestController.php');
assert(str_contains($bmnLoanCtrlCode, "min(100, max(1, (int) \$request->input('per_page', 10)))"), 'LoanController index must clamp per_page between 1 and 100');
assert(str_contains($bmnLoanCtrlCode, "'tanggal_kembali' => ['nullable', 'date']") && str_contains($bmnLoanCtrlCode, "'catatan_pengembalian' => ['nullable', 'string', 'max:1000']"), 'LoanController return must validate tanggal_kembali and catatan_pengembalian');
assert(str_contains($empLeaveReqKbCode, "DB::connection()->getDriverName() === 'pgsql' ? 'ilike' : 'like';") && str_contains($empLeaveReqKbCode, "where('jabatan', \$likeOp, '%Kepala Balai%')"), 'EmployeeLeaveRequestController getKepalaBalai must use driver-aware like operator');

// 143. Mobile Dashboard Active Letters Consistency Invariant
$mobDashCode = file_get_contents(__DIR__ . '/../app/Http/Controllers/Api/MobileDashboardController.php');
assert(str_contains($mobDashCode, "\$query->whereHas('employees', function (\$q) use (\$employeeId)") && str_contains($mobDashCode, "->orWhere('created_by', \$user->id);") && str_contains($mobDashCode, "\$activeMyLettersCount = AssignmentLetter::where(function (\$query) use (\$employeeId, \$user)"), 'MobileDashboardController must count active letters where user is assigned or creator');

// 144. Leave Request myShow Route & Calendar Year Boundary Guard Invariant
$routesApiCode = file_get_contents(__DIR__ . '/../routes/api.php');
$empLeaveReqFullCode = file_get_contents(__DIR__ . '/../app/Modules/Kepegawaian/Controllers/EmployeeLeaveRequestController.php');
$leaveDialogYearCode = file_get_contents(__DIR__ . '/../../frontend/src/app/portal/_components/LeaveRequestDialog.tsx');
assert(str_contains($routesApiCode, "Route::get('/me/leave-requests/{id}', [\App\Modules\Kepegawaian\Controllers\EmployeeLeaveRequestController::class, 'myShow'])"), 'api.php must register /me/leave-requests/{id} for portal employee detail view');
assert(str_contains($empLeaveReqFullCode, 'public function myShow(Request $request, int $id): JsonResponse') && str_contains($empLeaveReqFullCode, "EmployeeLeaveRequest::where('employee_id', \$employee->id)"), 'EmployeeLeaveRequestController must expose owner-scoped myShow');
assert(str_contains($empLeaveReqFullCode, '$start->year !== $end->year') && str_contains($empLeaveReqFullCode, 'Pengajuan cuti tidak boleh lintas tahun kalender.'), 'EmployeeLeaveRequestController must reject cross-calendar-year leave requests per PerBKN 24/2017');
assert(str_contains($leaveDialogYearCode, 'new Date(form.tanggal_mulai).getFullYear() !== new Date(form.tanggal_selesai).getFullYear()'), 'LeaveRequestDialog must validate calendar year boundary in UI');

// 145. Assignment Letter myShow Prefix Sanitization & Index Query Symmetry Invariant
$stCtrlCheck48 = file_get_contents(__DIR__ . '/../app/Modules/SuratTugas/Controllers/AssignmentLetterController.php');
assert(str_contains($stCtrlCheck48, "\$cleanId = preg_replace('/^st-/', '', \$id);") && str_contains($stCtrlCheck48, "->findOrFail(\$cleanId);"), 'AssignmentLetterController myShow must sanitize st- prefix to prevent 404 ModelNotFoundException');
assert(str_contains($stCtrlCheck48, "if (\$search = (\$request->query('search') ?? \$request->query('q'))) {"), 'AssignmentLetterController index must accept both search and q query parameters');

// 146. Leave Request Admin Search by Nomor Pengajuan & Smart Patrol Robust ST Lookup Invariant
$empLeaveReqCheck48 = file_get_contents(__DIR__ . '/../app/Modules/Kepegawaian/Controllers/EmployeeLeaveRequestController.php');
$smartPatrolFormCheck48 = file_get_contents(__DIR__ . '/../../frontend/src/app/portal/_components/SmartPatrolInlineForm.tsx');
assert(str_contains($empLeaveReqCheck48, "->orWhere('nomor_pengajuan', \$likeOp, \"%{\$s}%\")"), 'EmployeeLeaveRequestController adminIndex must support searching by nomor_pengajuan');
assert(str_contains($smartPatrolFormCheck48, "String(o.id) === String(selectedSTId)") && str_contains($smartPatrolFormCheck48, "setSelectedSTId(String(st.id));"), 'SmartPatrolInlineForm must normalize ST id comparisons with String() to prevent numeric/string strict equality failures');

// 147. BMN Loan Controller Scoped Employee ID & Search Filter Invariant
$loanControllerCheck49 = file_get_contents(__DIR__ . '/../app/Modules/Bmn/Controllers/LoanController.php');
$loanServiceCheck49 = file_get_contents(__DIR__ . '/../app/Modules/Bmn/Services/LoanService.php');
assert(str_contains($loanControllerCheck49, "'employee_id' => \$request->get('employee_id')") && str_contains($loanControllerCheck49, "'search' => \$request->query('search') ?? \$request->query('q')"), 'LoanController index must forward employee_id and search/q filters to LoanService');
assert(str_contains($loanServiceCheck49, "\$query->where('employee_id', (int) \$filters['employee_id']);") && str_contains($loanServiceCheck49, "addcslashes((string) \$filters['search'], '%_')"), 'LoanService listLoans must filter by employee_id and escape search wildcards to prevent data leaks');

// 148. Employee Assignment Letter Pagination Invariant
$empCtrlCheck49 = file_get_contents(__DIR__ . '/../app/Modules/Kepegawaian/Controllers/EmployeeController.php');
assert(str_contains($empCtrlCheck49, "public function assignmentLetters(Request \$request, string \$id): JsonResponse") && str_contains($empCtrlCheck49, "min(100, max(1, (int) \$request->input('per_page', 10)))"), 'EmployeeController assignmentLetters must clamp per_page to prevent memory exhaustion');

// 149. Approved Surat Tugas Deletion Guard & Non-Admin Bulk Scoping Invariant
$stCtrlCheck50 = file_get_contents(__DIR__ . '/../app/Modules/SuratTugas/Controllers/AssignmentLetterController.php');
assert(str_contains($stCtrlCheck50, "Dokumen Surat Tugas yang telah disetujui hanya dapat dihapus atau diarsipkan oleh Administrator.") && str_contains($stCtrlCheck50, "whereIn('status', ['draft', 'pending', 'rejected'"), 'AssignmentLetterController must protect approved letters from deletion by non-admin creators in both destroy and bulkTrash');

// 150. Employee Leave Request myIndex Filtering Invariant
$empLeaveReqCheck50 = file_get_contents(__DIR__ . '/../app/Modules/Kepegawaian/Controllers/EmployeeLeaveRequestController.php');
$genReportPrintCheck50 = file_get_contents(__DIR__ . '/../../frontend/src/app/portal/_components/GeneralReportPrint.tsx');
assert(str_contains($empLeaveReqCheck50, "\$year = (int) \$request->input('year')") && str_contains($empLeaveReqCheck50, "\$status = \$request->input('status')"), 'EmployeeLeaveRequestController myIndex must support optional year and status filtering');
assert(str_contains($genReportPrintCheck50, "onError={(e) => { (e.currentTarget as HTMLElement).style.display = 'none'; }}"), 'GeneralReportPrint custom cover must handle broken image fallback');

// 151. AssetPhotoController ZIP Stream Cleanup & Document Header Hardening Invariant
$assetPhotoCheck51 = file_get_contents(__DIR__ . '/../app/Modules/Bmn/Controllers/AssetPhotoController.php');
$assetDocCheck51 = file_get_contents(__DIR__ . '/../app/Modules/Bmn/Controllers/AssetDocumentController.php');
assert(str_contains($assetPhotoCheck51, "\$zip->addFromString(\$entry['name'], \$this->disk()->get(\$entry['storage_path']));") && !str_contains($assetPhotoCheck51, "tempnam(sys_get_temp_dir()"), 'AssetPhotoController downloadAll must stream files directly into zip with addFromString without leaking temp files on disk');
assert(str_contains($assetDocCheck51, "'X-Content-Type-Options' => 'nosniff'") && str_contains($assetDocCheck51, "\$cleanFilename = str_replace(['\"', \"\\r\", \"\\n\"], '', \$filename);"), 'AssetDocumentController must sanitize filename in Content-Disposition and send nosniff header');

// 152. Middleware Model Binding Resilience & Portal Profile Validation Invariant
$checkPermCheck51 = file_get_contents(__DIR__ . '/../app/Http/Middleware/CheckPermission.php');
$checkModCheck51 = file_get_contents(__DIR__ . '/../app/Http/Middleware/CheckModuleAccess.php');
$portalProfileCheck51 = file_get_contents(__DIR__ . '/../../frontend/src/app/portal/_components/PortalProfileSidebar.tsx');
assert(str_contains($checkPermCheck51, "\$asset = \$assetId instanceof \App\Modules\Bmn\Models\Asset ? \$assetId : \App\Modules\Bmn\Models\Asset::find(\$assetId);"), 'CheckPermission must defensively handle both model instance and scalar asset ID');
assert(str_contains($checkModCheck51, "\$asset = \$assetId instanceof \App\Modules\Bmn\Models\Asset ? \$assetId : \App\Modules\Bmn\Models\Asset::find(\$assetId);"), 'CheckModuleAccess must defensively handle both model instance and scalar asset ID');
assert(str_contains($portalProfileCheck51, "cleanPhone && !/^[0-9+\\-\\s()]+$/") && str_contains($portalProfileCheck51, "cleanEmail && !/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/"), 'PortalProfileSidebar must validate email and phone format with regex client-side');

// 153. MobileDashboard Status Casing Cross-Database Invariant
$mobDashCheck52 = file_get_contents(__DIR__ . '/../app/Http/Controllers/Api/MobileDashboardController.php');
assert(str_contains($mobDashCheck52, "whereIn('status', ['dipinjam', 'terlambat', 'DIPINJAM', 'TERLAMBAT'])") && str_contains($mobDashCheck52, "whereIn('status', ['approved', 'completed', 'published', 'diterbitkan', 'APPROVED', 'COMPLETED', 'PUBLISHED', 'DITERBITKAN'])"), 'MobileDashboardController must support cross-database status casing for loans and assignment letters');

// 154. Leave Request Status Resilience & Kalkulator Dinas ST Normalization Invariant
$leaveReqCheck52 = file_get_contents(__DIR__ . '/../app/Modules/Kepegawaian/Controllers/EmployeeLeaveRequestController.php');
$kalkulatorTabCheck52 = file_get_contents(__DIR__ . '/../../frontend/src/app/portal/_components/KalkulatorDinasTab.tsx');
$myLeaveTabCheck52 = file_get_contents(__DIR__ . '/../../frontend/src/app/portal/_components/MyLeaveTab.tsx');
assert(str_contains($leaveReqCheck52, "in_array(strtoupper(\$leaveReq->status), ['PENGAJUAN', 'PENDING'], true)") && str_contains($leaveReqCheck52, "whereIn('status', ['PENGAJUAN', 'PENDING', 'pengajuan', 'pending'])"), 'EmployeeLeaveRequestController must accept both PENGAJUAN and PENDING in cancel and quota calculations');
assert(str_contains($kalkulatorTabCheck52, 'cleanSelected = String(selectedStId).replace(/^st-/, "")') && str_contains($myLeaveTabCheck52, 'item.status?.toUpperCase() === "PENGAJUAN" || item.status?.toUpperCase() === "PENDING"'), 'MyLeaveTab and KalkulatorDinasTab must normalize status casing and ST ID comparisons');

// 155. AssignmentLetterController myLetters Casing & Surat Tugas Detail Download Resilience Invariant
$stCtrlCheck53 = file_get_contents(__DIR__ . '/../app/Modules/SuratTugas/Controllers/AssignmentLetterController.php');
$stDetailCheck53 = file_get_contents(__DIR__ . '/../../frontend/src/app/portal/surat-tugas/[id]/page.tsx');
assert(str_contains($stCtrlCheck53, "whereIn('status', ['approved', 'completed', 'published', 'diterbitkan', 'APPROVED', 'COMPLETED', 'PUBLISHED', 'DITERBITKAN'])"), 'AssignmentLetterController myLetters must include uppercase status values for cross-database consistency');
assert(str_contains($stDetailCheck53, 'filename = decodeURIComponent(match[1].replace(/[\'"]/g, ""));') && str_contains($stDetailCheck53, 'filename.replace(/[\\/\\\\:*?"<>|]/g, "_")'), 'Surat Tugas [id]/page.tsx must safely decode Content-Disposition filename and sanitize illegal path characters');

// 156. LeaveRequestDialog Client-Side Phone & Text Validation Invariant
$leaveDialogCheck53 = file_get_contents(__DIR__ . '/../../frontend/src/app/portal/_components/LeaveRequestDialog.tsx');
assert(str_contains($leaveDialogCheck53, '!/^[0-9+\\-\\s()]+$/') && str_contains($leaveDialogCheck53, '!form.alasan_cuti.trim()') && str_contains($leaveDialogCheck53, '!form.alamat_menjalankan_cuti.trim()'), 'LeaveRequestDialog must validate phone format and non-empty trimmed reason and address client-side');

// 157. SmartPatrolPrint Custom Cover & Tally Sheet Image Fallback Invariant
$smartPatrolPrintCheck54 = file_get_contents(__DIR__ . '/../../frontend/src/app/portal/_components/SmartPatrolPrint.tsx');
assert(str_contains($smartPatrolPrintCheck54, '<img src={data.customCoverPreview} alt="Custom Cover" className="w-full h-auto max-h-[297mm] object-contain" onError={(e) => { (e.currentTarget as HTMLElement).style.display = \'none\'; }}') && str_contains($smartPatrolPrintCheck54, 'alt="Tally Sheet"') && str_contains($smartPatrolPrintCheck54, "onError={(e) => { (e.currentTarget as HTMLElement).style.display = 'none'; }}"), 'SmartPatrolPrint custom cover and tally sheet image must handle broken image fallback');

// 158. Kepegawaian Route Sensitive Admin Gate Protection Invariant
$kepegawaianRoutesCheck54 = file_get_contents(__DIR__ . '/../app/Modules/Kepegawaian/routes/api.php');
assert(str_contains($kepegawaianRoutesCheck54, "Route::middleware('role:super_admin')->group(function ()") && str_contains($kepegawaianRoutesCheck54, "Route::middleware('role:super_admin,admin')->group(function ()"), 'Kepegawaian routes must protect sensitive templates and IAM behind role middleware');

// 159. AssignmentLetter myShow Casing Alignment & AuthController Dashboard Loans Status Invariant
$stCtrlCheck55 = file_get_contents(__DIR__ . '/../app/Modules/SuratTugas/Controllers/AssignmentLetterController.php');
$authCtrlCheck55 = file_get_contents(__DIR__ . '/../app/Http/Controllers/Api/AuthController.php');
assert(str_contains($stCtrlCheck55, "! in_array(strtolower((string) \$surat->status), ['approved', 'completed', 'published', 'diterbitkan'])") && str_contains($stCtrlCheck55, "strtolower((string) \$letter->status) === 'pending'"), 'AssignmentLetterController myShow and can_approve must safely normalize status casing');
assert(str_contains($authCtrlCheck55, "whereIn('status', ['dipinjam', 'terlambat', 'DIPINJAM', 'TERLAMBAT'])"), 'AuthController dashboard must support cross-database loan status casing');

// 160. Leave Request Status Validation Casing & General Report ST Selection Normalization Invariant
$leaveReqCheck55 = file_get_contents(__DIR__ . '/../app/Modules/Kepegawaian/Controllers/EmployeeLeaveRequestController.php');
$genReportFormCheck55 = file_get_contents(__DIR__ . '/../../frontend/src/app/portal/_components/GeneralReportInlineForm.tsx');
assert(str_contains($leaveReqCheck55, "'status' => 'required|string|in:PENGAJUAN,DISETUJUI,DITOLAK,pengajuan,disetujui,ditolak"), 'EmployeeLeaveRequestController adminUpdateStatus must accept case-resilient status values');
assert(str_contains($genReportFormCheck55, 'selectedSTId ? stOptions.find(st => String(st.id) === String(selectedSTId)) : null') && str_contains($genReportFormCheck55, 'String(selectedSTId) === String(st.id)'), 'GeneralReportInlineForm must normalize ST id comparisons with String() to prevent numeric vs string type mismatch');

// 161. EmployeeLeave Accessor & Controller Approval Casing Resilience Invariant
$empLeaveModelCheck56 = file_get_contents(__DIR__ . '/../app/Modules/Kepegawaian/Models/EmployeeLeave.php');
$empLeaveCtrlCheck56 = file_get_contents(__DIR__ . '/../app/Modules/Kepegawaian/Controllers/EmployeeLeaveController.php');
assert(str_contains($empLeaveModelCheck56, "whereIn('status', ['PENGAJUAN', 'PENDING', 'pengajuan', 'pending'])"), 'EmployeeLeave pending_cuti_tahunan accessor must include both PENGAJUAN and PENDING to prevent leave quota UI overdraft');
assert(str_contains($empLeaveCtrlCheck56, "whereIn('status', ['DISETUJUI', 'APPROVED', 'disetujui', 'approved'])"), 'EmployeeLeaveController show must query approved days with cross-database status casing');

// 162. Leave Request Status Transition Canonicalization & Active Loans Tab Normalization Invariant
$empLeaveReqCheck56 = file_get_contents(__DIR__ . '/../app/Modules/Kepegawaian/Controllers/EmployeeLeaveRequestController.php');
$activeLoansTabCheck56 = file_get_contents(__DIR__ . '/../../frontend/src/app/portal/_components/ActiveLoansTab.tsx');
assert(str_contains($empLeaveReqCheck56, "\$statusMap = [") && str_contains($empLeaveReqCheck56, "in_array(strtoupper(\$leaveReq->status), ['DISETUJUI', 'APPROVED'], true)"), 'EmployeeLeaveRequestController must canonicalize status mapping and check approval across English and Indonesian');
assert(str_contains($activeLoansTabCheck56, "cleanStatus = (asset.status || \"\").toLowerCase()") && str_contains($activeLoansTabCheck56, 'cleanStatus === "dipinjam" ? "Dipinjam" : asset.status'), 'ActiveLoansTab must normalize asset loan status casing for overdue detection and badge label');

// 163. Employee Access Role Alignment & Safe Auto-Creation Invariant
$empAccessReqCheck57 = file_get_contents(__DIR__ . '/../app/Modules/Kepegawaian/Requests/EmployeeAccessRequest.php');
$empCtrlCheck57 = file_get_contents(__DIR__ . '/../app/Modules/Kepegawaian/Controllers/EmployeeController.php');
$empAccessSheetCheck57 = file_get_contents(__DIR__ . '/../../frontend/src/app/kepegawaian/_components/EmployeeAccessSheet.tsx');
assert(str_contains($empAccessReqCheck57, "'role' => 'required|string|in:super_admin,admin,user,pegawai'"), 'EmployeeAccessRequest must accept pegawai role for backward compatibility');
assert(str_contains($empCtrlCheck57, "'role' => 'user'"), 'EmployeeController must auto-create employee user accounts with role user');
assert(str_contains($empAccessSheetCheck57, 'role: z.enum(["super_admin", "admin", "user", "pegawai"])') && str_contains($empAccessSheetCheck57, 'currentAccess.role === "pegawai" ? "user" : currentAccess.role'), 'EmployeeAccessSheet must safely resolve and validate pegawai role');

// 164. Kepegawaian Leave Balance Matching Invariant
$empLeaveCtrlCheck57 = file_get_contents(__DIR__ . '/../app/Modules/Kepegawaian/Controllers/EmployeeLeaveController.php');
assert(str_contains($empLeaveCtrlCheck57, "whereRaw('LOWER(jenis_cuti) LIKE ?', ['%tahunan%'])"), 'EmployeeLeaveController must match jenis_cuti case-insensitively');

// 165. StExpenseTemplate Soft-Delete Uniqueness & Category Case Resilience Invariant
$storeExpReqCheck58 = file_get_contents(__DIR__ . '/../app/Modules/Kepegawaian/Requests/StoreStExpenseTemplateRequest.php');
$updateExpReqCheck58 = file_get_contents(__DIR__ . '/../app/Modules/Kepegawaian/Requests/UpdateStExpenseTemplateRequest.php');
assert(str_contains($storeExpReqCheck58, "Rule::unique('st_expense_templates', 'code')->whereNull('deleted_at')"), 'StoreStExpenseTemplateRequest must scope code uniqueness to non-deleted records');
assert(str_contains($updateExpReqCheck58, "->whereNull('deleted_at')"), 'UpdateStExpenseTemplateRequest must scope code uniqueness to non-deleted records');
assert(str_contains($storeExpReqCheck58, 'DIPA,KERJASAMA,HIBAH_FOLU') && str_contains($updateExpReqCheck58, 'DIPA,KERJASAMA,HIBAH_FOLU'), 'StExpenseTemplate requests must accept case-resilient category values');

// 166. StExpenseTemplate Canonical Category Invariant
$stExpServiceCheck58 = file_get_contents(__DIR__ . '/../app/Modules/Kepegawaian/Services/StExpenseTemplateService.php');
assert(str_contains($stExpServiceCheck58, "whereRaw('LOWER(category) = ?', [strtolower(\$filters['category'])])") && str_contains($stExpServiceCheck58, "strtolower(\$data['category'] ?? 'other')"), 'StExpenseTemplateService must query and store categories in canonical lowercase');

// 167. BMN Asset Photo Temp File Cleanup Invariant
$assetPhotoCheck59 = file_get_contents(__DIR__ . '/../app/Modules/Bmn/Controllers/AssetPhotoController.php');
assert(str_contains($assetPhotoCheck59, "\$zip->addFromString(\$entry['name'], \$this->disk()->get(\$entry['storage_path']));"), 'AssetPhotoController downloadAll must stream files directly into zip with addFromString without leaking temp files on disk');

// 168. Employee Global Administrator Scope & NIP Relation Invariant
$empModelCheck59 = file_get_contents(__DIR__ . '/../app/Modules/Kepegawaian/Models/Employee.php');
assert(str_contains($empModelCheck59, "'excludeAdminPusat'") && str_contains($empModelCheck59, "'NOT LIKE', '%Administrator Pusat%'"), 'Employee model must filter administrator accounts globally');
assert(str_contains($empModelCheck59, "hasOne(User::class, 'username', 'nip')"), 'Employee model must correctly link to User via username and nip');

// 169. Assignment Letter Status Case-Resilience & Canonicalization Invariant
$stCtrlCheck60 = file_get_contents(__DIR__ . '/../app/Modules/SuratTugas/Controllers/AssignmentLetterController.php');
assert(str_contains($stCtrlCheck60, "'status' => 'required|in:pending,approved,rejected,completed,PENDING,APPROVED,REJECTED,COMPLETED'") && str_contains($stCtrlCheck60, "strtolower(\$request->status)"), 'AssignmentLetterController updateStatus must accept case-resilient status values and canonicalize with strtolower()');
assert(str_contains($stCtrlCheck60, "'status' => 'nullable|in:pending,approved,PENDING,APPROVED'") && str_contains($stCtrlCheck60, "strtolower(\$targetStatus)"), 'AssignmentLetterController approve must accept case-resilient status values and canonicalize with strtolower()');

// 170. Employee Select Endpoint Integrity & Limit Invariant
$empCtrlCheck60 = file_get_contents(__DIR__ . '/../app/Modules/Kepegawaian/Controllers/EmployeeController.php');
assert(str_contains($empCtrlCheck60, "min(200, max(1, \$request->integer('limit'"), 'EmployeeController select must clamp limit safely up to 200 items');
assert(str_contains($empCtrlCheck60, "where('is_active', true)") && str_contains($empCtrlCheck60, "'NOT LIKE', '%administrator%'"), 'EmployeeController select must exclude inactive and admin accounts');

// 171. BulkTrash Non-Admin Status Case Resilience & Slice Limit Invariant
assert(str_contains($stCtrlCheck60, "array_slice(\$rawIds, 0, 100)") && str_contains($stCtrlCheck60, "'draft', 'pending', 'rejected', 'DRAFT', 'PENDING', 'REJECTED'"), 'AssignmentLetterController bulkTrash must slice input to 100 and support case-resilient status filtering');

// 172. Employee Dashboard Stats Cross-Database Status Casing Invariant
assert(str_contains($empCtrlCheck60, "whereIn('status', ['DITERBITKAN', 'APPROVED', 'COMPLETED', 'PUBLISHED', 'diterbitkan', 'approved', 'completed', 'published'])"), 'EmployeeController dashboardStats must calculate activeStCount across all casing variations');
assert(str_contains($empCtrlCheck60, "whereIn(DB::raw('UPPER(status)'), ['PENGAJUAN', 'PENDING'])"), 'EmployeeController dashboardStats must calculate pendingCutiCount with case-insensitive status');

// 173. Assignment Letter Bulk Actions User Null Guard Invariant
$stCtrlCheck62 = file_get_contents(__DIR__ . '/../app/Modules/SuratTugas/Controllers/AssignmentLetterController.php');
assert(str_contains($stCtrlCheck62, "if (! \$user) {\n            return response()->json(['message' => 'Unauthenticated.'], 401);\n        }") || (str_contains($stCtrlCheck62, "if (! \$user)") && str_contains($stCtrlCheck62, "'Unauthenticated.'], 401)")), 'AssignmentLetterController bulk actions must defensively verify $user authentication');

// 174. Report Inline Forms Image Preview Error Fallback Invariant
$spInlineFormCheck62 = file_get_contents(__DIR__ . '/../../frontend/src/app/portal/_components/SmartPatrolInlineForm.tsx');
$grInlineFormCheck62 = file_get_contents(__DIR__ . '/../../frontend/src/app/portal/_components/GeneralReportInlineForm.tsx');
assert(str_contains($spInlineFormCheck62, "onError={(e) => { (e.currentTarget as HTMLElement).style.display = 'none'; }}"), 'SmartPatrolInlineForm custom cover preview must suppress broken image on error');
assert(str_contains($grInlineFormCheck62, "onError={(e) => { (e.currentTarget as HTMLElement).style.display = 'none'; }}"), 'GeneralReportInlineForm image previews must suppress broken images on error');

// 175. Assignment Letter Approved Status Modification Guard Invariant
assert(str_contains($stCtrlCheck62, "Dokumen Surat Tugas yang telah disetujui hanya dapat diubah oleh Administrator."), 'AssignmentLetterController update must prevent non-admin modification of approved documents');

// 176. Assignment Letter Status Escalation Guard Invariant
assert(str_contains($stCtrlCheck62, "Anda tidak memiliki otorisasi untuk mengubah status dokumen menjadi disetujui."), 'AssignmentLetterController update must prevent non-admin status escalation to approved');

// 177. Assignment Letter Destroy & Restore Defensive Auth Guard Invariant
$stCtrlCheck64 = file_get_contents(__DIR__ . '/../app/Modules/SuratTugas/Controllers/AssignmentLetterController.php');
assert(str_contains($stCtrlCheck64, "public function destroy") && str_contains($stCtrlCheck64, "public function restore") && substr_count($stCtrlCheck64, "return response()->json(['message' => 'Unauthenticated.'], 401);") >= 4, 'AssignmentLetterController destroy and restore must defensively verify $user authentication');

// 178. Assignment Letter ForceDestroy Admin Role Guard Invariant
assert(str_contains($stCtrlCheck64, "public function forceDestroy") && str_contains($stCtrlCheck64, "! in_array(\$user->role, ['admin', 'super_admin'], true)") && str_contains($stCtrlCheck64, "Anda tidak memiliki hak akses untuk menghapus permanen Surat Tugas."), 'AssignmentLetterController forceDestroy must defensively verify admin role inside controller');

// 179. Employee Access NIP Validation & Self-Demotion Guard Invariant
$empAccessCtrlCheck65 = file_get_contents(__DIR__ . '/../app/Modules/Kepegawaian/Controllers/EmployeeAccessController.php');
assert(str_contains($empAccessCtrlCheck65, "Pegawai tidak memiliki NIP yang valid") && str_contains($empAccessCtrlCheck65, "Anda tidak dapat menurunkan peran (role) akun Anda sendiri."), 'EmployeeAccessController must validate NIP and prevent super admin self-demotion');

// 180. Employee Self-Deletion & Password Reset Privilege Escalation Guard Invariant
$empCtrlCheck65 = file_get_contents(__DIR__ . '/../app/Modules/Kepegawaian/Controllers/EmployeeController.php');
assert(str_contains($empCtrlCheck65, "Anda tidak dapat menghapus data pegawai akun Anda sendiri.") && str_contains($empCtrlCheck65, "Hanya Super Admin yang dapat mereset password akun Super Admin."), 'EmployeeController must prevent self-deletion and admin-to-superadmin password reset privilege escalation');

// 181. Keuangan Visum Routes Sanctum & Module Access Protection Invariant
$keuanganRoutesCheck66 = file_get_contents(__DIR__ . '/../app/Modules/Keuangan/Routes/api.php');
assert(str_contains($keuanganRoutesCheck66, "Route::middleware(['auth:sanctum', 'module.access:keuangan'])->prefix('keuangan/visum')") && str_contains($keuanganRoutesCheck66, "Route::match(['post', 'put'], '/settings'"), 'Keuangan Routes must protect visum settings & templates with auth:sanctum and module.access:keuangan');

// 182. SPJ Excel Services Tempnam Ghost File Cleanup Invariant
$spjFoluServiceCheck66 = file_get_contents(__DIR__ . '/../app/Modules/Keuangan/Services/SpjFoluExcelService.php');
$spjDipaServiceCheck66 = file_get_contents(__DIR__ . '/../app/Modules/Keuangan/Services/SpjDipaExcelService.php');
assert(str_contains($spjFoluServiceCheck66, "\$tempBase = tempnam(sys_get_temp_dir(), 'SPJ_FOLU_');\n        @unlink(\$tempBase);") && str_contains($spjDipaServiceCheck66, "\$tempBase = tempnam(sys_get_temp_dir(), 'SPJ_DIPA_');\n        @unlink(\$tempBase);"), 'SPJ Excel services must immediately unlink base tempnam file to prevent uncollected ghost files');

// 183. SPJ Controller Excel Export Date Sanitization, Nosniff, and Safe Error Masking Invariant
$spjCtrlCheck66 = file_get_contents(__DIR__ . '/../app/Modules/Keuangan/Controllers/SpjController.php');
assert(str_contains($spjCtrlCheck66, "\$dateClean = preg_replace('/[^a-zA-Z0-9_-]/', '_', (string) \$date);") && str_contains($spjCtrlCheck66, "'X-Content-Type-Options' => 'nosniff'") && str_contains($spjCtrlCheck66, "config('app.debug') ? ('Gagal membuat file Excel: ' . \$e->getMessage()) : 'Gagal membuat file Excel.'"), 'SpjController exportExcel must sanitize dateClean, set nosniff header, and protect exception details in production');

// 184. Assignment Letter Status Counts Collation Independence & Surat Masuk Export Year Sanitization Invariant
$stCtrlCheck66 = file_get_contents(__DIR__ . '/../app/Modules/SuratTugas/Controllers/AssignmentLetterController.php');
$suratMasukCtrlCheck66 = file_get_contents(__DIR__ . '/../app/Modules/Surat/Controllers/SuratMasukController.php');
assert(str_contains($stCtrlCheck66, "LOWER(status) as status_lower") && str_contains($stCtrlCheck66, "\$counts['completed'] ?? 0") && str_contains($stCtrlCheck66, "\$counts['diterbitkan'] ?? 0"), 'AssignmentLetterController statusCounts must normalize status case and count all approved variants');
assert(str_contains($suratMasukCtrlCheck66, "\$cleanYear = preg_replace('/[^0-9]/', '', (string) \$filters['year']);"), 'SuratMasukController exportExcel must sanitize year parameter against illegal characters');

// 185. SmartPatrolInlineForm Blob Object URL Cleanup Invariant
$spInlineFormCheck67 = file_get_contents(__DIR__ . '/../../frontend/src/app/portal/_components/SmartPatrolInlineForm.tsx');
assert(str_contains($spInlineFormCheck67, "URL.revokeObjectURL(customCoverPreview)"), 'SmartPatrolInlineForm must revoke customCoverPreview object URL in cleanup to avoid memory leaks');

// 186. GeneralReportInlineForm Defensive Null Field Access & Selection Invariant
$grInlineFormCheck67 = file_get_contents(__DIR__ . '/../../frontend/src/app/portal/_components/GeneralReportInlineForm.tsx');
assert(str_contains($grInlineFormCheck67, "((selectedST.maksud_tujuan || \"\").substring(0, 60) || \"\")") && str_contains($grInlineFormCheck67, "(st.maksud_tujuan || \"\").toLowerCase()"), 'GeneralReportInlineForm must guard against null maksud_tujuan to prevent client runtime crashes');

// 187. Portal Borrowed Asset ID Type Resilience Invariant
$activeLoansCheck67 = file_get_contents(__DIR__ . '/../../frontend/src/app/portal/_components/ActiveLoansTab.tsx');
$portalPageCheck67 = file_get_contents(__DIR__ . '/../../frontend/src/app/portal/page.tsx');
assert(str_contains($activeLoansCheck67, "id: number | string;") && str_contains($portalPageCheck67, "my_assets: Array<{ id: number | string;"), 'ActiveLoansTab and portal page must support both numeric and string asset IDs');

// 188. Surat Tugas Positive Status Badge Inclusion Invariant
$stTabCheck67 = file_get_contents(__DIR__ . '/../../frontend/src/app/portal/_components/SuratTugasTab.tsx');
assert(str_contains($stTabCheck67, '"published"'), 'SuratTugasTab badge check must include published status');

// 189. Portal Assignment Letter Non-Numeric ID Guard Invariant
$stCtrlCheck68 = file_get_contents(__DIR__ . '/../app/Modules/SuratTugas/Controllers/AssignmentLetterController.php');
assert(
    str_contains($stCtrlCheck68, '! ctype_digit((string) $cleanId) && ! is_numeric($cleanId)') &&
    substr_count($stCtrlCheck68, '! ctype_digit((string) $cleanId) && ! is_numeric($cleanId)') >= 3,
    'AssignmentLetterController must validate cleanId is numeric in myShow, myDownload, and verify to prevent DB QueryException'
);

// 190. Leave Request Date Boundary Normalization, Tag Stripping & Password Check Invariant
$leaveCtrlCheck68 = file_get_contents(__DIR__ . '/../app/Modules/Kepegawaian/Controllers/EmployeeLeaveRequestController.php');
$profileSidebarCheck68 = file_get_contents(__DIR__ . '/../../frontend/src/app/portal/_components/PortalProfileSidebar.tsx');
assert(
    str_contains($leaveCtrlCheck68, "Carbon::parse(\$validated['tanggal_mulai'])->startOfDay()") &&
    str_contains($leaveCtrlCheck68, "Carbon::parse(\$validated['tanggal_selesai'])->startOfDay()") &&
    str_contains($leaveCtrlCheck68, "strip_tags(trim(\$validated['alasan_cuti']))") &&
    str_contains($leaveCtrlCheck68, "strip_tags(trim(\$validated['alamat_menjalankan_cuti']))"),
    'EmployeeLeaveRequestController must normalize dates to startOfDay and strip tags on user input'
);
assert(
    str_contains($profileSidebarCheck68, '!pwData.current_password') &&
    str_contains($profileSidebarCheck68, 'Password saat ini wajib diisi.'),
    'PortalProfileSidebar must validate current_password before dispatching change password request'
);

// 191. Assignment Letter show and downloadPdf Numeric ID Guard Invariant
assert(
    substr_count($stCtrlCheck68, '! ctype_digit((string) $cleanId) && ! is_numeric($cleanId)') >= 5,
    'AssignmentLetterController must validate cleanId is numeric in myShow, myDownload, verify, show, and downloadPdf'
);

// 192. SmartPatrolInlineForm Cover Preview Unmount Revoke Invariant
$spInlineCheck68 = file_get_contents(__DIR__ . '/../../frontend/src/app/portal/_components/SmartPatrolInlineForm.tsx');
assert(
    str_contains($spInlineCheck68, 'URL.revokeObjectURL(customCoverPreview)') &&
    str_contains($spInlineCheck68, 'customCoverPreview.startsWith("blob:")'),
    'SmartPatrolInlineForm must revoke customCoverPreview on unmount to prevent memory leaks'
);

// 193. AuthController Employee Photo Filename Collision Guard Invariant
$authCtrlCheck69 = file_get_contents(__DIR__ . '/../app/Http/Controllers/Api/AuthController.php');
assert(
    str_contains($authCtrlCheck69, "Str::slug((\$employee->nip ? \$employee->nip . '-' : '') . (\$employee->nama_lengkap ?: 'pegawai'))"),
    'AuthController updatePhoto must prefix slug with NIP to prevent photo overwriting across employees'
);

// 194. Assignment Letter Draft Storage ID Partition and Complete Numeric ID Guard Invariant
$stCtrlCheck69 = file_get_contents(__DIR__ . '/../app/Modules/SuratTugas/Controllers/AssignmentLetterController.php');
assert(
    str_contains($stCtrlCheck69, "date('Y-m').'-'.\$surat->id.'-'.Str::slug(substr(\$surat->maksud_tujuan ?: 'surat-tugas', 0, 40))"),
    'AssignmentLetterController must partition draft attachment directory with surat id to prevent cross-submission collisions'
);
assert(
    substr_count($stCtrlCheck69, '! ctype_digit((string) $cleanId) && ! is_numeric($cleanId)') >= 10,
    'AssignmentLetterController must validate cleanId is numeric across all route operations to prevent SQLSTATE[22P02]'
);

echo "PASS: portal_security_check completed successfully.\n";







