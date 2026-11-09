> Tindak lanjut 9 November 2026: [penjelasan tiga lead, uji ulang aman, dan fakta yang masih dibutuhkan](surat-tugas-kepegawaian-security-review-2026-11-09-follow-up.md). Ketiga record diverifikasi ulang oleh pemeriksa independen baru; verdict tetap sama. Pemeriksaan aman yang tersedia selesai.

# NEEDS VALIDATION — Surat Tugas dan Kepegawaian

Tiga lead berikut tidak diberi severity dan tidak dinyatakan sebagai celah aktif yang terkonfirmasi. Perbaikan source yang tersedia sudah diterapkan. Keterbatasan historis atau konfigurasi deployment tetap menentukan kesimpulan keamanan. Semua rencana mengikuti pembatasan pada record final; tidak ada instruksi probe deployment, stress, pairing, atau pengulangan dynamic snapshot yang ditolak.

## Historical assistant pairing routes lacked separate operator authentication; current source guards both routes

`assistant/operator/unauthenticated-management-route`

The immutable wave3-baseline registered anonymous GET /qr and GET /api/qr-live routes, with the API delegating to the configured gateway adapter. An independent native Express auth-only check reproduced anonymous /qr returning 200 rather than the required 503 and stopped at that first result; it did not exercise the historical API or provider. Current reviewed worktree source requires separate operator Basic credentials on both routes, returns 503 when its password is unconfigured and 401 for absent/wrong credentials, and sets no-store before authentication. The independent current auth-only check passed 84 assertions, including rejection of producer credentials before gateway delegation and designated-operator access using only a recording adapter returning connected state. This is a historical source issue with current remediation verified; consequential provider pairing disclosure and historical deployed reachability remain unestablished.

### Claimed Root Cause

In wave3-baseline, GET /api/qr-live and GET /qr omitted an operator guard even though the API invoked a credentialed gateway management adapter. Existing webhook producer guards applied only to their POST routes. Current source adds an independent requireOperator guard to both GET routes.

### Trace

1. `hermes-agent/assistant/src/index.ts:43` — **kind**: entrypoint
**scope**: wave3-baseline GET /api/qr-live
**description**: Original wave3-baseline line43 registers the lower-trust HTTP viewer route without an operator middleware; line44 calls getLiveQrCode and line45 returns its result. The sibling /qr route was unguarded at original line49. Current registrations at lines58 and64 both requireOperator.
2. `hermes-agent/assistant/src/gateway/evolution.ts:12` — **kind**: propagation
**scope**: wave3-baseline EvolutionGateway constructor
**description**: Original lines12–18 construct the configured Axios transport with its gateway apikey; viewer requests do not supply this backend credential. Current lines9–10 require an explicit gateway key before transport creation.
3. `hermes-agent/assistant/src/gateway/evolution.ts:87` — **kind**: sink
**scope**: wave3-baseline getLiveQrCode
**description**: Original line81 reads instance state and returns only open when connected; otherwise original line87 calls the configured instance/connect management endpoint and lines90–91 select provider-returned fields. Current equivalent call is line88, behind operator authorization. These are source-visible potential effects only; no provider connection, QR, code, or linked account was generated or observed.

### Evidence

1. `hermes-agent/assistant/tests/security-boundary.cjs:203` — **description**: Maintained operator-only fixture issues native Express GET requests; line204 expects 401/503, line206 asserts no gateway delegation on denial, and lines209–215 check designated-operator access. Independently executed via trusted run.py assistant operator with PORTAL_AUDIT_OWNER=phase3_05: wave3-baseline job assistant-d53122a85585 stopped after anonymous /qr yielded200 versus503; current job assistant-f64049f57847 passed one scenario/84 assertions. Own promoted output sizes and SHA256 hashes matched completed execution.json receipts; both runs used network-none, env-i allowlist, read-only source/tools, UID65534/capdrop/no-new-privileges,1CPU/1536MiB/64pids/128MiB scratch/16MiB file/185s wall.
2. `hermes-agent/assistant/tests/security-boundary.cjs:174` — **description**: The recording getLiveQrCode adapter only increments a counter and returns {state:open}; no real gateway implementation or provider transport runs in these route checks. The operator selector at lines615–619 runs only operatorChecks, skipping webhook, state-machine and constructor tests.
3. `hermes-agent/assistant/src/index.ts:43` — **description**: Current requireOperator sets no-store, fails503 when ASSISTANT_ADMIN_PASSWORD is absent, compares the decoded Basic credential against the separate operator username/password using length and timing-safe checks, and returns401 on mismatch. Both routes install it at lines58/64; producer service-key middleware remains separate.
4. `hermes-agent/docker-compose.yml:76` — **description**: Current compose passes operator username/password separately from gateway and producer keys; an empty operator password disables routes through the source guard. Published port configuration at lines66–67 does not establish deployed ingress accessibility or upstream authorization.

### Blockers

- Historical deployed routing and any upstream operator authorization are outside the reviewed source/local fixture; anonymous reachability of the historical management routes in an actual deployment is unverified.
- No real provider management response or sensitive pairing result was observed. The baseline check established only anonymous HTML access, and the current positive used connected-state recording data; these results do not establish QR/code disclosure, account linkage, or account takeover. Current reviewed source blocks anonymous access.

### Validation Plan

**local**: Completed the minimum existing auth-only checks through trusted run.py assistant operator under owner phase3_05 for wave3-baseline and current. Preserve the independently verified completed receipts and corrected original/current line references. Further pairing/provider execution is neither authorized nor needed for the verified current remediation; do not create QR/codes or link an account.
**deployment**: Owner may review historical ingress configuration and intended operator authority offline, and inspect existing non-secret provider capability/configuration records to determine whether an anonymously reachable original route could return sensitive management data for its configured instance. Do not probe deployed endpoints, request pairing material, or perform account linkage. If historical reachability/effect cannot be established safely, retain this as historical needs_validation without a current-vulnerability or takeover claim.

## Outer attendance ZIP retains metadata without an aggregate byte budget

`kpg/meal/zip-cumulative-metadata-retention`

Reviewed HEAD fc610d1dd81c5cad74feba71ac182a6825750ad6 plus the dirty worktree; SikadirParserService.php SHA256 ca0da8df26d7fe9adbea4923ea0261340835b52ee9aece4991fb25c22e85e2af. An authenticated admin with Kepegawaian module access, or a super_admin, can supply compressed attendance content to a synchronous reconciliation request. The outer ZIP parser examines at most 200 members and reads at most 5 MiB from each accepted member, then retains selected parsed strings until the archive completes, before deduplication. Source establishes finite request-local compressed-input amplification, not successful retention of approximately 1 GiB. The production compose template routes API traffic to a common PHP-FPM backend and specifies restart:always, but the active deployment, effective per-request limits, pool capacity and container quotas are unobserved. The concrete unresolved boundary is whether one authorized importer can consume capacity needed by other API users, rather than only fail their own import. No shared-service impairment, persistent leak, or successful large allocation is demonstrated.

### Claimed Root Cause

The outer HTML/XLS ZIP path accumulates every accepted parsed result in parseZipArchive before parseMultiple deduplicates by NIP and period. Metadata text has no field byte cap and the outer ZIP path has no cumulative content or retained-output budget. The native XLSX path's distinct 20 MiB expanded-size check does not apply to these HTML ZIP members.

### Trace

1. `backend/app/Modules/Kepegawaian/Routes/api.php:136` — **kind**: entrypoint
**scope**: POST /api/kepegawaian/uang-makan/reconcile
**description**: Uploaded attendance content enters the import endpoint under auth:sanctum and module.access:kepegawaian at line 26, the admin/super_admin group at line 96, and throttle:60,1 at line 137. The lower-trust content is supplied by an authorized importer.
2. `backend/app/Modules/Kepegawaian/Controllers/MealAllowanceController.php:71` — **kind**: propagation
**scope**: reconcile upload validation and parser call
**description**: After files.* file/max:25600 and extension validation, or the legacy file/max:51200 input, the controller calls parseMultiple. No files-array cardinality or cumulative parsed-byte cap is applied here; configured upstream compressed-input bounds still apply.
3. `backend/app/Modules/Kepegawaian/Services/SikadirParserService.php:32` — **kind**: propagation
**scope**: parse ZIP dispatch
**description**: An original filename with zip extension selects parseZipArchive directly, bypassing the separate native XLSX preflight.
4. `backend/app/Modules/Kepegawaian/Services/SikadirParserService.php:186` — **kind**: propagation
**scope**: outer ZIP bounded member parsing
**description**: Only the first min(numFiles,200) members are examined. Hidden/macOS and non-xls/html/htm members are skipped; each accepted member is streamed up to 5 MiB and passed to parseHtmlContent with its basename. Nothing is extracted to a member-controlled filesystem path.
5. `backend/app/Modules/Kepegawaian/Services/SikadirParserService.php:353` — **kind**: propagation
**scope**: parseHtmlContent returned metadata
**description**: DOM cell text captured at lines 223-225 supplies NAMA at line 236 and is returned as nama_lengkap without a field byte cap. NIP/name recognition and valid unique daily dates do not impose a metadata-byte bound.
6. `backend/app/Modules/Kepegawaian/Services/SikadirParserService.php:191` — **kind**: sink
**scope**: parseZipArchive request-local results retention
**description**: Each non-null parsed result is appended to results and retained until archive completion. parseMultiple receives the complete archive list before deduplicating at lines 56-61. This establishes the source retention path, not a shared-service availability boundary violation.

### Evidence

1. `backend/app/Http/Middleware/CheckRole.php:39` — **description**: Roles outside the route's admin/super_admin list receive 403; unauthenticated requests are rejected at line 25 and super_admin bypass is explicit at line 34.
2. `backend/app/Http/Middleware/CheckModuleAccess.php:37` — **description**: A non-super_admin needs Kepegawaian module membership. The employee self-read exception applies only to GET, not this POST importer.
3. `backend/Dockerfile:69` — **description**: Source config sets upload_max_filesize=20M and post_max_size=25M; these are compressed upload/body controls. Line 60 selects php.ini-production and line 74 starts PHP-FPM, so neither absent per-request memory control nor a monolithic shared worker crash may be assumed. The effective configuration is unobserved.
4. `backend/nginx.conf:7` — **description**: The standalone nginx source caps client bodies at 25M. This bounds the compressed multipart body, not cumulative expanded metadata. The production nginx source also specifies 25M.
5. `backend/vendor/laravel/framework/src/Illuminate/Http/Middleware/ValidatePostSize.php:23` — **description**: Laravel's default global ValidatePostSize middleware checks CONTENT_LENGTH against effective post_max_size before proceeding; this is another compressed body bound, not an aggregate parse-memory budget.
6. `backend/app/Modules/Kepegawaian/Services/SikadirParserService.php:169` — **description**: The outer ZIP loop examines at most 200 central-directory members, including skipped members in that count. Each accepted stream is capped at 5 MiB at line 186. Claims of an unbounded archive loop or unbounded individual stream are refuted.
7. `backend/app/Modules/Kepegawaian/Services/SikadirParserService.php:79` — **description**: Native XLSX has a separate pre-load 200-entry/20 MiB cumulative metadata-size bound, worksheet dimensions of at most 500 rows and 32 columns, and cleanup. Outer HTML ZIP members use parseHtmlContent directly and do not pass this preflight.
8. `backend/app/Modules/Kepegawaian/Services/SikadirParserService.php:300` — **description**: Invalid dates, repeated day numbers, and mixed periods within an employee file are rejected, bounding valid daily-record cardinality. This does not cap the bytes of NAMA or selected metadata strings.
9. `backend/app/Modules/Kepegawaian/Controllers/MealAllowanceController.php:152` — **description**: reconcile returns JSON preview data after parsing/reconciliation; batch persistence is a separate storeBatch endpoint at line 177. No persistent parser retention or cross-request leak is established.
10. `backend/tests/Feature/Wave3SikadirNativeParserTest.php:185` — **description**: The maintained outer ZIP test covers member filtering, basename handling and the first-200 cutoff using tiny entries. Source inspection of this test is calibration only; it does not demonstrate cumulative metadata growth or shared availability impact, and it was not executed by this verifier.
11. `docker-compose.prod.yml:32` — **description**: The production source template defines one backend service using the PHP-FPM Dockerfile, with restart:always at line 37 and php-fpm startup at line 39. deploy/nginx-backend.conf routes PHP requests to backend:9000 at line 45. This supports a possible shared API worker-pool boundary, but does not establish the active deployment, FPM pool limits, or container quotas.

### Blockers

- The active deployment must be identified and its effective PHP memory_limit and max_execution_time, FPM pool size/request termination limits, and backend container memory/CPU quotas compared with the capacity reserved for unrelated API requests. docker-compose.prod.yml supplies a common PHP-FPM backend with restart:always, and the Dockerfile selects php.ini-production; these are source-visible containment/recovery controls, not proof of either shared impairment or adequate isolation. The decisive owner observation is whether one permitted import can exhaust capacity used by another principal before those controls stop it. If consequences are confined to the importing administrator request, this is hardening and should be rejected.

### Validation Plan

**local**: No further parser execution is required to establish the stated accumulation path: parseZipArchive appends each result before parseMultiple deduplicates, and parseHtmlContent returns selected metadata without field byte caps. The maintained small ZIP test establishes only its intended filtering/count assertions by source inspection and was not executed here. A tiny output-byte fixture would measure ordinary bounded retention but would not resolve the shared-capacity boundary, so it is not a security-validation blocker. Do not allocate the numerical maximum, seek exhaustion, or run availability probes.
**deployment**: Owner configuration review only: identify the active ingress/body limits and effective PHP/FPM settings, upload-count cap, backend pool sharing, container quotas, and worker/container recovery policy. Account for the production template shared backend and restart:always as well as the selected php.ini-production. Determine whether the finite synchronous import cost can consume another principal API capacity before per-request containment, or whether it is isolated to the importer. Do not send faulting imports, stress traffic, or shared-service availability probes. Reject the security claim if the owner-observed controls confine impact to the authorized importer request; aggregate budgeting and field-size caps then remain hardening.

## Original anonymous snapshot path could disrupt an administrator's builder; current guards address it

`surat-tugas/public-snapshot/untyped-render-state`

This assessment covers the original run-7 baseline snapshot and the current remediation. Original source permits caller-supplied snapshot departure values to reach a React cell without runtime entry-value checks. Existing approved baseline raw receipts support public acceptance and a record-specific administrator preview failure, but contain multiple malformed-field failures and do not independently isolate the departure-only hypothesis. The current dirty worktree identified by the assignment as HEAD fc610d1d plus changes now applies nested request rules and string-only departure hydration, and guards the sibling mandate reader. Those corrections address the reviewed source path without refuting its historical existence. No execution was performed by this reviewer, and no current exploitable path, severity, code execution or service-wide availability effect is asserted.

### Claimed Root Cause

In the immutable run-7 baseline, AssignmentLetterRequest validates only the outer template_snapshot array and sanitizes selected text fields. The controller merges request configuration into the persisted snapshot. The builder accepts an outer departure map and asserts it as Record<string,string> without runtime entry-value checks before the React child sink. Public pending enforcement, scheduling conflict checks, module-protected detail reads and React escaping do not enforce this stored renderer-input shape. Current nested validation and reader guards replace these missing controls.

### Trace

1. `backend/app/Modules/SuratTugas/Routes/api.php:15` — **kind**: entrypoint
**scope**: original baseline public submission
**description**: Verified in run-7/baseline-source: anonymous POST /submit reaches store with throttle:15,1. Administrative detail routes are separately protected by auth:sanctum and module.access at 28-41. The source therefore identifies a lower-trust writer and a different authorized reader.
2. `backend/app/Modules/SuratTugas/Requests/AssignmentLetterRequest.php:126` — **kind**: propagation
**scope**: original baseline snapshot rules
**description**: Verified in run-7/baseline-source: template_snapshot has only nullable|array validation; preparation at 57-79 leaves employee_departures entries unchanged. Required document, employee and date validation applies independently.
3. `backend/app/Modules/SuratTugas/Controllers/AssignmentLetterController.php:488` — **kind**: propagation
**scope**: original baseline snapshot persistence
**description**: Verified in run-7/baseline-source: request configuration overrides the base snapshot configuration, or the request snapshot is returned directly at 492. Public submissions are forced pending at 425-428 and scheduling conflicts can reject at 442-447; neither control checks departure value types.
4. `frontend/src/app/kepegawaian/surat-tugas/_components/SuratTugasForm.tsx:975` — **kind**: propagation
**scope**: original baseline edit hydration
**description**: Verified in run-7/baseline-frontend: after checking only that employee_departures is a nonarray object at 969-972, hydration spreads it into state through a Record<string,string> assertion. Default synchronization at 770-780 replaces only falsy or missing entries.
5. `frontend/src/app/kepegawaian/surat-tugas/_components/STBuilderPreview.tsx:610` — **kind**: propagation
**scope**: original baseline lampiran props
**description**: Verified in run-7/baseline-frontend: the map reaches STLampiranBedaHari unchanged; showDepartureColumn is passed at 611. The departure cell is conditional on that column being enabled.
6. `frontend/src/app/kepegawaian/surat-tugas/_components/STLampiranBedaHari.tsx:278` — **kind**: sink
**scope**: original baseline React departure cell
**description**: Verified in run-7/baseline-frontend: the selected departure map value at 256-258 is rendered directly as a React child. Source supports the proposed invalid-child failure path, while exact isolated native browser impact remains bounded by the receipt and independent-execution limitations.

### Evidence

1. `backend/app/Modules/SuratTugas/Requests/AssignmentLetterRequest.php:126` — **description**: Original baseline rule and preparation were read directly. The historical missing nested type check is present in that snapshot; the current rule at line 150 now imports shared configurationRules under template_snapshot.configuration.
2. `frontend/src/app/kepegawaian/surat-tugas/_components/SuratTugasForm.tsx:975` — **description**: Original baseline unchecked departure hydration was read directly. Completed approved baseline receipt e2e-c5dee5dc24c2 reports a valid-string control rendering, then HTTP 201 with malformed shape retained and absent admin preview. Its raw logs include an invalid React-child error, but also null-text and tembusan failures; pageErrors is reported as zero and the overall run exits 1. This is historical corroboration, not this reviewer's reproduction or a departure-only causal isolation.
3. `backend/app/Modules/Kepegawaian/Requests/StoreStTemplateRequest.php:65` — **description**: Current remediation requires each departure value to be nullable|string|max:255, constrains the map at 64, and requires a boolean column flag at 63. The shared template-authoring rule also constrains signer_authority_mandate at 44 and is reused by the current document request.
4. `frontend/src/app/kepegawaian/surat-tugas/_components/SuratTugasForm.tsx:987` — **description**: Current hydration filters each departure entry with typeof entry[1] === string before updating state, so historical non-string entries are no longer imported through the reviewed snapshot path.
5. `frontend/src/components/SuratTugasLetterPreview.tsx:109` — **description**: Original baseline line 133 trusted signer_authority_mandate by truthiness. Current line 109 requires a string before the conditional split() uses at 453 and 524. No independent sibling mandate-specific failure is claimed from the mixed baseline receipt.
6. `backend/tests/Feature/StKepegawaianSecurityClosureTest.php:369` — **description**: Read-only inspection of this current focused regression and completed approved receipt php-d416c7034366 shows the relevant departure and mandate shapes separately covered across public submit, store, update and approve, with 422 and unchanged-storage assertions. The retained receipt reports one test and 60 assertions passing; this reviewer did not run it.
7. `frontend/src/app/kepegawaian/surat-tugas/builder/[id]/page.tsx:10` — **description**: Current actual route mounts the guarded edit form. Completed approved receipt e2e-5b78f941742c, labelled legacy-data, reports a valid-string control and accepted snapshot both rendering with exit 0. Its limited raw summary supports repaired reader behavior for that fixture, without proving every shape or writer.

### Blockers

- Independent native-interface dynamic verification of the original historical departure-only path is unavailable in this assignment: automatic review denied the prior dynamic action and the parent expressly prohibits target/runner execution, browser or HTTP use, fixture or input construction, replay and variant searches. This reviewer performed source and approved-receipt reads only.
- The supplied completed baseline raw receipt corroborates acceptance and a record-specific render failure, but the same execution includes multiple nested-text failures and does not establish an independently isolated departure-only result. Current guards address the source path but cannot settle that historical causal attribution. No unprovided original receipt, exact fixture provenance or another verifier conclusion was assumed.

### Validation Plan

**local**: Remain source-and-receipt-only under the present restriction. Review the already-approved original fixture source and its recorded baseline revision/provenance, if supplied by the parent, together with the complete retained raw observations to determine which failure is attributable to the claimed departure sink. Accept only existing approved receipts that show native anonymous acceptance, retained value, the separate authorized administrator opening that same dummy record, and an attributable native render outcome; do not create inputs, replay or seek variants. Review the corresponding approved current validation and legacy-reader receipts against their exact source and fixture provenance to bound remediation. If those existing records cannot resolve attribution, retain needs_validation with the stated independent native verification capability unavailable; no deployment or provider access is needed or requested.
