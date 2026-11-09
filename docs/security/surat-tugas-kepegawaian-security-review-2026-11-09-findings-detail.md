# Detail temuan terkonfirmasi — Surat Tugas dan Kepegawaian

Tanggal: 9 November 2026. Semua record di bawah adalah cacat historis dengan remediasi current yang diverifikasi. Label severity menilai efek sebelum perbaikan. Input dan reproduksi hanya untuk fixture dummy dalam sandbox yang tercatat; tidak untuk deployment. Source line historis tetap menunjuk snapshot yang disebut record. Bukti mentah berada di run-7 di luar repository.

## Repaired historical agent gate accepted a committed fallback credential

`agent/auth/committed-default-service-key`

Independently reproduced on the immutable run-7/baseline-source snapshot of HEAD fc610d1dd81c5cad74feba71ac182a6825750ad6: an anonymous caller at nonallowlisted REMOTE_ADDR 203.0.113.10, with no configured agent key and no forwarded header, supplied the source-known fallback and received HTTP 201 from the internal dummy ST draft endpoint. The baseline controller writes a DRAFT before returning that status. This is a historical configuration-dependent defect, not a claim about deployed key configuration. Current dirty worktree removes the fallback and independently passes the same regression: HTTP 403 and zero assignment-letter rows.

### Root Cause

In the original baseline, RestrictAgentClientIp resolved missing config and environment to a committed credential and accepted hash equality as an alternative to the IP allowlist. The Agent route group had no mandatory user authentication after that gate. An absent secret therefore became a publicly knowable valid credential rather than disabling key authentication.

### Intended Behavior

A caller outside the trusted socket-IP allowlist must present a separately configured nonempty service secret before creating an internal integration draft. Missing key configuration must never authorize a source-known credential.

### Trace

1. `backend/app/Modules/Agent/Routes/api.php:18` — **kind**: entrypoint
**scope**: Original run-7 baseline: POST /api/agent/v1/surat-tugas/draft
**description**: Anonymous HTTP request enters the integration draft route; baseline line18 is unchanged in current source.
2. `backend/app/Modules/Agent/AgentServiceProvider.php:18` — **kind**: propagation
**scope**: Original run-7 baseline: Agent middleware group
**description**: The group requires api and RestrictAgentClientIp, with no additional mandatory Sanctum or role guard. Baseline line18 is unchanged.
3. `backend/app/Modules/Agent/Middleware/RestrictAgentClientIp.php:24` — **kind**: propagation
**scope**: Original run-7 baseline: missing internal-key configuration
**description**: Baseline line24 uses config then environment then a committed literal. Current line24 instead reads config without a default.
4. `backend/app/Modules/Agent/Middleware/RestrictAgentClientIp.php:31` — **kind**: propagation
**scope**: Original run-7 baseline: credential acceptance
**description**: Baseline line31 accepts equality to the fallback; line33 rejects only when both IP and key fail. Fixture uses app environment local, empty allowed_ips, external socket peer and no forwarded header, so neither the testing bypass nor proxy parsing accounts for admission.
5. `backend/app/Modules/Agent/Controllers/AgentSuratTugasController.php:65` — **kind**: sink
**scope**: Original run-7 baseline: createDraftSuratTugas
**description**: Baseline line65 creates the assignment letter, line70 forces DRAFT, and line94 returns201. The native baseline request observed201; current source preserves these controller constraints but blocks the request at middleware.

### Evidence

1. `backend/app/Modules/Agent/Middleware/RestrictAgentClientIp.php:24` — **description**: Original run-7 baseline line24 embeds the fallback and line25 takes the compared value from X-Agent-Internal-Key or bearer. Current line24 no longer contains that fallback; current lines32-33 require a nonempty string configured key.
2. `backend/config/services.php:3` — **description**: The complete original run-7 baseline returned configuration has no agent entry. Current lines17-20 define agent.internal_key directly from AGENT_INTERNAL_KEY without a default.
3. `backend/app/Http/Middleware/EnsureAccountSecure.php:20` — **description**: Both reviewed original baseline and current source permit an absent user identity to continue; lifecycle restrictions on identified users do not authenticate this anonymous integration request.
4. `backend/app/Modules/Agent/Controllers/AgentSuratTugasController.php:55` — **description**: Original baseline and current validation require bounded purpose/location and valid ordered dates. Only validated fields are written; status is forced to DRAFT at line70. This check establishes no publication or approval bypass.
5. `backend/tests/Feature/StKepegawaianSecurityClosureTest.php:313` — **description**: Maintained native regression explicitly switches app environment to local, removes services.agent.internal_key, empties allowed_ips, uses external REMOTE_ADDR and the historical literal, and posts a minimal dummy draft. Independent baseline run received201 instead of403. Independent current run passed both403 and zero-row assertions at lines323-324.

### Conditions

- **kind**: authentication_level
  **description**: Anonymous HTTP caller; no user session or Sanctum credential is supplied.
- **kind**: system_configuration
  **description**: Original baseline source with neither services.agent.internal_key nor AGENT_INTERNAL_KEY configured. An explicit secure override prevents this particular fallback path. Actual deployment configuration was not inspected.
- **kind**: network_routing
  **description**: Caller can reach the internal route from a nonallowlisted socket address. The local fixture uses203.0.113.10, an empty IP allowlist, and no forwarded header.

### Execution

**attacker perspective**: Anonymous nonallowlisted caller who can read the original source-known fallback, targeting the integration-owned draft workflow in an isolated dummy database.
**payloads**: - POST /api/agent/v1/surat-tugas/draft; X-Agent-Internal-Key equals the historical committed literal referenced by baseline middleware line24 and maintained test line320; no Authorization, cookie or forwarded headers.
- {"maksud_tujuan":"Dummy default credential check","tempat_tujuan":"Dummy location","tanggal_mulai":"2026-12-01","tanggal_selesai":"2026-12-01"}
**instructions**: - Use only the trusted run-7/run.py runner with PORTAL_AUDIT_OWNER=phase3_01_retry1 and PORTAL_AUDIT_VARIANT=baseline: python run.py php test_agent_has_no_committed_default_service_credential. The maintained fixture sets app environment local, services.agent to allowed_ips=[] with no internal_key, and REMOTE_ADDR=203.0.113.10. The runner's empty allowlisted environment contains no AGENT_INTERNAL_KEY.
- Repeat that one maintained check with PORTAL_AUDIT_VARIANT=current to verify the repaired source. Do not contact a deployed endpoint or substitute an actual service credential.
- Both jobs run native Laravel/PHPUnit with dummy SQLite memory DB, network none, read-only source/toolchain, scratch-only writes, UID65534, capability drop, no-new-privileges,1CPU,1536MiB,64pids,128MiB scratch,16MiB file limit and185s wall limit. The runner promotes only bounded allowlisted files after all writers stop; inspect execution.json and verify promoted SHA256 values.
**observed result**: Baseline job php-9f5793193199 completed with exit1: the single maintained assertion expected403 but observed201. The controller creates a DRAFT before returning201; no additional effect was exercised. Current job php-c296ad365717 completed exit0,1test/2assertions:403 and AssignmentLetter::count()==0. Own retained receipts are run-7/agents/phase3_01_retry1/artifacts/{php-9f5793193199,php-c296ad365717}/execution.json,output.txt,results.xml. Both receipts confirm writers stopped before promotion; all promoted hashes independently match. Baseline output SHA256 c1eea1c864b90b915ef050cbd89b4cbfea5f34caf9078588bdae7da29fdd60a0; current output SHA25631d1b76b9c406b0dd273ca6b5711462c415693953cf5b17e68d801edfa3c4c50. The baseline zero-row assertion is not reached because status assertion fails; no stronger row-count observation is claimed.

### Remediation

**strategy**: Already implemented in current source: resolve services.agent.internal_key without a fallback; require a nonempty configured string before hash_equals; configure AGENT_INTERNAL_KEY through services.php with no committed default. Keep the focused regression proving a source-known credential is rejected and no dummy draft is written when config is missing. The IP-or-valid-key service model is otherwise unchanged.

### Severity

**likelihood**: **score**: medium
**reason**: Trivial request once the historical literal is known, but requires reachable internal routing and absent explicit secret configuration; deployed conditions are unknown.
**impact**: **score**: medium
**reason**: The demonstrated unauthorized effect is an internal DRAFT creation in the integration workflow. The controller forces DRAFT and this reproduction establishes no approval, publication, account takeover or additional employee operation.
**overall severity**: medium

### Confidence

**score**: high
**reason**: Independent source trace plus the same native focused fixture reproduces201 against the immutable original snapshot and verifies403/zero rows against current repaired source. Trusted promotion receipts and hashes were checked; no deployment behavior is inferred.

## Pre-fix forwarded client IP bypassed the internal agent gate; current source fixes it

`agent/auth/forwarded-ip-allowlist-bypass`

Independently reproduced against the preserved run-7 baseline-source snapshot associated with HEAD fc610d1dd81c5cad74feba71ac182a6825750ad6 plus the pre-fix worktree. An anonymous native Laravel HTTP request from REMOTE_ADDR=203.0.113.10 without the dummy private service key was rejected with 403 until it supplied X-Forwarded-For: 127.0.0.1, when the actual draft endpoint returned 201 after AssignmentLetter::create. The protected resource was the organization's internal ST draft workflow, and the minimum effect was one dummy DRAFT creation inside disposable SQLite. No employee impersonation, approval, publication, or deployed exploit was observed. Current dirty-worktree source reads REMOTE_ADDR instead of Request::ip(); the same focused test now passes the no-key denial, forged-header denial, and valid-key success checks.

### Root Cause

In baseline RestrictAgentClientIp.php:27-33, an IP match alone authorized the service-wide integration path. Request::ip() consumed forwarding headers under unconditional wildcard proxy trust, so a caller-controlled loopback X-Forwarded-For value satisfied the allowlist without the service key. The route group had no additional authentication requirement for anonymous callers. Current source removes this dependency on forwarded headers at line28.

### Intended Behavior

An anonymous nonallowlisted socket peer without the internal integration key must be denied the internal agent draft endpoint, regardless of its forwarding headers. Valid configured service credentials must remain usable.

### Trace

1. `backend/app/Modules/Agent/Routes/api.php:18` — **kind**: entrypoint
**scope**: POST /api/agent/v1/surat-tugas/draft; run-7 baseline-source
**description**: Lower-trust anonymous JSON request reaches this internal draft route through the agent group.
2. `backend/bootstrap/app.php:26` — **kind**: propagation
**scope**: Global HTTP proxy trust; unchanged source used by baseline runner
**description**: trustProxies(at: '*') enables forwarding-header trust for every network peer.
3. `backend/vendor/laravel/framework/src/Illuminate/Http/Middleware/TrustProxies.php:123` — **kind**: propagation
**scope**: Installed framework setTrustedProxyIpAddressesToTheCallingIp
**description**: Wildcard handling sets both IPv4 and IPv6 catchall trusted ranges; default mask at line22 includes X-Forwarded-For.
4. `backend/vendor/symfony/http-foundation/Request.php:2242` — **kind**: propagation
**scope**: Installed framework normalizeAndFilterClientIps
**description**: When all supplied hops are trusted, the fallback is the first trusted value; forged 127.0.0.1 becomes the effective client IP.
5. `backend/app/Modules/Agent/Middleware/RestrictAgentClientIp.php:27` — **kind**: propagation
**scope**: run-7 baseline-source line27, before current remediation
**description**: Request::ip() feeds the loopback allowlist at line30. A matching IP independently allows the request at lines33-40 despite no secret and with app environment explicitly local.
6. `backend/app/Modules/Agent/Controllers/AgentSuratTugasController.php:65` — **kind**: sink
**scope**: createDraftSuratTugas; run-7 baseline-source
**description**: Validated dummy data is inserted via AssignmentLetter::create with status DRAFT at line70; the handler returns 201 only afterward at line94.

### Evidence

1. `backend/app/Modules/Agent/AgentServiceProvider.php:18` — **description**: Baseline and current group use api plus RestrictAgentClientIp, without auth:sanctum or a second service-authentication gate.
2. `backend/app/Modules/Agent/Middleware/RestrictAgentClientIp.php:20` — **description**: Baseline default allowlist includes loopback; the fixture explicitly uses allowed_ips=['127.0.0.1'] and a dummy private key, isolating this cause from the separate old fallback credential.
3. `backend/vendor/laravel/framework/src/Illuminate/Http/Request.php:343` — **description**: Installed Laravel ip() delegates to Symfony getClientIp(), completing the forwarded-header lineage.
4. `backend/app/Http/Middleware/EnsureAccountSecure.php:20` — **description**: Baseline and current lifecycle checks allow anonymous requests to continue. No dummy user/session/bearer identity was supplied.
5. `backend/app/Modules/Agent/Controllers/AgentSuratTugasController.php:55` — **description**: Baseline controller validates required strings and dates, strips tags, and fixes status to DRAFT. The demonstrated bypass does not confer arbitrary status, approver, or publication fields.
6. `backend/tests/Feature/StKepegawaianSecurityClosureTest.php:294` — **description**: Maintained native HTTP test sets app env to local, configures a dummy private key and loopback allowlist, uses external REMOTE_ADDR, tests no-header 403 and forged-header 403, then valid-key 201. Independent baseline run failed specifically at line305 with actual201; current run passed all3 assertions.
7. `backend/app/Modules/Agent/Middleware/RestrictAgentClientIp.php:28` — **description**: Current reviewed dirty-worktree remediation uses request server REMOTE_ADDR for strict allowlist matching, so X-Forwarded-For no longer selects the authorization IP. Current code also has no testing-environment authorization bypass.
8. `backend/tests/Feature/AgentModuleTest.php:49` — **description**: Current test now asserts rejection and valid-key behavior. The hunter's claim that this current test lacks a rejection assertion is stale; the stronger local-environment HTTP test supplies decisive evidence.

### Conditions

- **kind**: authentication_level
  **description**: Anonymous caller with no session, bearer token, or X-Agent-Internal-Key; no employee principal is required by the integration route.
- **kind**: system_configuration
  **description**: Vulnerable run-7 baseline-source gate uses Request::ip(); global wildcard proxy trust and a loopback allowed IP are enabled. The focused fixture replaces the service key with a dummy private value.
- **kind**: network_routing
  **description**: The caller must reach Laravel through a path preserving its chosen forwarding value. The local kernel reproduces this directly with REMOTE_ADDR=203.0.113.10. Deployed proxy stripping/replacement, application-port reachability, and topology were not inspected.

### Execution

**attacker perspective**: Anonymous nonallowlisted network caller choosing request headers and ordinary validated draft fields; protected internal ST draft state belongs to the application organization.
**payloads**: - POST /api/agent/v1/surat-tugas/draft; REMOTE_ADDR=203.0.113.10; X-Forwarded-For: 127.0.0.1; no service credential; JSON {"maksud_tujuan":"Dummy integration gate","tempat_tujuan":"Dummy location","tanggal_mulai":"2026-12-01","tanggal_selesai":"2026-12-01"}
**instructions**: - Use only trusted C:/Users/USER/security-audit-skill/bksda-superapp/run-7/run.py with PORTAL_AUDIT_OWNER=phase3_02_retry1. Run python run.py php test_agent_network_gate_ignores_untrusted_forwarded_loopback once with PORTAL_AUDIT_VARIANT=baseline and once with current. Runner mounts baseline app/config or current source read-only, with current maintained tests and unchanged bootstrap/framework; it uses full structural migrations and excludes only documented roster-data migrations.
- The native test explicitly switches app['env'] from testing to local before both hostile requests. It sets services.agent.allowed_ips=['127.0.0.1'] and services.agent.internal_key='DummyPrivateAgentKey'. No-header request must403; forged-loopback request must403; valid dummy key must201. Stop at the first baseline failure; do not broaden the effect.
- Sandbox receipts record network none, env-i with explicit dummy values, SQLite :memory:, array session/cache, scratch HOME/temp/cache/storage, read-only source/toolchain/rootfs, UID65534, capabilities dropped/no-new-privileges, 1CPU, 1536MiB RAM,64pids,128MiB scratch,16MiB file,170CPU seconds and185s wall. Target and observer stop before descriptor-based promotion. Only output.txt and results.xml existed in the allowlist; results.json was absent.
- Owned promoted baseline receipts: C:/Users/USER/security-audit-skill/bksda-superapp/run-7/agents/phase3_02_retry1/artifacts/php-e979ceaff6f0/{execution.json,output.txt,results.xml}; current receipts: C:/Users/USER/security-audit-skill/bksda-superapp/run-7/agents/phase3_02_retry1/artifacts/php-ceab3a8fe9e7/{execution.json,output.txt,results.xml}. Hashes independently matched each execution.json promotion record.
**observed result**: Baseline job php-e979ceaff6f0 completed exit1: one test,2assertions, no errors; the first no-header denial passed and the forged XFF request returned201 instead of403 at maintained test line305. Source establishes that201 follows the real Eloquent DRAFT insertion; the receipt does not separately query or expose the created row. Current job php-ceab3a8fe9e7 completed exit0:1test,3assertions, confirming403 without key,403 with forged loopback,201 with dummy valid key. Baseline output SHA256482d36e37ca837020352832ad3590c38facc93546198429e16e4b1f873e11907 and XML357942c8762e8b1bad24df19e65675b74cec62bf8234b1688b2ee6bdf6f57aa5; current output84d3e83dc2d8a19ec6f4fd75ed0bfa98753f30463ded9d58b0474ff683f309bd and XMLc30a09a2d70093519e878ba8b64a25acdd01e58f8a4da1386d9735b992d8f090. No deployed ingress behavior or external service was exercised.

### Remediation

**strategy**: Already implemented in the reviewed current worktree: base this network allowlist on the socket peer REMOTE_ADDR rather than proxy-derived Request::ip(), retaining strict matching and configured nonempty secret validation. Keep the native HTTP regression covering local environment and the valid-key control. Owners should separately check offline that any allowlisted reverse-proxy socket is an intended trusted integration boundary; the local result does not establish deployed topology.
**code changes**: - **file name**: backend/app/Modules/Agent/Middleware/RestrictAgentClientIp.php
  **fixed code**: $clientIp = $request->server('REMOTE_ADDR');

### Severity

**likelihood**: **score**: medium
**reason**: The local bypass requires only one header and no credential on the vulnerable baseline, but actual remote opportunity depends on unobserved ingress preserving the value.
**impact**: **score**: medium
**reason**: Demonstrated unauthorized creation of an internal ST draft under the integration gate. The handler fixes status to DRAFT; no approval, publication, employee takeover, or broader read/write operation was reproduced.
**overall severity**: medium

### Confidence

**score**: high
**reason**: Independent actual-source reconstruction and focused native-kernel baseline/current comparison, with effective local environment and independently hash-verified completed promotion receipts. Confidence is in the historical local boundary violation and current tested remediation, not deployed exposure.

## Repaired: partial and historical contacts authenticated as current employee phones

`assistant/phone-auth/noncurrent-contact-match`

The original immutable run-7 baseline-source and baseline-assistant snapshots accepted a sender phone as an active employee identity when only its last nine digits matched a different full current number, or when it appeared solely in a historical leave contact despite a different nonempty current employee phone. Independent native Laravel HTTP tests reproduced HTTP 200 acceptance for both dummy states and duplicate exact ownership. The observed boundary result is successful employee authentication at verify-phone; gateway delivery, leave submission, real phone allocation and deployed exposure were not exercised. Current dirty source at review HEAD fc610d1dd81c5cad74feba71ac182a6825750ad6 has removed both fallback paths, requires unique full canonical equality, and passed the same focused three-case test including exact canonical controls. This is a confirmed original defect with verified current remediation, not a claim of a current exploitable lookup.

### Root Cause

In the original snapshot, findEmployeeByPhone treated approximate contact data as authentication authority: a SQL OR branch accepted LIKE '%<last9>%' and first() selected one employee without uniqueness. If no employee matched, a historical leave contact returned its active employee without requiring equality to that employee's current phone. The active and soft-delete controls constrained the employee lifecycle, not current sender ownership.

### Intended Behavior

A sender may authenticate only as the unique active, nondeleted employee whose current profile phone equals the sender's full canonical number. Formatting changes may normalize to the same full number; different prefixes, historical leave contact values and duplicate ownership must not establish identity.

### Trace

1. `hermes-agent/assistant/src/conversation/stateMachine.ts:31` — **kind**: entrypoint
**scope**: original snapshot incoming WhatsApp sender
**description**: Original baseline-assistant handleIncomingMessage derives phone from the incoming remoteJid at line 32. For this finding, Evolution is a legitimate producer reporting the sender's own phone; producer spoofing and NIP linking are unnecessary.
2. `hermes-agent/assistant/src/conversation/stateMachine.ts:101` — **kind**: propagation
**scope**: original snapshot uncached sender verification
**description**: A fresh session submits this sender phone to verifyPhone; successful data is assigned to session.employee at line 103.
3. `hermes-agent/assistant/src/superapp/client.ts:72` — **kind**: propagation
**scope**: original snapshot integration request
**description**: The legitimate assistant client POSTs the sender phone to /auth/verify-phone using its configured service credential. The service gate authenticates the assistant, not the employee represented by the phone.
4. `backend/app/Modules/Agent/Controllers/AgentAuthController.php:21` — **kind**: propagation
**scope**: original snapshot employee selection
**description**: After required/string/max:50 validation, the controller delegates identity selection entirely to PhoneSanitizerService.
5. `backend/app/Modules/Agent/Services/PhoneSanitizerService.php:61` — **kind**: propagation
**scope**: original snapshot noncurrent phone matching
**description**: The active employee query accepts exact forms OR trailing-nine containment at line 66, then first() at line 68. Fallback at lines 75-92 instead returns the active employee referenced by a historical leave phone, even with a different current phone.
6. `backend/app/Modules/Agent/Controllers/AgentAuthController.php:33` — **kind**: sink
**scope**: original snapshot accepted employee identity response
**description**: A selected foreign employee yields successful HTTP 200 data containing its identity and current phone. Native focused tests observed this success for invalid suffix, history and ambiguity states. Original assistant then trusts this identity; downstream leave/ST gateway effects are source-visible, not independently observed here.

### Evidence

1. `backend/app/Modules/Agent/Services/PhoneSanitizerService.php:58` — **description**: Original snapshot derives exactly nine trailing digits; line 66 uses arbitrary SQL substring containment without full canonical equality. The native suffix fixture confirms SQLite accepts the mismatched full numbers.
2. `backend/app/Modules/Agent/Services/PhoneSanitizerService.php:68` — **description**: Original snapshot first() accepts ambiguous ownership. The duplicate full-phone fixture independently returned HTTP 200 rather than rejection.
3. `backend/app/Modules/Agent/Services/PhoneSanitizerService.php:85` — **description**: Original historical fallback checks only referenced active employee. A nonempty changed phone skips auto-sync at line 89 and still returns the employee at line 92; approved historical dummy contact reproduced successful verification. Null-phone auto-sync was source-reviewed but was not executed or claimed as a separately demonstrated mutation.
4. `backend/app/Modules/Kepegawaian/Controllers/EmployeeLeaveRequestController.php:144` — **description**: Personal leave input accepts an optional user-supplied contact phone and persists it at line 252. A leave contact is not proof of a current employee phone binding.
5. `backend/app/Modules/Kepegawaian/Controllers/EmployeeController.php:243` — **description**: Authorized profile updates persist validated telepon; current EmployeeRequest lines 13-15 require an admin or super_admin. Changing that current field does not rewrite historical leave contacts.
6. `backend/app/Modules/Agent/AgentServiceProvider.php:18` — **description**: Agent routes use api plus RestrictAgentClientIp. Its allowed socket-peer or configured nonempty key control protects integration access but does not independently bind the sender phone to the employee; native tests use the isolated allowed loopback peer.
7. `hermes-agent/assistant/src/conversation/stateMachine.ts:188` — **description**: Original baseline-assistant uses the selected employee NIP for leave balance and sends the resulting message to original remoteJid at line 204; ST follows the same source-visible pattern at lines 250-267. No end-to-end gateway result is asserted.
8. `backend/tests/Feature/StKepegawaianSecurityClosureTest.php:346` — **description**: Maintained native data-provider test creates one active dummy employee with +62811999999901 and submits +62812999999901, or creates a historical +6281400000003 contact while keeping the different current phone, or duplicates full current ownership. It expects 404 at line 363 and then proves a uniquely normalized exact current-phone control at lines 364-366.
9. `backend/app/Modules/Agent/Services/PhoneSanitizerService.php:41` — **description**: Current source validates canonical E.164 shape at line 42, iterates only active nondeleted employees with nonnull current telepon at line 48, requires full normalized equality at line 49, returns null on a second owner at line 50, and has no leave-history lookup. This refutes a present-tense vulnerable lookup claim.
10. `hermes-agent/assistant/src/conversation/stateMachine.ts:102` — **description**: Current source re-verifies every message, deletes unverifiable session state, and resets cached state on employee identity changes, so the old cached identity does not bypass the repaired lookup.

### Conditions

- **kind**: authentication_level
  **description**: The lower-trust principal controls a genuine sender phone but has no authority over the affected employee. A legitimate assistant service submits that phone through the authorized integration channel; no direct service-gate bypass is required.
- **kind**: data_state
  **description**: Original source requires an active nondeleted employee with a current number containing the sender's nine-digit suffix, or a retained historical leave contact equal to the sender number and no earlier current-phone match. Duplicate full ownership also fails closed only after the current repair.
- **kind**: system_configuration
  **description**: The vulnerable behavior applies to the immutable original run-7 source snapshots. The reviewed current dirty worktree and wave3 phone-lookup snapshot already contain the fix.
- **kind**: third_party_dependency
  **description**: Real provider number allocation, ownership, inbound delivery and deployed gateway reachability were not measured; the independently demonstrated result is bounded to native dummy database and HTTP identity acceptance.

### Execution

**attacker perspective**: A genuine sender whose own phone is not the unique current phone of dummy employee A; its accepted phone string reaches the trusted assistant's native verification API. Local tests simulate only the authorized integration peer and isolated dummy data.
**payloads**: - POST /api/agent/v1/auth/verify-phone {"phone":"+62812999999901"}; dummy A.current_phone=+62811999999901
- POST /api/agent/v1/auth/verify-phone {"phone":"+6281400000003"}; dummy A.current_phone=+62811999999901; A historical approved leave contact=+6281400000003
- POST /api/agent/v1/auth/verify-phone with A.current_phone when two active dummy employees share that exact phone
**instructions**: - Read the existing test_agent_phone_identity_rejects_suffix_collisions_old_contacts_and_ambiguity fixture; do not create or execute a custom harness.
- Invoke trusted C:/Users/USER/security-audit-skill/bksda-superapp/run-7/run.py php test_agent_phone_identity_rejects_suffix_collisions_old_contacts_and_ambiguity under PORTAL_AUDIT_OWNER=phase3_06 and PORTAL_AUDIT_VARIANT=baseline, then the same focused filter with variant=current. These two runs used the maintained test against the original snapshot and current source respectively.
- The trusted runner used network none, empty allowlisted dummy environment, readonly source/tools and rootfs, UID 65534, cap drop/no-new-privileges, 1 CPU, 1536 MiB memory, 64 PIDs, 128 MiB scratch, 16 MiB file, 170 CPU seconds and 185-second wall bound. SQLite was in-memory; external adapters and providers were not used.
- After each completed sandbox, inspect own promoted execution.json, output.txt and results.xml. Verify promoted SHA-256 values and all_writers_stopped_before_promotion before relying on the observations.
**observed result**: Baseline job php-863ded1d2a7c completed with three assertion failures: suffix, history and ambiguous requests each expected 404 but received HTTP 200. Native original controller returns 200 only with a selected employee identity; the suffix/history fixtures have only dummy A, establishing the foreign/current-binding mismatch at the verification boundary. Current job php-3a7f53e06f49 passed 3 tests and 9 assertions: invalid states are rejected and each unique exact normalized control returns A's asserted id. No gateway delivery, leave write or null-phone auto-sync was executed. Receipts are C:/Users/USER/security-audit-skill/bksda-superapp/run-7/agents/phase3_06/artifacts/php-863ded1d2a7c/{execution.json,output.txt,results.xml} and php-3a7f53e06f49/{execution.json,output.txt,results.xml}. Independently recomputed output/XML SHA-256 values matched each receipt: baseline 01e1d8e783b76dba4e8ff0520a9477e66db4012d7a692ed39dad4d2239293524 / 5436e09208a0ce45b5543e55f8ed028bf5824ae0666dc8dc6af76a20c93965e9; current dc3597191dfb2c87096ce6b8d5646c7f6776f66b1d20547f303a9ae74f98b758 / 74e02ab228521ca8128995c2d61950a7c8bc64696754cf6869e3aae8854cf312.

### Remediation

**strategy**: Already implemented in current source: normalize the complete sender and current profile phones, require exactly one active nondeleted employee match, reject ambiguity, and remove historical-contact authentication and auto-sync. Keep historical leave phone values as contact data only. Preserve the maintained suffix/history/ambiguity and exact canonical controls. Current state-machine per-message verification also prevents cached identities from retaining obsolete bindings.

### Severity

**likelihood**: **score**: medium
**reason**: The original rule is directly reachable for a genuine sender through the legitimate assistant but requires a matching suffix, retained historical contact ownership, or ambiguous roster data. Actual allocation and prevalence are unmeasured; the current repair closes this path.
**impact**: **score**: medium
**reason**: Demonstrated successful authentication as a different current employee at the narrow assistant verification boundary, with its identity response. Source downstream consumers trust this identity for employee-scoped leave/ST actions, but those effects and full Portal account access were not independently demonstrated.
**overall severity**: medium

### Confidence

**score**: high
**reason**: Independent source reconstruction and actual Laravel ORM/HTTP test failures establish the original acceptance in deterministic dummy states. Identical focused native tests pass current source and verify exact-number controls. Promotion receipts were completed and hashes checked; external provider behavior and downstream delivery are expressly outside the observed claim.

## Historical NIP-only assistant phone rebinding accepted another employee's phone replacement; repaired

`assistant/phone-link/nip-only-employee-binding`

The original run-7 baseline-source and baseline-assistant snapshots, reviewed against HEAD fc610d1dd81c5cad74feba71ac182a6825750ad6 plus the current dirty worktree, permitted a sender without an employee binding to supply an active employee's NIP. The assistant forwarded that NIP and the sender phone using integration authority; the backend selected that employee and overwrote telepon. Independent native execution of the preserved backend accepted a different phone for an already registered dummy employee with HTTP 200. This is a historical accepted identity/profile transition, not a present-tense vulnerability: current source removes conversational NIP linking and makes the compatibility endpoint read-only confirmation of a unique existing phone/NIP match. The maintained replacement regression now passes. Downstream balance/ST disclosure, live Evolution provenance, and portal password takeover were not reproduced or claimed as observed results.

### Root Cause

In the original snapshot, a trusted integration credential authenticated the assistant service but did not prove the lower-trust sender's authority over the message-selected employee. Active status and NIP equality were the only employee selection conditions before the unconditional phone update; no employee session, existing-owner approval, or account-bound linking proof was required.

### Intended Behavior

Knowledge of an employee identifier must not authorize changing that employee's phone or acquiring the employee's assistant identity. Ordinary employee mutations are protected by authenticated module/admin authorization, and current assistant confirmation requires an already established unique phone ownership binding.

### Trace

1. `hermes-agent/assistant/src/conversation/stateMachine.ts:109` — **kind**: entrypoint
**scope**: Unregistered sender's NIP message
**description**: Original run-7 baseline-assistant snapshot: after verifyPhone yields no employee and no cached employee exists, sender-controlled text matching an 18-digit NIP beginning 19 or 20 selects the employee identifier. This assumes a genuine provider-delivered sender and does not rely on webhook forgery.
2. `hermes-agent/assistant/src/conversation/stateMachine.ts:111` — **kind**: propagation
**scope**: Service-authorized employee linking
**description**: Original baseline-assistant snapshot: calls linkPhone with the message-selected NIP and phone derived from the sender JID. Successful returned employee is stored in the sender session at lines113-115.
3. `hermes-agent/assistant/src/superapp/client.ts:82` — **kind**: propagation
**scope**: Native POST /auth/link-phone
**description**: Original baseline-assistant snapshot: posts nip and phone to the agent endpoint; the Axios instance attaches X-Agent-Internal-Key at line65. Service authentication does not add employee authority.
4. `backend/app/Modules/Agent/Controllers/AgentAuthController.php:53` — **kind**: propagation
**scope**: Link request validation
**description**: Original baseline-source snapshot: validates only NIP/phone string lengths then delegates at line58. No employee-account or existing-phone proof is accepted or checked.
5. `backend/app/Modules/Agent/Services/PhoneSanitizerService.php:110` — **kind**: sink
**scope**: Employee phone update
**description**: Original baseline-source snapshot: finds selected active employee at line104, canonicalizes the supplied phone, and unconditionally updates telepon. Native regression observed this replacement request accepted with HTTP200; the test stops at that unexpected response before its later database assertion.

### Evidence

1. `backend/tests/Feature/StKepegawaianSecurityClosureTest.php:330` — **description**: Maintained native dummy fixture creates an active employee through actor(), registers +6281200000001, then submits that NIP with foreign +6281300000002 at line334. Original backend execution returned200 instead of404; current execution passes all4 assertions, including unchanged phone and positive normalized-current-phone confirmation.
2. `backend/app/Modules/Agent/AgentServiceProvider.php:18` — **description**: Original baseline-source and current source both route the agent API through api plus RestrictAgentClientIp, rather than employee Sanctum authorization. The finding assumes authorized service delivery; it does not assert bypass of that integration gate.
3. `backend/app/Modules/Kepegawaian/Requests/EmployeeRequest.php:13` — **description**: Original baseline-source and current source restrict ordinary employee modification requests to admin/super_admin. Kepegawaian Routes/api.php lines26,96,99 additionally require authenticated module access and admin role for employee update, unlike historical NIP-only assistant mutation.
4. `hermes-agent/assistant/src/conversation/stateMachine.ts:188` — **description**: Original baseline-assistant snapshot only: CEK_CUTI fetches emp.nip and replies to remoteJid at204; STATUS_ST does the same at250 and267. These explain the source-visible identity consequence, but no downstream disclosure was executed.
5. `hermes-agent/assistant/src/conversation/stateMachine.ts:102` — **description**: Current worktree remediation: every message revalidates the sender phone, deletes unverified sessions, sends portal guidance and returns at109. There is no NIP-link branch or linkPhone call; a cached employee is not accepted as proof.
6. `backend/app/Modules/Agent/Services/PhoneSanitizerService.php:60` — **description**: Current worktree remediation: linkPhoneToEmployee only returns an existing unique active canonical-phone match whose NIP agrees; it performs no update. findEmployeeByPhone lines41-54 rejects invalid/ambiguous phone ownership. The wave3-baseline snapshot already contains this repair.
7. `backend/tests/Feature/AgentModuleTest.php:109` — **description**: Current maintained confirmation-only test passes1 test/5 assertions: NIP+unregistered phone returns404 without mutation; the pre-established profile phone then confirms successfully. Its historical name/wording in the candidate was stale.

### Conditions

- **kind**: data_state
  **description**: Historical source only: selected employee is active, not excluded by the Employee administrator global scope, and has a known NIP. The conversational branch requires an18-digit NIP beginning19 or20 and an unregistered sender without an employee session.
- **kind**: authentication_level
  **description**: The sender needs no employee portal session. The assistant's authorized integration transport must reach the native endpoint; the test exercises that native interface in its local allowed testing context, without claiming a service-gate bypass.
- **kind**: third_party_dependency
  **description**: The source-derived WhatsApp path assumes ordinary genuine Evolution delivery of the sender JID. No deployed ingress, live provider, real number ownership, Redis, or model service was contacted.
- **kind**: system_configuration
  **description**: Affected historical implementation is preserved in run-7/baseline-source and baseline-assistant; current dirty worktree and wave3-baseline have removed the relevant mutation path.

### Execution

**attacker perspective**: A lower-trust sender chooses another employee identifier while the service supplies integration authority. Native reproduction intentionally isolates the backend accepted transition using disposable dummy employee900000000000000001; this fixture NIP does not match the historical conversational regex, so it is not described as an end-to-end WhatsApp reproduction.
**payloads**: - POST /api/agent/v1/auth/link-phone {"nip":"900000000000000001","phone":"+6281300000002"}; dummy employee's existing phone=+6281200000001
**instructions**: - Use trusted run-7/run.py with PORTAL_AUDIT_OWNER=phase3_07 and PORTAL_AUDIT_VARIANT=baseline, kind php, filter test_agent_nip_alone_cannot_replace_a_registered_phone. The maintained current test is mounted against original backend app/config; it creates only disposable SQLite-memory dummy records.
- Stop at unexpected HTTP200 for the foreign-phone transition. Do not contact providers or request another employee's downstream data. Repeat the same focused maintained regression with PORTAL_AUDIT_VARIANT=current to verify the repair.
- Both runs use networknone, read-only source/toolchain/rootfs, empty explicit dummy environment, UID65534, dropped capabilities/no-new-privileges,1CPU,1536MiB,64pids,128MiB scratch,16MiB per-file limit and185s wall bound. Environment values and full command are in each own execution receipt. Trusted observer promotes only output.txt/results.xml after all writers stop; promoted SHA256 values were independently checked.
**observed result**: Baseline job php-33a07452ce8b completed exit1:1 test/1 assertion failed because native POST returned200 instead of404 at StKepegawaianSecurityClosureTest.php:334. This establishes server acceptance of the invalid replacement transition; the later database assertion was not reached. Current job php-e87041c78b3f completed exit0:1 test/4 assertions passes, rejecting foreign phone and preserving existing phone while accepting its normalized form. Current confirmation-only job php-c356d1fb1943 also completed exit0:1 test/5 assertions. Own receipts reside under run-7/agents/phase3_07/artifacts/<job>/execution.json with output.txt and results.xml; all show completed processes and parent-side promotion. No balance/ST data or live WhatsApp response was observed.

### Remediation

**strategy**: Already applied in current source: remove NIP-only conversational linking; direct unregistered senders to authenticated profile administration; keep the compatibility endpoint confirmation-only for a unique active current phone/NIP match. Preserve native replacement and normalized-phone positive-control regressions. Any future replacement flow must prove employee-account authority with action-bound single-use approval before changing the phone.

### Severity

**likelihood**: **score**: medium
**reason**: Historical path requires knowledge of an active employee NIP plus genuine sender access to the configured assistant integration; current implementation is repaired. No provider/ingress deployment exposure was assumed.
**impact**: **score**: medium
**reason**: Observed native acceptance defeats the employee phone binding for one selected dummy employee; source shows profile mutation and potential assistant identity reassignment. No portal takeover, downstream data disclosure, or broader service compromise was demonstrated.
**overall severity**: medium

### Confidence

**score**: high
**reason**: Independent source reconstruction and completed bounded native original/current checks establish the historical accepted transition and current rejection. The report explicitly distinguishes source-derived downstream consequences from the narrower observed native result.

## Repaired historical assistant cache retained a revoked phone identity

`assistant/session/cached-employee-binding-after-revocation`

The original run-7 assistant reused a phone-keyed employee snapshot without revalidating current phone ownership. A bounded joined fixture now establishes the session through actual initial verification, a complete memory-only leave draft and BATAL; an authenticated native dummy administrator then replaces the same employee phone. Native cold verification denies the old phone404 and accepts the new phone. Nevertheless the original full incoming handler requests that employee balance through actual SuperAppClient/Axios/native Laravel and records its private dummy balance in a gateway reply addressed to the old phone. Current source denies the old phone before any balance HTTP and preserves the new-phone positive control. No provider delivery, real account or leave/ST write is claimed.

### Root Cause

Original processMessage called verifyPhone only when session.employee was absent. Authorized EmployeeController phone updates did not invalidate the separate assistant cache. Thus an unexpired cached employee bypassed current phone binding; the trusted native balance endpoint intentionally authorizes the service by NIP, and the assistant formatted the result for the obsolete sender channel.

### Intended Behavior

Each incoming message must use the current unique active employee phone binding before any cached identity grants personal service capabilities. Withdraw or replace invalid cached identity and pending state; preserve legitimate new-phone access.

### Trace

1. `hermes-agent/assistant/src/conversation/stateMachine.ts:31` — **kind**: entrypoint
**scope**: Original baseline full incoming old-phone message
**description**: The maintained fixture invokes the actual handleIncomingMessage with its genuine old-phone remoteJid and cek cuti after authorized phone replacement. This is a native class-interface check, not an HTTP webhook or provider-delivery test.
2. `hermes-agent/assistant/src/conversation/stateMachine.ts:95` — **kind**: propagation
**scope**: Original phone-keyed cached identity
**description**: Loads session:user:<oldPhone> with employee A. The baseline fixture obtained this entry organically through native initial verification, complete draft save and BATAL saving employee-bearing IDLE; no baseline session injection occurs.
3. `hermes-agent/assistant/src/conversation/stateMachine.ts:100` — **kind**: propagation
**scope**: Original current-binding bypass
**description**: verifyPhone is conditional on missing session.employee, so retained A skips the native current phone lookup that has just returned404 for this old phone.
4. `hermes-agent/assistant/src/superapp/client.ts:91` — **kind**: propagation
**scope**: Original credentialed native balance GET
**description**: The actual client GETs /employees/<A.nip>/leaves using its configured dummy integration credential. Native Axios makes the real loopback HTTP request; no backend response is mocked.
5. `backend/app/Modules/Agent/Controllers/AgentLeaveController.php:23` — **kind**: propagation
**scope**: Native NIP-based personal balance reader
**description**: The legitimate service endpoint requires active employee A by NIP, not original sender phone; it returns the actual saved dummy balance. The recorded old-phone GET returned200 in the baseline composition.
6. `hermes-agent/assistant/src/conversation/stateMachine.ts:204` — **kind**: sink
**scope**: Original reply to obsolete sender channel
**description**: Formats A NIP,12-day entitlement and10-day available balance from the native response and invokes the recording gateway for 6281111111111@s.whatsapp.net. This is an observed application send argument, not a delivered WhatsApp message.

### Evidence

1. `hermes-agent/assistant/tests/native-boundary.cjs:159` — **description**: Full incoming initial verification, complete deterministic memory-only draft and BATAL produce original employee-bearing IDLE. Current first exercises its own cancellation cleanup, then explicitly replays the exact organically created baseline value only for a controlled retained-session upgrade negative.
2. `hermes-agent/assistant/tests/native-boundary.cjs:194` — **description**: Actual native dummy administrator login200 and authorized employee-profile PUT200 replace A phone. Same-process native old-phone verification404/new-phone200 identify the same A, with no historical leave contacts or suffix match available.
3. `hermes-agent/assistant/tests/native-boundary.cjs:217` — **description**: Old full incoming balance message is measured through real client/native Axios/native PHP. Baseline old-phone balance HTTP count1/status200 and private-marker boolean true; current count0, old-phone verification404, markerfalse and cleared session. Both new-phone positive controls yield native200 and the balance marker.
4. `backend/tests/Security/assistant-native-seed.php:3` — **description**: Reuses the approved disposable seed, binds reserved dummy NIP900000000000000001 to the old phone and creates a saved12-day entitlement/2-day-used balance. No operational database or identity is used.
5. `backend/tests/Security/assistant-native-supervisor.py:22` — **description**: Real loopback PHP plus dummy SQLite; asserts zero leave-request/ST rows before and after. Redis/NLU/gateway are deterministic adapters, native PHP authentication/profile validation/phone lookup/balance response are not mocked. No Next/browser or real Redis/provider is tested.
6. `backend/app/Modules/Kepegawaian/Controllers/EmployeeController.php:243` — **description**: The original/current authenticated admin profile writer persists validated telepon. The joined fixture now observes this actual authorized write rather than merely seeding the post-change data state.
7. `hermes-agent/assistant/src/conversation/stateMachine.ts:102` — **description**: Current worktree verifies each message against the native current binding, clears invalid session/pending state and returns before personal service capabilities. Joined current negative and legitimate new-phone positive support this remediation.

### Conditions

- **kind**: authentication_level
  **description**: A sender controls the formerly bound phone and its unexpired cached employee session, but that phone no longer represents A after authorized replacement. No direct service-key, NIP-link or webhook-producer bypass is required.
- **kind**: data_state
  **description**: A remains active, its phone changes to a distinct full number, and no historical leave-contact or suffix-collision match exists; native cold old-phone lookup404 establishes revoked binding independently of those separate defects.
- **kind**: timing_dependency
  **description**: The observed operation occurs within the saved1800-second session TTL. No maximum lifetime, repeated refresh, persistence or post-window effect is asserted.
- **kind**: system_configuration
  **description**: Historical result uses immutable baseline assistant/backend app/config; current result uses current native backend and an explicitly labeled exact historical-session replay after organic current cancellation deletes its own session. All services are disposable and network-none.

### Execution

**attacker perspective**: Holder of an obsolete phone-bound assistant session; the affected resource is dummy A personal leave balance. The prior phone binding is created legitimately before an authorized native administrator changes it.
**payloads**: - Full incoming DUMMY COMPLETE LEAVE DRAFT then BATAL with deterministic intents creates only an in-memory draft/cancelled cached IDLE. No YA is sent.
- Native dummy admin POST /api/login then PUT /api/kepegawaian/employees/<A.id> with unchanged NIP/name and telepon=+6282222222222.
- Native verify-phone old6281111111111 returns404/new6282222222222 returns A; then full incoming cek cuti from old phone, followed by a legitimate new-phone positive control.
**instructions**: - Use only trusted run-7/run.py assistant-native with own PORTAL_AUDIT_OWNER and PORTAL_AUDIT_VARIANT=baseline, then current. The maintained files are native-boundary.cjs and backend/tests/Security/assistant-native-{seed.php,supervisor.py}; dependencies already installed, no downloads.
- Target is networknone/env-i allowlist/ROsource-tools-rootfs/UID65534/capdrop/no-newpriv,1CPU1536MiB64pids128MiB scratch16MiB file185s wall. Real PHP listens only127.0.0.1:18080 with scratch SQLite; real Axios forbids redirects/proxies/nonallowlisted routes. Only dummy admin credentials and dummy integration key are present.
- Baseline is a bounded observational run; current mode asserts denial before any balance HTTP and rejects a stale marker. Current controlled negative replays only the exact organically established historical session, explicitly not a claim that current cancellation creates IDLE.
- Inspect completed own execution receipts/promoted output/results and hashes after all writers stop. No leave/ST record is created; no actual Redis, model, gateway/provider, message delivery, pairing, browser or deployment access occurs. Stop at the dummy marker and recording destination.
**observed result**: Parent baseline assistant-native-37d6087c75a2 completed0: native profile PUT200, cold old-phone404/new-phone200, then old-phone balance GET200(count1), A NIP/12-day entitlement/10-day balance markertrue in recording gateway destination6281111111111@s.whatsapp.net. Current assistant-native-9d0f21185789 completed0: same authorized replacement and cold controls, old-phone verification404 and balance GETcount0/markerfalse, new-phone balance200/markertrue. Both before/after leave/ST counts are0. Output SHA256 baseline45a1a854fe71cde78e2cceaa09924c35e304f89bca30730f40d5e2eb13d7a51a/current63a2546175aead866f0c8943d41e4cb3e1627b3aad448e39980f700218f7df37. These are joined native backend/assistant observations with deterministic Redis/NLU and recording gateway, not delivered messages.

### Remediation

**strategy**: Already implemented in current source: revalidate current phone identity on every message, delete invalid retained sessions/pending data and reset mismatched employee id/NIP before capabilities. Keep the joined native retained-session negative and new-phone positive controls; cached state is not current phone-ownership proof.

### Severity

**likelihood**: **score**: medium
**reason**: Requires an existing valid unexpired cached binding followed by authorized phone replacement and access to the old phone channel; the joined dummy sequence reliably reproduces it in original source.
**impact**: **score**: medium
**reason**: Observed one employee personal balance returned by the native API and delegated to an obsolete phone destination. No actual delivery, account takeover, leave/ST mutation or broader dataset effect is established.
**overall severity**: medium

### Confidence

**score**: high
**reason**: Joined actual full incoming stateMachine, actual SuperAppClient/native Axios and native PHP with authenticated profile change/cold controls establish the original wrong-destination balance response and current tested denial. Parent observer receipts/hashes verified; scope remains bounded to the joined dummy backend and recording gateway without provider delivery.

## Historical assistant webhooks delegated unauthenticated producer input (remediated)

`assistant/webhooks/unverified-producer-authority`

The immutable run-7 baseline assistant accepted anonymous producer requests. Its ST publication handler formatted a caller-selected recipient and task into an official notification and delegated it to the gateway. An independent native Express test observed one dummy gateway send delegation for an unsigned ST request and one conversation dispatch for an unsigned Evolution request. The current dirty worktree enforces separate producer credentials and passed the same native checks. This confirms the historical listener-level authority defect and its current remediation; deployed listener exposure, actual WhatsApp delivery, and persisted leave creation were not established.

### Root Cause

In the reviewed baseline, index.ts mounted JSON parsing and registered both POST handlers without producer authentication. Body metadata such as fromMe and remoteJid could not authenticate the transport peer. The intended Laravel publisher supplied X-Agent-Internal-Key, but the baseline receiver ignored it before granting access to official-message delegation.

### Intended Behavior

Only the designated authenticated Laravel producer may trigger official ST notification delegation, and only the designated authenticated Evolution producer may select a WhatsApp sender for conversation dispatch. Missing receiver credentials must disable the corresponding route.

### Trace

1. `hermes-agent/assistant/src/index.ts:282` — **kind**: entrypoint
**scope**: baseline POST /webhook/st-published
**description**: Immutable run-7 baseline-assistant snapshot line282 accepts the lower-trust HTTP body without checking producer identity. Current corresponding line312 now installs requireServiceKey before the handler.
2. `hermes-agent/assistant/src/index.ts:300` — **kind**: propagation
**scope**: baseline recipient selection
**description**: In the baseline snapshot, caller-supplied personil.telepon is stripped to digits and made into the notification remoteJid; the dummy fixture selected6281111111111@s.whatsapp.net.
3. `hermes-agent/assistant/src/index.ts:301` — **kind**: propagation
**scope**: baseline official message construction
**description**: In the baseline snapshot, caller-supplied ST fields and employee name are inserted into the official-publication message without an authenticated producer decision.
4. `hermes-agent/assistant/src/index.ts:312` — **kind**: sink
**scope**: baseline privileged gateway delegation
**description**: Baseline line312 calls gateway.sendMessage(remoteJid,message,true). The native unsigned ST request independently recorded exactly one call to the dummy recording gateway adapter. Current corresponding line342 is reached only after producer authentication. No provider request or delivered message is claimed.

### Evidence

1. `backend/app/Modules/Agent/Jobs/DispatchSuratTugasWebhook.php:58` — **description**: The intended Laravel ST producer sends X-Agent-Internal-Key, establishing the producer credential expected by the repaired receiver; missing webhook URL or internal key stops the producer at line30.
2. `hermes-agent/assistant/src/gateway/evolution.ts:47` — **description**: In the reviewed immutable baseline, sendMessage line47 would POST the selected number/text to the configured Evolution sendText endpoint, using the gateway API key header from line17. This continuation is source evidence only; the reproduction replaces the entire gateway adapter and does not issue this HTTP request. Current corresponding sendText line is48.
3. `hermes-agent/assistant/src/index.ts:236` — **description**: Related baseline Evolution route236 also omits producer authentication; its body fromMe/group filters at247/252 do not authenticate the peer. Independent native unsigned request recorded one conversation dispatch, but no state-machine leave persistence was tested.
4. `hermes-agent/assistant/src/index.ts:17` — **description**: Current requireServiceKey returns503 when the configured credential is absent and403 on missing, wrong-length or unequal credentials, using timingSafeEqual; next executes only after success. Routes266 and312 attach separate Evolution and SuperApp headers and environment keys.
5. `hermes-agent/assistant/tests/security-boundary.cjs:168` — **description**: The maintained fixture loads actual index.ts and native Express while GatewayAdapter records calls in memory; StateMachineAdapter records dispatches. It intercepts dotenv and never loads real external adapters. Native negative-case diagnostics record route/status and delegation counts before status assertions.
6. `hermes-agent/docker-compose.yml:66` — **description**: Source compose publishes assistant port3000. This establishes source configuration only; actual ingress reachability and any independently authenticated edge are unobserved. Current compose requires a separate EVOLUTION_WEBHOOK_KEY at75.
7. `hermes-agent/.env.example:17` — **description**: Current setup explicitly requires the Evolution producer to send X-Evolution-Webhook-Key and distinguishes receiver environment setup from producer header configuration. Producer deployment setup was not tested.

### Conditions

- **kind**: authentication_level
  **description**: Historical reproduction uses an anonymous HTTP caller with no producer header or credential; current routes reject this caller.
- **kind**: network_routing
  **description**: An attacker must reach the historical assistant listener. Local isolated-loopback access was demonstrated; deployed ingress, firewall and mandatory upstream authentication were not inspected or assumed.
- **kind**: system_configuration
  **description**: A real downstream send would additionally require an operational configured gateway; only the handler's dummy recording-adapter delegation was observed, independent of real gateway configuration.
- **kind**: data_state
  **description**: The minimum observed ST effect needs one caller-supplied nonempty dummy personil.telepon and inert ST fields; no existing employee, pending leave or database state is required for this path.

### Execution

**attacker perspective**: An anonymous peer submits a caller-authored official ST publication to the source-native Express route. All recipients, identifiers and contents are dummy fixtures and all outbound adapters only record calls in memory.
**payloads**: - POST /webhook/st-published with Content-Type: application/json and no producer header; body: {"event":"st_published","surat_id":"dummy-st-id","nomor_surat":"DUMMY-ST-ONLY","maksud_tujuan":"DUMMY-OFFICIAL-MARKER","tempat_tujuan":"Dummy Place","tanggal_mulai":"2026-11-09","tanggal_selesai":"2026-11-09","personil":[{"id":1,"nip":"199001012010011001","nama":"Dummy A","telepon":"+6281111111111"}]}
- Sibling evidence only: unsigned POST /webhook/evolution with {"event":"messages.upsert","data":{"key":{"fromMe":false,"remoteJid":"6281111111111@s.whatsapp.net","id":"dummy-webhook-event-1"},"message":{"conversation":"cek cuti"}}}
**instructions**: - Read the immutable run-7 baseline-assistant/src/index.ts and current routes plus the maintained security-boundary.cjs. Do not substitute deployed endpoints or real adapters.
- Run the trusted parent runner with PORTAL_AUDIT_OWNER=phase3_09_retry1, PORTAL_AUDIT_VARIANT=baseline: python C:/Users/USER/security-audit-skill/bksda-superapp/run-7/run.py assistant webhooks. Repeat with PORTAL_AUDIT_VARIANT=current only for remediation verification.
- The runner uses network none with isolated native loopback HTTP, empty env plus explicit safe dummy allowlist, read-only target/tools, UID65534, all capabilities dropped and no-new-privileges, 1CPU,1536MiB,64pids,128MiB scratch,16MiB file limit,170CPU seconds and185s wall limit. No installs, environment files, provider, Redis, model, Laravel service, pairing or actual message sends are used.
- Inspect each own execution.json and promoted output.txt after all processes terminate and verify output SHA256 against the receipt. The parent observer performs descriptor-bound, regular-single-link, bounded promotion. Stop at the recorded one dummy operation.
**observed result**: Baseline job assistant-bf7c4dab0432 exited1 because current denial assertions saw historical200. Its unsigned ST unconfigured-producer case recorded status200, dispatch_count0, send_count1; unsigned Evolution recorded status200, dispatch_delta1, send_delta0. The missing producer configuration case is decisive because the historical receiver never read that variable; no real gateway adapter was instantiated. Current job assistant-a5b46679da30 exited0 with3 tests63 assertions: unsigned, wrong and other-producer credentials returned403 with zero delegation; absent receiver keys returned503 with zero delegation; each designated dummy key accepted one intended adapter operation. Retained receipts: C:/Users/USER/security-audit-skill/bksda-superapp/run-7/agents/phase3_09_retry1/artifacts/assistant-bf7c4dab0432/{execution.json,output.txt} and assistant-a5b46679da30/{execution.json,output.txt}. Verified output SHA256 values76dafc9d92268771fcf6fe8cbafeedcb518370681b750f2a8ff42387c7bc525a and83785052b13b747e7805d6a71ad4beb7d3ca5abf74bfc6b729b59c1b36ab3cf7. Both receipts confirm all writers stopped and preopened observer descriptors. No delivery, native leave creation, real service invocation or deployed exposure was observed.

### Remediation

**strategy**: Already implemented and locally verified in the current worktree: require the designated producer credential before either webhook handler, use distinct Evolution and SuperApp credentials, compare credentials safely, and return503 when configuration is absent. Configure the actual Evolution producer's required header as documented, then deploy the reviewed source; actual deployment was not part of this verification. Preserve the native negative and valid-producer regressions.

### Severity

**likelihood**: **score**: medium
**reason**: The historical request needs no user interaction or producer credential once the listener is reachable, but deployed listener exposure and upstream authentication are unobserved, and the current source closes the path.
**impact**: **score**: medium
**reason**: Observed historical effect is unauthorized delegation of one caller-selected official notification to the gateway boundary, compromising producer/message integrity. Actual delivery, leave persistence or broader account compromise is not demonstrated.
**overall severity**: medium

### Confidence

**score**: high
**reason**: The complete historical HTTP-to-official-gateway-delegation trace is source-visible and independently observed with actual Express and a recording adapter. Current prevention is independently tested under the same bounded interface. Confidence does not extend to external delivery, ingress exposure or untested leave mutation.

## Original bank-allocation endpoint bypassed protected super-admin target authorization; current worktree repaired

`kepegawaian/bank-allocation/superadmin-target-authorization`

In the original run-7 pre-fix snapshot for fc610d1dd81c5cad74feba71ac182a6825750ad6, an active ordinary admin with kepegawaian access could select a visible employee linked by NIP to a super_admin User. Independent native Laravel requests showed the direct employee update returning 403 and the sibling bank batch accepting the same protected target in a mixed batch with HTTP 200. The original batch source traces this accepted operation to account-field updates and audit insertion; the failed status assertion prevented a separate refreshed-row observation. Current fc610d1d plus the reviewed dirty worktree has repaired this root cause: all targets are authorized before any writes, and the same focused test passes all seven assertions. No account takeover, actual payment effect, or current bypass is claimed.

### Root Cause

Original run-7 baseline MealAllowanceController::batchUpdateEmployeeBanks validated employee existence and caller category but omitted EmployeeController::update's resource-level rule forbidding ordinary admins from changing super_admin-linked employees. The global Employee scope only excluded specific central administrator identities and soft-deleted employees, so an ordinary dummy name and noncentral NIP remained visible. The request-controlled single_update flag selected account/telephone writes without adding authorization. Current source now checks the complete selected set against super_admin Users, including soft-deleted Users, before entering the update loop.

### Intended Behavior

An ordinary kepegawaian admin must receive the protected-target denial consistently through direct employee updates and settings bank/account/telephone updates. A mixed batch containing a protected employee must be denied before any employee mutation; ordinary-admin ordinary-employee operations and super-admin protected-employee operations remain permitted.

### Trace

1. `backend/app/Modules/Kepegawaian/Routes/api.php:133` — **kind**: entrypoint
**scope**: PUT /api/kepegawaian/settings/employee-banks/batch
**description**: Original run-7 baseline for fc610d1d, route line 133: attacker-selected employee_ids enter through the real API route under auth:sanctum and module.access:kepegawaian (line 26), and role:super_admin,admin (line 96). These caller gates admit an active ordinary admin with module access. Current worktree keeps the same route and gates.
2. `backend/app/Modules/Kepegawaian/Controllers/MealAllowanceController.php:606` — **kind**: propagation
**scope**: batchUpdateEmployeeBanks input validation and normalization
**description**: Original run-7 baseline for fc610d1d, lines 606-627: employee_ids are client selected and existence checked; nama_bank must match registered master values. single_update is a client boolean that permits bounded account and telephone strings after normalization at lines 640-647. No target-linked User role is checked.
3. `backend/app/Modules/Kepegawaian/Controllers/MealAllowanceController.php:659` — **kind**: propagation
**scope**: batchUpdateEmployeeBanks original employee selection
**description**: Original run-7 baseline for fc610d1d, line 659: the transaction selects Employee::whereIn(id, ids) with ordinary global scopes. The central-identity and soft-delete scopes do not hide every super_admin-linked employee. There is no target-role check before the following loop. Current worktree adds the decisive check at lines 628-631.
4. `backend/app/Modules/Kepegawaian/Controllers/MealAllowanceController.php:674` — **kind**: sink
**scope**: Employee::update and UPDATE_BANK_ALLOCATION history
**description**: Original run-7 baseline for fc610d1d, line 674: each changed selected employee reaches Employee::update, followed by UPDATE_BANK_ALLOCATION history at lines 675-681. This is a source-traced protected-field mutation sink, while the native reproduction directly observed the unauthorized HTTP 200 completion. Current worktree places complete target-set authorization before the corresponding sink at line 646.

### Evidence

1. `backend/app/Modules/Kepegawaian/Controllers/EmployeeController.php:224` — **description**: Current fc610d1d plus dirty worktree and original run-7 baseline line 224: the direct writer denies an ordinary admin when User.username matches Employee.nip and the target User role is super_admin. Tracked fields at line 232 include bank, account number and telephone. This is a concrete protected-target policy, rather than an invented permission requirement.
2. `backend/app/Modules/Kepegawaian/Models/Employee.php:332` — **description**: Current fc610d1d plus dirty worktree: the global scope excludes one central NIP and administrator name patterns, in addition to SoftDeletes; it does not hide every super_admin-linked employee or authorize updates. Original run-7 baseline has the same central-identity scope at line 326. This supports the historical precondition but does not bypass the current controller check.
3. `backend/app/Modules/Kepegawaian/Controllers/MealAllowanceController.php:628` — **description**: Current fc610d1d plus dirty worktree: all selected employees are checked against super_admin users before any mutation, using withTrashed and username-to-nip identity binding. This is the decisive preventing control absent from original run-7 baseline lines 658-674. The later wave3-baseline also already contains this check at lines 662-665.
4. `backend/tests/Feature/StKepegawaianSecurityClosureTest.php:235` — **description**: Current maintained test uses real Laravel HTTP requests and dummy active principals with matching User.username/Employee.nip, ordinary employee names, explicit admin kepegawaian access, no forced-password state, and locally disabled 2FA enforcement. It asserts direct protected update 403, mixed bank batch 403, both original accounts preserved, ordinary-admin ordinary batch 200, and super-admin protected batch 200 with changed account. Independent current job php-ed108e1dafd1 passed one test and seven assertions. Its completed execution receipt reports all writers stopped and parent observer promotion; independently recomputed SHA256 matches output.txt 693f9a968ad6b7776b5dcfadb65ce8a75ea23f74eb902c879702069e4f7557d2 and results.xml 7ce62349aebf0ef2fbde4215cb224c483a5d78e54719d69b5386d5da0221f491.
5. `backend/tests/Feature/StKepegawaianSecurityClosureTest.php:246` — **description**: The same maintained current test mounted against original run-7 baseline source completed as job php-ddb5b6109f52: the direct update's 403 assertion passed, then the mixed bank batch returned 200 instead of expected 403 (one test, two assertions, one failure). The test stopped here before its explicit refreshed-row assertions, so baseline row values and history are not claimed as separately observed. Completed execution and promotion receipts were inspected; recomputed SHA256 matches output.txt 8b6f4b58930ab1365d0f507bbbf89e1d175a2d64bb80277abb7eab5e53ddc4d7 and results.xml 911905fb2412dac5a47cc24722f263ccf32e2b6f96824c41f1f2fafdbead41bd. Both runs used the trusted runner, network none, env-i safe allowlist, read-only source/toolchain, UID 65534, dropped capabilities, no-new-privileges, 1 CPU, 1536 MiB memory, 64 PIDs, 128 MiB scratch, 16 MiB file and 185-second wall limits, and disposable SQLite.
6. `backend/app/Http/Middleware/CheckRole.php:39` — **description**: Current fc610d1d plus dirty worktree: the enclosing role gate checks only caller category. CheckModuleAccess line 37 checks module access; EnsureAccountSecure lines 25-60 checks active status, password-change and configured 2FA state. None replaces the target check, which is now present in the batch controller.
7. `frontend/src/app/kepegawaian/settings/_components/MealAllowanceHolidaysTab.tsx:420` — **description**: Current fc610d1d plus dirty worktree: the real single-edit settings UI submits employee_ids, nama_bank, nomor_rekening, telepon and single_update=true to the same batch endpoint. Its availability does not defeat the current server-side protected-target denial.

### Conditions

- **kind**: authentication_level
  **description**: Authenticated active dummy admin; must_change_password=false; account-security middleware permits the request. Local fixture disables configured 2FA enforcement and uses Sanctum::actingAs.
- **kind**: authorization_role
  **description**: Caller role admin and access_modules includes kepegawaian. No extra explicit permission is required by this route.
- **kind**: data_state
  **description**: A query-visible active employee has a noncentral NIP, an ordinary name and a linked User with username exactly matching that NIP and role super_admin. The fixture also includes an ordinary employee in the requested mixed batch.

### Execution

**attacker perspective**: Ordinary authenticated kepegawaian admin submits protected employee IDs through the normal settings batch API, after the source-of-truth direct update rejects that protected employee.
**payloads**: - PUT /api/kepegawaian/employees/{protected-id} with {"nip":"900000000000000002","nama_lengkap":"Dummy Employee 2","nomor_rekening":"DUMMY_CHANGED"}
- PUT /api/kepegawaian/settings/employee-banks/batch with {"employee_ids":["{ordinary-id}","{protected-id}"],"single_update":true,"nomor_rekening":"DUMMY_CHANGED"}; replace placeholders with the fixture-created integer IDs
**instructions**: - Use only the trusted run-7 run.py runner with PORTAL_AUDIT_OWNER=phase3_10. It supplies a disposable full-schema SQLite memory database and dummy fixtures inside the approved network-none, empty-allowlisted-environment, read-only-source/tools, scratch-only-write OS sandbox with recorded low resource and wall limits.
- Set PORTAL_AUDIT_VARIANT=baseline and invoke python C:/Users/USER/security-audit-skill/bksda-superapp/run-7/run.py php test_employee_bank_batch_cannot_change_protected_profiles_or_partially_apply. The maintained fixture creates admin and super_admin users linked to ordinary-name employees, initializes dummy original accounts, authenticates the ordinary admin through Sanctum and issues the two real Laravel HTTP requests.
- Stop at the first unauthorized batch response. The baseline regression intentionally expects denial and therefore fails when it observes HTTP 200; do not describe subsequent database assertions as executed.
- Set PORTAL_AUDIT_VARIANT=current and invoke the same focused runner command. This validates repaired rejection and preserved rows, plus both permitted cases. Inspect completed execution.json, observer promotion status and recomputed promoted artifact hashes for each run.
**observed result**: Original baseline job php-ddb5b6109f52: direct protected employee PUT returned 403, then mixed bank batch returned 200 instead of expected 403 (one test, two assertions, one failure at maintained test line 246). Baseline row writes and history are traced from source, not separately refreshed or observed by this stopped test. Current job php-ed108e1dafd1: one test passed, seven assertions, establishing direct protected denial, mixed-batch denial with both original account values preserved, ordinary-admin ordinary update 200 and super-admin protected update 200 with changed protected account. Both executions completed and all writers stopped before parent-only promotion; execution receipts and SHA256 of output/XML were inspected and matched. Only local dummy records were used; no provider, real payment or deployed endpoint was exercised.

### Remediation

**strategy**: Implemented in current worktree: inside the transaction, select the complete target set, check its NIPs against super_admin User usernames withTrashed for any non-super-admin caller, and abort 403 before entering the employee-update loop. Retain the focused regression for mixed-batch atomic denial and permitted ordinary/super-admin cases. Current MealAllowanceController lines 626-631 implements this narrow fix; no generalized authorization layer or dependency is needed.

### Severity

**overall severity**: medium
**impact**: **score**: medium
**reason**: Original source permits unauthorized bank/account/telephone profile edits for the selected protected employee set; the native test directly establishes acceptance despite direct denial. Impact is bounded to these employee fields. No credentials, account takeover, payment execution or financial loss was observed.
**likelihood**: **score**: medium
**reason**: Requires an authenticated active ordinary admin with explicit kepegawaian module access and an existing visible super_admin-linked employee. A normal sibling settings API accepts the payload in original source.

### Confidence

**score**: high
**reason**: Independently inspected original and current route, validation, identity binding, middleware, model scopes, direct policy and sink. Paired native baseline requests establish direct403/batch200, and current regression verifies the fix. Original refreshed-row contents were not separately observed because the regression stops at the unexpected success status; the mutation and audit effects are explicitly source-traced.

## Own employee assignment history disclosed unpublished letters (repaired)

`kpg/employee-assignment-history/unpublished-participant-read`

Confirmed in the immutable run-7 original pre-fix baseline-source snapshot, associated with repository HEAD fc610d1dd81c5cad74feba71ac182a6825750ad6 and captured dirty worktree: an active ordinary participant with no modules read another creator's pending assignment keterangan through their own employee history, despite personal detail denying access. The current reviewed worktree is repaired and the focused native HTTP regression passes. This is a historical reproduced defect, not a claim of current exposure.

### Root Cause

The baseline history controller queried all letters attached to the authenticated employee without applying the official-status-or-creator restriction. Module middleware intentionally allowed own-employee GET requests, so it did not supply the missing publication boundary.

### Intended Behavior

A nonadministrator participant who did not create an assignment must not receive its unpublished business fields. The personal detail/download policy permits official statuses approved, completed, published and diterbitkan; creators and relevant-module administrators retain their intended access.

### Trace

1. `backend/app/Modules/Kepegawaian/Routes/api.php:47` — **kind**: entrypoint
**description**: Original run-7 baseline-source snapshot associated with HEAD fc610d1dd81c5cad74feba71ac182a6825750ad6: route is under auth:sanctum and module.access:kepegawaian (line 26). The same route exists in current source.
**scope**: GET /api/kepegawaian/employees/{employee}/assignment-letters
2. `backend/app/Http/Middleware/CheckModuleAccess.php:39` — **kind**: propagation
**description**: Original baseline-source snapshot associated with HEAD fc610d1dd81c5cad74feba71ac182a6825750ad6: a module nonmember is allowed only when the GET employee parameter matches the employee resolved from user.username to employee.nip; this permits their own derived history but does not grant foreign-employee history.
**scope**: CheckModuleAccess::handle own employee GET exception
3. `backend/app/Modules/Kepegawaian/Controllers/EmployeeController.php:619` — **kind**: sink
**description**: Original baseline-source snapshot associated with HEAD fc610d1dd81c5cad74feba71ac182a6825750ad6: the unfiltered employee relation is paginated and its model items returned at line 625, exposing pending keterangan. Current source instead filters at lines 624-628.
**scope**: EmployeeController::assignmentLetters baseline query and serialization

### Evidence

1. `backend/app/Modules/SuratTugas/Controllers/AssignmentLetterController.php:106` — **description**: Original baseline-source snapshot associated with HEAD fc610d1dd81c5cad74feba71ac182a6825750ad6 and current source: myShow explicitly rejects nonadmin noncreator readers of nonofficial assignments. Baseline native HTTP fixture observed this 403 before the history disclosure.
2. `backend/app/Modules/SuratTugas/Controllers/AssignmentLetterController.php:54` — **description**: Original baseline-source snapshot associated with HEAD fc610d1dd81c5cad74feba71ac182a6825750ad6: personal listing also applies the official-status aliases. This is source calibration; the focused reproduction did not call this list.
3. `backend/app/Modules/Kepegawaian/Models/Employee.php:361` — **description**: Original baseline-source snapshot associated with HEAD fc610d1dd81c5cad74feba71ac182a6825750ad6: assignmentLetters is an employee-scoped pivot relationship with no publication filter. Current relation begins at line 367.
4. `backend/app/Modules/SuratTugas/Models/AssignmentLetter.php:24` — **description**: Original baseline-source snapshot associated with HEAD fc610d1dd81c5cad74feba71ac182a6825750ad6: model includes keterangan and template_snapshot, uses soft deletes, and has no global publication scope or hidden-field projection. The observed disclosure is limited to dummy keterangan; no populated snapshot was tested.
5. `backend/app/Modules/Kepegawaian/Controllers/EmployeeController.php:624` — **description**: Current dirty worktree associated with HEAD fc610d1dd81c5cad74feba71ac182a6825750ad6: nonadmins are restricted to LOWER(status) in OFFICIAL_STATUSES or created_by equal to the current user; the administrator predicate matches personal detail policy.
6. `backend/tests/Feature/StKepegawaianSecurityClosureTest.php:83` — **description**: Current maintained native HTTP test against baseline and current app/config: creates distinct ordinary participant/creator, a pending sentinel and approved control; uses Sanctum actingAs without disabling authorization middleware. Baseline failed at sentinel assertion; current passed eight assertions, including creator detail access, foreign-employee denial and administrative history access.

### Conditions

- **kind**: authentication_level
  **description**: Active authenticated ordinary user with username bound to their own employee NIP; fixture uses Sanctum actingAs, not a real login or bearer issuance flow.
- **kind**: authorization_role
  **description**: Participant has role user, no module memberships and no special permissions; they are neither the creator nor a relevant-module administrator.
- **kind**: data_state
  **description**: A distinct creator has attached the employee to a pending assignment containing a protected business field. Only assignments involving that employee are demonstrated exposed.

### Execution

**instructions**: - Use the existing parent-authored trusted runner only: set PORTAL_AUDIT_OWNER=phase3_12 and PORTAL_AUDIT_VARIANT=baseline, then python run-7/run.py php StKepegawaianSecurityClosureTest::test_personal_employee_history_preserves_unpublished_letter_privacy.
- The maintained fixture creates active distinct ordinary A/B with empty modules and matching employee NIPs, authenticates A through Sanctum, checks personal pending detail 403, then own history 200 and sentinel exclusion. Stop when the sentinel assertion demonstrates disclosure.
- Repeat the same single focused filter with PORTAL_AUDIT_VARIANT=current to verify the existing repair and intended positive/negative authorization controls. Both runs use native Laravel HTTP authorization and dummy in-memory SQLite with structural migrations; five documented roster-data migrations are excluded.
- Runner launches an empty safe allowlisted environment with dummy APP_KEY, DB_CONNECTION=sqlite, DB_DATABASE=:memory:, array cache/session and local storage; scratch-only HOME/TMP/cache. OS controls: network none, read-only source/tools/rootfs, UID 65534, capdrop/no-new-privileges, 1 CPU, 1536 MiB memory, 64 PIDs, 128 MiB scratch, 16 MiB files and 185-second wall cap. Receipts contain the exact allowlist.
**payloads**: - GET /api/surat-tugas/my/{pendingLetterId}
- GET /api/kepegawaian/employees/{ownEmployeeId}/assignment-letters
- Fixture: pending created_by=B, keterangan=DUMMY_PENDING_PRIVATE, attached employee=A; separate approved letter as positive control.
**observed result**: Baseline job php-8c15c9967430 completed with exit 1: personal detail 403 assertion and history 200 assertion passed, then the response contained pending status, created_by=2 and keterangan=DUMMY_PENDING_PRIVATE, failing the exclusion assertion (1 test, 3 assertions). Current job php-434693ec6139 completed with exit 0 (1 test, 8 assertions): pending row/sentinel excluded, approved row retained, foreign employee history 403, creator detail 200, relevant-module admin history includes both rows. Parent-only observer receipts confirm descriptors preopened and all writers stopped before promotion. Own artifacts: agents/phase3_12/artifacts/php-8c15c9967430/{execution.json,output.txt,results.xml} and agents/phase3_12/artifacts/php-434693ec6139/{execution.json,output.txt,results.xml}. Recomputed SHA256 matches receipts: baseline output 9df742fd824f8671b1d57f0e4102ecc4a295f9a936eec2aea6ae4f01094d68cf, XML 6e2eedd81596d18af0fd71cb11d35d044087c6b10409d4f47d13dada8f9a8691; current output 787eed391f39c0df570735d67d80b891b46c6a9bb6d9ffc136e4eef2bb147f17, XML 6fc67f0c8df09392b385507e6c1a1e5e99dddcd44bf7e025da08fa980c2f6cb8. No deployment or provider behavior was tested.
**attacker perspective**: Ordinary authenticated participant A requests their own employee history to read pending content created by B, which the personal assignment reader withholds until publication.

### Remediation

**strategy**: Already implemented in current EmployeeController::assignmentLetters: preserve employee relation scope and intended administrator access, then for other readers group an official-status allowlist OR created_by=current user before pagination. Retain the focused native regression for participant, creator, administrator and foreign-employee behavior. No further fix is indicated for the demonstrated path.

### Severity

**impact**: **score**: medium
**reason**: Premature disclosure of another creator's unpublished assignment business content, demonstrated by one pending keterangan sentinel. Exposure is confined to assignments attached to the reader's own employee; arbitrary employee access or mutation was not demonstrated.
**likelihood**: **score**: medium
**reason**: In the baseline any authenticated nonmember participant could issue an ordinary own-history GET once a distinct creator attached them to an unpublished assignment; no victim action during the read was required, but a prepublication assignment relationship was necessary.
**overall severity**: medium

### Confidence

**score**: high
**reason**: Independent source reconstruction plus one focused native Laravel/Sanctum HTTP test reproduced the exact policy disagreement against the immutable original baseline. The same test passes against current repaired source; retained receipt hashes were independently checked. This establishes the historical authorization defect and current scoped closure, not deployed exposure.

## Historical shared-photo cleanup deleted another protected employee's photo; current source repaired

`portal/employee-photo/nonunique-storage-object`

Independently confirmed in the immutable run-7/baseline-source snapshot of the reviewed fc610d1d dirty worktree: a kepegawaian admin could force-delete ordinary employee A and remove local photo bytes still referenced by protected super_admin employee B, although direct force deletion of B returned 403. The same snapshot allowed ordinary A's personal photo replacement to delete a shared legacy object referenced by central super_admin B, whose employee row was hidden by the display global scope. Both active and soft-deleted B variants reproduced. The current working tree and inspected wave3-baseline contain the remediation; all four focused current regressions pass. This record describes the historical defect, not a demonstrated remaining defect in current source.

### Root Cause

Historical forceDestroy collected A's foto_profil and deleted it after deleting A without checking other employee references. Historical replaceProfilePhoto checked withTrashed references but retained excludeAdminPusat, so a hidden central reference did not prevent deletion. Generated employee-owned upload destinations already prevented new name-based collisions, but did not repair cleanup of legacy shared objects.

### Intended Behavior

An operation authorized for A must preserve photo bytes referenced by another employee B, including protected, display-hidden, active and archived references. Direct protected-target guards must also hold for effects through a shared object.

### Trace

1. `backend/app/Modules/Kepegawaian/Routes/api.php:104` — **kind**: entrypoint
**scope**: DELETE /api/kepegawaian/employees/{id}/force
**description**: Historical run-7 baseline route accepts an authenticated kepegawaian admin's selected employee ID, under auth:sanctum, module.access:kepegawaian and role:super_admin,admin. The lower-trust admin may delete ordinary A but is denied direct deletion of super_admin B.
2. `backend/app/Modules/Kepegawaian/Controllers/EmployeeController.php:413` — **kind**: propagation
**scope**: EmployeeController::forceDestroy file collection
**description**: Historical run-7 baseline line 413 collects the allowed target A's foto_profil after self and protected-target checks; the transaction at lines 425-430 deletes A and its eligible linked user. B remains outside the selected target.
3. `backend/app/Modules/Kepegawaian/Controllers/EmployeeController.php:435` — **kind**: sink
**scope**: EmployeeController::forceDestroy storage deletion
**description**: Historical run-7 baseline line 435 deletes the collected existing object without querying B's remaining reference. The native dummy HTTP replay reached this boundary: B's row/path remained while employees/dummy-shared.png no longer existed. Current line 433 instead invokes the complete-reference helper for the photo.

### Evidence

1. `backend/app/Modules/Kepegawaian/Controllers/EmployeeController.php:407` — **description**: Historical baseline and current source deny a non-super_admin direct force deletion of a super_admin target. The fixture observes this 403 before successfully deleting ordinary A.
2. `backend/app/Modules/Kepegawaian/Models/Employee.php:122` — **description**: Historical run-7 baseline line 122 checks withTrashed before replacement cleanup but leaves display global scopes enabled. Baseline lines 117-120 already use generated filenames under the persisted employee ID, reject failed storage writes and update the row before cleanup.
3. `backend/app/Modules/Kepegawaian/Models/Employee.php:326` — **description**: Historical run-7 baseline line 326 adds excludeAdminPusat, excluding NIP 198001012005011001 and administrator-name rows. This excludes the dummy central B reference from the historical replacement guard even when B is active; withTrashed alone only removes soft-delete filtering.
4. `backend/app/Http/Controllers/Api/AuthController.php:254` — **description**: The authenticated personal upload selects A by username-to-NIP identity, validates the raster upload and calls replaceProfilePhoto. Identity binding restricts the selected row, but did not prevent the historical shared-object deletion effect on hidden B.
5. `backend/tests/Feature/StKepegawaianSecurityClosureTest.php:400` — **description**: Maintained native Laravel HTTP test creates dummy principals, local fake storage and one shared PNG object. Four data cases cover force deletion and personal replacement, with protected B active or soft-deleted. Baseline replay fails only at line 427's shared-file existence check after successful route and B-path assertions; current replay passes file existence and exact byte equality.
6. `backend/app/Modules/Kepegawaian/Models/Employee.php:130` — **description**: Current and wave3-baseline remediation checks withoutGlobalScopes()->withTrashed() for any foto_profil reference before deletion; replacement invokes this helper at current line 121. Hidden and archived references therefore preserve the legacy object.
7. `backend/app/Modules/Kepegawaian/Controllers/EmployeeController.php:433` — **description**: Current and wave3-baseline forceDestroy remove the photo from the unconditional file list and invoke deleteUnreferencedProfilePhoto after row deletion, preserving B's shared object while retaining direct target authorization checks.

### Conditions

- **kind**: authentication_level
  **description**: An authenticated active account must satisfy password setup and any configured administrator 2FA requirement. The local fixture uses dummy Sanctum principals with must_change_password=false and explicitly disables optional 2FA enforcement.
- **kind**: authorization_role
  **description**: Force deletion requires an admin with kepegawaian module access who may delete A but not super_admin B. The hidden-reference replacement variant uses ordinary A's authenticated personal-photo endpoint and needs no administrative role.
- **kind**: data_state
  **description**: Distinct employee rows A and B already reference the same legacy photo object. B is a super_admin employee, active or soft-deleted; the personal replacement variant additionally uses central B with NIP 198001012005011001, hidden by excludeAdminPusat. No deployed prevalence or attacker ability to create arbitrary shared references is assumed.
- **kind**: system_configuration
  **description**: Observed storage effect is confined to Storage::fake('local') in isolated scratch storage with an in-memory SQLite database. No deployed disk, object-store provider or production record was contacted.

### Execution

**attacker perspective**: Either a kepegawaian admin deleting allowed ordinary A while protected B shares its photo object, or ordinary A replacing their own photo while hidden central B shares that object.
**payloads**: - Seed dummy employees A and super_admin B with foto_profil=employees/dummy-shared.png containing base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII='). For force-active and force-trashed, authenticate dummy kepegawaian admin C, DELETE /api/kepegawaian/employees/{B.id}/force expecting 403, then DELETE /api/kepegawaian/employees/{A.id}/force expecting 200. Repeat with B soft-deleted.
- For replace-hidden-active and replace-hidden-trashed, set B's NIP to 198001012005011001, authenticate ordinary A and POST /api/me/update-photo with Accept: application/json and foto=UploadedFile(dummy.png,image/png) containing the same valid PNG. Expect 200 and A's generated employee-ID path. Read B using withoutGlobalScopes()->withTrashed(); compare the old shared object's existence and bytes.
**instructions**: - Use only the parent-authored trusted runner: set PORTAL_AUDIT_OWNER=phase3_15 and PORTAL_AUDIT_VARIANT=baseline, then python C:/Users/USER/security-audit-skill/bksda-superapp/run-7/run.py php StKepegawaianSecurityClosureTest::test_photo_cleanup_preserves_all_other_employee_references. Repeat the identical focused filter with PORTAL_AUDIT_VARIANT=current. The immutable baseline app/config is combined with maintained test source and native structural migrations, excluding the five documented roster-data migrations.
- Completed own jobs are php-907daa0780ab (baseline, exit 1) and php-66f907d3cf0c (current, exit 0), under run-7/agents/phase3_15/artifacts/. Each execution.json records env-i with explicit dummy allowlist, network none, read-only source/toolchain/root filesystem, UID 65534, dropped capabilities, no-new-privileges, scratch-only writes, 1 CPU, 1536 MiB memory, 64 PIDs, 170 CPU seconds, 16 MiB file limit, 128 MiB scratch and 185-second wall limit.
- Both receipts record preopened observer descriptors and all writers stopped before bounded parent-side promotion. Independently matched output.txt/results.xml sizes and SHA256 values against both execution.json receipts. Baseline output SHA256 is 3d92c98f29bddcd16a7a2d51781fe6d3fcfd747c130a149d1ef274ba6b7e3203; current output SHA256 is 4762f01bbffb0052e0846f749036ebe7e286c60e35d75218c16a96bb83fb48cc. Optional results.json was absent and was not used as evidence.
**observed result**: Historical baseline: 4 tests, 16 assertions, 4 failures, all at the shared-file existence assertion. In force cases, protected-target deletion returned 403, ordinary-target deletion returned 200 and B's persisted photo path remained. In replacement cases, ordinary personal upload returned 200 with a generated employee-ID path and hidden B's persisted photo path remained. All four then observed the shared PNG missing. Current source: the identical four cases pass with 20 assertions, including preserved B path, object existence and exact original bytes. No stronger effect or provider/deployment behavior is inferred.

### Remediation

**strategy**: Already applied in the current working tree and inspected wave3-baseline: centralize photo cleanup in Employee::deleteUnreferencedProfilePhoto; query all active and soft-deleted employees with display scopes removed before deleting a path; call it from both replacement and force deletion, after the selected row's reference is removed. Preserve generated employee-ID destinations, failed-storage handling, authentication, module/role restrictions and protected-target checks. The focused four-case replay validates the repaired cleanup behavior for the historical shared-reference states.

### Severity

**likelihood**: **score**: medium
**reason**: Requires pre-existing shared legacy storage references. One reproduced variant needs an authorized kepegawaian administrator; the hidden central-reference variant needs only an authenticated ordinary employee replacing their own photo. Deployed shared-reference prevalence is unknown.
**impact**: **score**: medium
**reason**: Demonstrated unauthorized removal of the photo object still referenced by another protected employee, active or archived. The affected resource is a narrow photo object; no account takeover, broader data deletion or executable-content effect was demonstrated.
**overall severity**: medium

### Confidence

**score**: high
**reason**: Independent source tracing and native Laravel HTTP execution reproduce both historical cleanup variants with exact dummy shared-reference conditions. Completed trusted receipts and promoted hashes were checked. The same four cases pass on the current remediation; the finding is explicitly historical.

## Historical stale creator DELETE could trash a concurrently approved letter; current locking repairs it

`surat-tugas/delete-publication-stale-authorization`

Confirmed in the immutable run-7 original baseline-source snapshot associated with review HEAD fc610d1dd81c5cad74feba71ac182a6825750ad6, not an unfixed finding in the current dirty worktree. An authenticated ordinary module user owning a pending letter could start DELETE, retain an unlocked pending snapshot while an authorized administrator approved the same complete letter, then soft-delete that now-approved letter. The independently run native PostgreSQL fixture observed both HTTP requests return 200 and the final row retain status approved with deleted_at set. Current worktree destroy now locks the row inside its authorization-and-delete transaction; the same two-worker fixture observed approval blocked on deletion and then return 404, with only a pending tombstone remaining. The demonstrated historical impact is recoverable removal of the creator's newly official letter from the active set, not permanent destruction or access to another creator's letter.

### Root Cause

Historical destroy loaded the model without a transaction or row lock, evaluated creator and official-status policy on that snapshot, and invoked a primary-key-only SoftDeletes update. Concurrent approve acquired its own row lock and committed, but the unlocked delete never participated in that protocol or rechecked status at mutation time. Sanctum, module access, creator ownership, publisher authorization, publication validation and scheduling checks all remained effective; none refreshed the creator's stale status snapshot. The model and reviewed providers add no deleting authorization hook. Current destroy closes this gap by holding the same row lock through policy checks and soft-delete.

### Intended Behavior

A nonadministrator creator may trash an unofficial letter but must receive 403 for an approved, completed, published or diterbitkan letter. Publication and status-sensitive deletion must serialize so that a creator's stale pending snapshot cannot authorize deletion after official publication commits.

### Trace

1. `backend/app/Modules/SuratTugas/Routes/api.php:32` — **kind**: entrypoint
**scope**: DELETE /api/surat-tugas/{id}
**description**: Original baseline-source line 32: native DELETE is reachable by an authenticated user with surat_tugas or kepegawaian module access; the dummy caller is the ordinary creator.
2. `backend/app/Modules/SuratTugas/Controllers/AssignmentLetterController.php:779` — **kind**: propagation
**scope**: AssignmentLetterController::destroy
**description**: Original baseline-source line 779: plain findOrFail fetches the live pending row without FOR UPDATE or an open transaction. The fixture pauses after this query has fetched its result and before the controller receives that stale model.
3. `backend/app/Modules/SuratTugas/Controllers/AssignmentLetterController.php:1141` — **kind**: propagation
**scope**: AssignmentLetterController::approve
**description**: Original baseline-source: the administrator's overlapping native PUT approve locks at 1104, checks scheduling and merged publication content, updates at 1135 and commits at 1141. The fixture observes HTTP 200 and an approved, nondeleted row before releasing DELETE.
4. `backend/app/Modules/SuratTugas/Controllers/AssignmentLetterController.php:798` — **kind**: propagation
**scope**: AssignmentLetterController::destroy
**description**: Original baseline-source: after release, creator/status checks at 786-795 use the already fetched pending instance and pass; line 798 deletes it without refreshing status or applying an allowed-status predicate.
5. `backend/vendor/laravel/framework/src/Illuminate/Database/Eloquent/SoftDeletes.php:153` — **kind**: sink
**scope**: SoftDeletes::runSoftDelete
**description**: Framework code shared by the fixture variants: the primary-key query built at 139 updates deleted_at and updated_at at 153 without a current-status predicate. Historical native execution ends with HTTP DELETE 200 and an approved tombstone, crossing the explicit administrator-only official deletion boundary.

### Evidence

1. `backend/app/Modules/SuratTugas/Controllers/AssignmentLetterController.php:793` — **description**: Original baseline-source lines 786-795 explicitly require creator ownership for nonadmins and deny deletion of approved/completed/published/diterbitkan letters; this is the intended policy the stale snapshot defeats.
2. `backend/app/Modules/SuratTugas/Controllers/AssignmentLetterController.php:711` — **description**: Original baseline-source updateStatus locks the letter in a transaction before publication; approve likewise locks at 1104. Publication-side locking alone does not serialize the original unlocked destroy read.
3. `backend/app/Modules/SuratTugas/Controllers/AssignmentLetterController.php:905` — **description**: Original baseline-source bulkTrash retains created_by and allowed unofficial statuses at 905-906 in the actual soft-delete mutation query. This comparable bulk path already binds the lifecycle policy to the mutation, unlike historical single destroy. Current bulkTrash retains these predicates at 904-905.
4. `backend/app/Modules/SuratTugas/Controllers/AssignmentLetterController.php:783` — **description**: Current dirty worktree lines 782-792 transactionally lock the row, check creator and OFFICIAL_STATUSES, and delete before releasing the lock. Current publishers also lock at 706 and 1125. The independent current fixture confirms a real PostgreSQL lock wait and HTTP statuses [200,404], final pending tombstone, boundary_violation false.
5. `backend/tests/Security/st-delete-race.php:1` — **description**: Existing native two-worker fixture was inspected before use and executed independently through trusted run-pg.py for both source variants. It primes real Sanctum requests, gates the fetched destroy snapshot, observes publication commit or pg_blocking_pids lock dependency, and checks HTTP responses and the final stored row without observer database mutation.

### Conditions

- **kind**: authentication_level
  **description**: Authenticated ordinary user with current surat_tugas or kepegawaian module access; the native fixture uses a real Sanctum bearer token.
- **kind**: authorization_role
  **description**: The deleting user owns the pending letter and is not an administrator. A separate authorized administrator legitimately publishes that same letter.
- **kind**: data_state
  **description**: A live pending letter has complete publication content and an assigned active dummy employee with no conflicting schedule.
- **kind**: timing_dependency
  **description**: Historical DELETE fetches pending state before administrator approval commits, then proceeds to soft-delete after approval. The fixture controls this interleaving with a bounded query observer; no production timing probability is measured.

### Execution

**attacker perspective**: An ordinary module-enabled creator invokes the native DELETE endpoint on their own pending letter while a legitimate administrator approves it. No publisher privilege is assigned to the deleting user.
**payloads**: - DELETE /api/surat-tugas/{dummy_letter_uuid}
- PUT /api/surat-tugas/{dummy_letter_uuid}/approve with body {"status":"approved"} by the separate dummy administrator
**instructions**: - Use the existing trusted run-7/run-pg.py and inspected backend/tests/Security/st-delete-race.php only. Set PORTAL_AUDIT_OWNER=phase3_16 and run: python run-pg.py p316-delete-base-20261109a st-delete-race.php baseline-source. This uses original immutable app/config plus the maintained fixture and current structural migrations, not a claim that every historical deployment is reproduced.
- The prepared fixture creates one dummy creator, administrator, employee and complete pending letter, primes two independent native HTTP/database workers, pauses DELETE after its first model SELECT, starts administrator approval, observes commit before releasing DELETE, then records the minimum final row and HTTP statuses.
- Run the same prepared check against current source: python run-pg.py p316-delete-cur-20261109a st-delete-race.php source. It observes approval waiting on the deleting worker's row lock, releases DELETE and checks the resulting statuses and final state. The reverse current ordering is source-protected by the locked official-status check; it was not separately executed.
- Both runs use dedicated disposable PostgreSQL network-none loopback namespaces, no external routes or ports, env -i with explicit dummy values, read-only source/tools/rootfs, UID 65534, dropped capabilities, no-new-privileges, 1 CPU and 512MiB/64 PIDs per container, 90 CPU seconds, 4MiB file limit, 128MiB target scratch/256MiB database scratch and 150s execution wall bound. Trusted preopened observer descriptors promote only allowlisted bounded files after target and database writers stop. Independently reread each own execution.json, worker results and race-results.json and verified all promoted lengths/SHA256 hashes. No host target execution, shared database, provider or deployed endpoint was used.
**observed result**: Historical job p316-delete-base-20261109a completed with expected boundary-failure exit 1, setup ok, two worker exits [0,0], unlocked/nontransactional delete snapshot, publication_committed_before_delete_release true, HTTP statuses [200,200], final_status approved and final_trashed true. Its retained race-results.json SHA256 is bef7ac45319a9b07841c6c43bbf99bdedac932bae62311ad54a25459b0be8510. Current job p316-delete-cur-20261109a completed exit 0, setup ok, worker exits [0,0], locked transactional snapshot, publication_blocked_on_delete true, HTTP statuses [200,404], final_status pending, final_trashed true and boundary_violation false; race-results.json SHA256 is 8f03416e1b752c8f9ff961a6cc96b853f173cdf181ca0147d7ce6f71dbc61a5c. Both own execution receipts confirm all writers stopped before promotion; all six promoted files per job matched their recorded hashes. Artifacts are under agents/phase3_16/artifacts/{job}/ within run-7.

### Remediation

**strategy**: Already implemented in the reviewed current worktree: keep destroy's SELECT FOR UPDATE, creator/official-state authorization and soft-delete in one database transaction, using the same row lock as publication. Preserve bulkTrash's status-and-owner mutation predicates. Retain the native two-worker regression fixture and the official-letter 403 behavior.

### Severity

**likelihood**: **score**: low
**reason**: Requires an authenticated creator, a complete pending letter and overlap with another authorized user's successful publication; deterministic instrumentation demonstrates possibility but does not measure an attainable production race window.
**impact**: **score**: medium
**reason**: Historical creator request bypasses administrator-only official deletion and removes the newly approved letter from active queries. Blast radius is the creator's same letter and soft deletion is recoverable; no permanent file deletion or cross-owner mutation was observed.
**overall severity**: medium

### Confidence

**score**: high
**reason**: Independently inspected source and framework sink, reproduced the exact historical boundary violation using two real Sanctum HTTP workers against isolated native PostgreSQL, and verified the current row-lock repair under the same maintained fixture with matching retained receipt hashes. This confirms the historical issue and the tested current ordering, not an unfixed current vulnerability.

## Original public task submission disclosed selected employees' private fields; current projection verified

`surat-tugas/public-submit/full-employee-response`

Confirmed in the immutable run-7 original baseline-source snapshot associated with HEAD fc610d1dd81c5cad74feba71ac182a6825750ad6: an anonymous caller submitting one valid pending assignment received the selected dummy employee's bank name, account number, phone, email and full NIP in data.employees. The intended public roster omitted the bank/contact fields and masked NIP. The current dirty worktree is repaired: its public success response contains only id, status, created_by and approved_by; independent focused native tests passed. This record describes the demonstrated historical disclosure, not a current exploitable path or unintended public personnel catalog.

### Root Cause

The original baseline store shared its management success serialization with the public submission route. It loaded the unrestricted employees relation, then returned the complete AssignmentLetter model. Employee supplied no hidden/visible or custom serialization restriction, so native Eloquent recursively serialized persisted private attributes. Required input validation, forced pending status, scheduling locks, conflict checks and throttling did not authorize private employee reads or project the response. The current controller adds an explicit public-route success projection.

### Intended Behavior

Anonymous submission may select an ordinary active employee and create a pending assignment, but its response must not reveal that employee's bank/contact data or unmasked NIP. Public roster selection provides the comparable existing restricted projection; full employee detail is authenticated and module-gated, with a same-employee exception for logged-in employees. Preserve legitimate management creation and native actor-derived creator/approver/status rules.

### Trace

1. `backend/app/Modules/SuratTugas/Routes/api.php:15` — **kind**: entrypoint
**scope**: POST /api/surat-tugas/submit
**description**: Original run-7 baseline: public store route has throttle:15,1 and no auth or module gate; service provider mounts it beneath api/surat-tugas with API middleware. Current route retains this intended public entrypoint.
2. `backend/app/Modules/SuratTugas/Requests/AssignmentLetterRequest.php:148` — **kind**: propagation
**scope**: requiredDocumentRules
**description**: Original run-7 baseline: a valid purpose, ordered dates, funding and existing employee ID suffice; authorize returns true and public requests cannot use draft to skip required fields. Current equivalent employee existence rule is at line172.
3. `backend/app/Modules/SuratTugas/Controllers/AssignmentLetterController.php:529` — **kind**: propagation
**scope**: store post-commit relation loading
**description**: Original run-7 baseline and current: after employee sync and successful transaction, load('employees') retrieves unrestricted employee models for notification processing. Pending and null guest creator/approver do not restrict employee serialization.
4. `backend/app/Modules/SuratTugas/Controllers/AssignmentLetterController.php:562` — **kind**: sink
**scope**: store HTTP201 JSON data
**description**: Original run-7 baseline: data is the entire letter and recursively contains the selected employee's private persisted fields. Current dirty worktree at this same line uses the four-field public projection and preserves full model output only for the private management route.

### Evidence

1. `backend/app/Modules/Kepegawaian/Controllers/EmployeeController.php:470` — **description**: Original run-7 baseline public select fetches only id/name/NIP/position/rank/department and maps an explicit whitelist; lines477-489 mask anonymous NIP. Current equivalent fetch is at471 and displayNip at483. The native baseline selector passed all four private-sentinel exclusions and full-NIP exclusion before the public-submit assertion failed.
2. `backend/app/Modules/Kepegawaian/Routes/api.php:26` — **description**: Original run-7 baseline and current: auth:sanctum plus module.access:kepegawaian group at26 contains employee detail at46. Current CheckModuleAccess also permits a logged-in employee's own GET detail; it grants nothing to the anonymous submitter.
3. `backend/app/Modules/SuratTugas/Models/AssignmentLetter.php:122` — **description**: Original run-7 baseline employees belongsToMany configures pivot fields and timestamps without selecting a public subset of Employee columns. Current equivalent relation begins124.
4. `backend/app/Modules/Kepegawaian/Models/Employee.php:64` — **description**: Original run-7 baseline and current Employee persist nama_bank, nomor_rekening, telepon and email. Neither defines hidden/visible or custom toArray restrictions. Soft-deletion and Administrator Pusat global exclusion do not hide attributes of the ordinary active dummy employee.
5. `backend/vendor/laravel/framework/src/Illuminate/Database/Eloquent/Model.php:2084` — **description**: Installed native framework shared by both fixture runs: toArray merges attributesToArray and relationsToArray. HasAttributes391 recursively serializes loaded relations, and446 only filters nonempty hidden/visible controls; HidesAttributes16/23 default to empty arrays.
6. `backend/app/Services/PortalNotificationService.php:76` — **description**: Original baseline and current notification processing queries User by employee NIP without attaching a user relation or removing employee attributes. The proven disclosure is employee bank/contact/NIP, not account passwords or tokens.
7. `backend/app/Http/Middleware/EnsureAccountSecure.php:20` — **description**: Current reviewed middleware allows an absent principal to proceed. Account deactivation/password/2FA gates apply to accepted authenticated actors, while public-route projection applies regardless of role. Native guest requests exercised the real API middleware.
8. `backend/tests/Feature/StKepegawaianSecurityClosureTest.php:62` — **description**: Current maintained test run against original baseline and current source: genuine guest selector then valid submit with dummy bank/contact/NIP. Baseline HTTP201 pending/null approver succeeded and returned private fields; current guest test passed16 assertions.
9. `backend/tests/Feature/StActorAcceptanceTest.php:72` — **description**: Current maintained native actor test passed66 assertions: identical valid payload with forged identity fields is403 privately for unrelated-module A7,201 pending publicly for A7/ordinary/guest, and201 approved privately for related-module admin. Each public success has exactly the four allowed keys and no private sentinels; DB verifies actual creator, null pending approver, generated UUID, participant and status.
10. `backend/app/Modules/SuratTugas/Controllers/AssignmentLetterController.php:562` — **description**: Current reviewed controller SHA256 da1acdd70783830fb8f00cbe847f5e1bd0495c8eeeef899970d0975f6b5f3151 restricts every public success to only(['id','status','created_by','approved_by']). Original baseline controller SHA256 f18186a64ab02995e68b7612cfb84e8a5187387e342e071847c9e47ddf8bca4b lacks that projection.

### Conditions

- **kind**: authentication_level
  **description**: Original baseline exploitation requires no account, bearer token, cookie or user interaction; one anonymous public submission was demonstrated.
- **kind**: data_state
  **description**: An ordinary non-deleted employee must exist with populated private fields and a conflict-free date range. The local fixture used one active dummy employee ID6 with synthetic bank/contact/NIP values; public select supplies selectable IDs.
- **kind**: system_configuration
  **description**: The demonstrated vulnerable revision is the immutable original run-7 baseline, not current repaired source. Native Laravel HTTP tests used full structural migrations on disposable SQLite memory storage, excluding only the runner's documented roster-data migrations; broadcasts/archive jobs were faked and storage was local. No deployment or external provider behavior was tested.

### Execution

**attacker perspective**: Anonymous public form/API caller selecting another ordinary dummy employee; the protected resource is that employee's persisted bank/contact/full-NIP data.
**payloads**: - POST /api/surat-tugas/submit; Content-Type: application/json; no Authorization header or authenticated session; {"maksud_tujuan":"Dummy public submission","tanggal_mulai":"2026-12-01","tanggal_selesai":"2026-12-02","sumber_dana":"dipa","employees":[{"id":6}]}
**instructions**: - Use only the trusted run-7/run.py runner with PORTAL_AUDIT_OWNER=phase3_18 and PORTAL_AUDIT_VARIANT=baseline: python run.py php test_guest_submission_does_not_disclose_selected_employee_private_fields. It seeds a dummy employee with bank DUMMY_PRIVATE_BANK, account DUMMY_PRIVATE_ACCOUNT, phone DUMMY_PRIVATE_PHONE, email dummy-private-contact@example.test and NIP900000000000000001; performs guest GET /api/kepegawaian/employees/select; then sends the valid JSON payload through the native HTTP kernel.
- Run the current remediation control using PORTAL_AUDIT_VARIANT=current: python run.py php 'test_guest_submission_does_not_disclose_selected_employee_private_fields|test_same_valid_a7_payload_private_public_and_authorized_control_with_db_state'. The actor control uses real bearer credentials, unchanged valid input and rollback-restored scheduling state for each door.
- Both jobs run with network none, empty env plus explicit dummy allowlist, read-only root/source/tools, UID65534, dropped capabilities, no-new-privileges, scratch-only128MiB, 1CPU,1536MiB RAM,64pids,170CPU seconds,16MiB file limit and185second wall limit. Necessary safe environment includes APP_ENV=testing, APP_DEBUG=false, DB_CONNECTION=sqlite, DB_DATABASE=:memory:, CACHE_STORE=array, SESSION_DRIVER=array, dummy APP_KEY and scratch-local cache/storage. No .env, provider or shared service is used.
- After all sandbox writers stop, inspect trusted observer-promoted execution.json/output.txt/results.xml in this owner's two artifact jobs and recompute SHA256; do not promote scratch manually. Stop after the single baseline dummy disclosure and focused current controls.
**observed result**: Original baseline job php-b1b6ff8fb61c exited1 with1 test/10 assertions/1 expected privacy failure/0 errors/0 skips. Guest selector200 and submit201 pending/null approved_by passed; failure output contains data.created_by=null and data.employees[0] with all four private sentinels and full NIP900000000000000001. The failure occurs at the first response bank exclusion after all selector exclusions, so final row-count assertion was not reached; no stronger DB claim is inferred for that baseline run. Current job php-e66c9ebc662c exited0 with2 tests/82 assertions/0 failures/errors/skips, proving current guest success excludes all private sentinels/full NIP and public actor responses have exactly four keys, while private authorized create succeeds. Own execution receipts confirm source variants, bounded sandbox, descriptors opened before target and all writers stopped before promotion. Recomputed hashes match: baseline output.txt959c136bba1a6f6c146b37d08a6f1f3867d0ae0181e27013d52983cc1f2d912d, results.xml9a958387114ee48460077ff838e215b098eaa476594ef2e800a46630355c74a1; current output.txt8d069806c81418586ccf82b8a3bf6cb34f0dfde81bd450021467e86f89ff8f27, results.xml64d61e53c72e1b7d1471809cff7b3b6623d013dfa382b00fac4f76c76e338f01. Retained evidence is under agents/phase3_18/artifacts for those jobs.

### Remediation

**strategy**: Retain the implemented actor-appropriate response at AssignmentLetterController562: public submit returns only id,status,created_by,approved_by; private management route retains its existing model response behind auth/module gates. The public branch must depend on the actual route rather than caller-selected status or role. Keep the focused guest disclosure regression plus valid native public/private actor controls; both passed on current source.
**code changes**: - **file name**: backend/app/Modules/SuratTugas/Controllers/AssignmentLetterController.php
  **fixed code**: 'data' => $isPublicSubmit ? $surat->only(['id', 'status', 'created_by', 'approved_by']) : $surat,

### Severity

**likelihood**: **score**: high
**reason**: In the original baseline a genuine guest needed only a public employee ID and valid conflict-free assignment input; throttling and pending-state enforcement did not block the observed response disclosure.
**impact**: **score**: medium
**reason**: The demonstrated response discloses one selected employee's bank account identifier, bank, phone, email and full NIP across the public/private field boundary. It does not demonstrate credentials, financial transactions, broader database access or current exposure after the projection fix.
**overall severity**: medium

### Confidence

**score**: high
**reason**: Independent read-only source trace, native guest baseline response with synthetic private values, successful identical current regression, and real actor/middleware/DB controls establish the original issue and current remediation. Both own promoted receipts and hashes were verified; deployment state remains outside this local conclusion.

## Historical nonadmin approval route bypassed official-letter revision restriction; current guard verified

`surat-tugas/publication/approve-revision-bypasses-admin`

Confirmed in the immutable original run-7/baseline-source snapshot (AssignmentLetterController SHA256 f18186a64ab02995e68b7612cfb84e8a5187387e342e071847c9e47ddf8bca4b), associated with HEAD fc610d1dd81c5cad74feba71ac182a6825750ad6 plus the recorded dirty worktree. A module-member user with explicit surat_tugas.approve received HTTP 200 when changing maksud_tujuan on an already approved dummy letter, despite the normal update action reserving official revisions to administrators. Current source is repaired: approve and status invoke the shared official-revision guard after locking, and the focused maintained native HTTP test passes all 9 assertions. This is a historical confirmed issue, not a claim that the current worktree remains vulnerable.

### Root Cause

Historically approve and updateStatus applied legitimate admin OR explicit-approve authority without applying update's separate administrator-only restriction to an already official resource. Merged document validation and schedule conflict checks preserved completeness and scheduling, but did not authorize a revision. The model accepted document fields and supplied no independent role-based immutability guard.

### Intended Behavior

An authenticated user admitted by ST OR Kepegawaian module membership may initially approve a pending letter when administrator OR explicit approval policy permits it. Once the existing letter is approved, completed, published or diterbitkan (case normalized), subsequent revisions through every writer require an administrator. Normal update at historical lines 612-620 is the comparable baseline enforcing that invariant; frontend role and number-edit controls corroborate it.

### Trace

1. `backend/app/Modules/SuratTugas/Routes/api.php:43` — **kind**: entrypoint
**scope**: Management PUT /api/surat-tugas/{id}/approve
**description**: Historical baseline and current route expose caller-controlled approval edits under auth:sanctum and module.access:surat_tugas,kepegawaian (group at line 29). The dummy actor has ST membership.
2. `backend/app/Modules/SuratTugas/Requests/ApproveAssignmentLetterRequest.php:11` — **kind**: propagation
**scope**: ApproveAssignmentLetterRequest::authorize and rules
**description**: Historical baseline authorizes administrator OR explicit surat_tugas.approve; rules at 15-30 accept partial document edits. A nonadmin explicit approver therefore supplies the valid changed purpose.
3. `backend/app/Modules/SuratTugas/Controllers/AssignmentLetterController.php:1104` — **kind**: propagation
**scope**: Historical AssignmentLetterController::approve locked mutation
**description**: Original run-7/baseline-source line 1104 loads and locks the existing approved letter after repeating approval authorization at 1095, then performs schedule checks without update's existing-official administrator restriction. Current corresponding locked path adds authorizeOfficialRevision at 1126.
4. `backend/app/Modules/SuratTugas/Controllers/AssignmentLetterController.php:1135` — **kind**: sink
**scope**: Historical AssignmentLetterController::approve document update and commit
**description**: Original baseline lines 1130-1141 merge validated fillable edits, validate the complete official document, write it and commit. The focused historical request changing maksud_tujuan returned the success HTTP 200 emitted after commit at 1181. Current write at 1157 is preceded by the repaired guard.

### Evidence

1. `backend/app/Modules/SuratTugas/Controllers/AssignmentLetterController.php:612` — **description**: Original baseline update explicitly rejects a nonadmin editing an official letter, repeating after lock at 619. This comparable ordinary writer establishes the source policy rather than an invented explicit-permission-only policy.
2. `backend/app/Modules/SuratTugas/Controllers/AssignmentLetterController.php:1271` — **description**: Original baseline validatePublication preserves official status and validates merged required content; neither it nor fillable filtering in documentUpdates at 1235 enforces administrator-only revision.
3. `backend/app/Modules/SuratTugas/Controllers/AssignmentLetterController.php:711` — **description**: Original baseline sibling updateStatus locks the letter, accepts nomor_surat at 714-715 and writes at 732 without an official-revision role check. This sibling is source-supported historically; the baseline execution stops on the first approve acceptance and does not separately execute historical status. Current status applies the guard at 707.
4. `backend/app/Modules/SuratTugas/Controllers/AssignmentLetterController.php:1294` — **description**: Current authorizeOfficialRevision rejects nonadmin actors for case-normalized OFFICIAL_STATUSES; update, status and approve invoke it after row locking at 616,707,1126 respectively. Current reviewed controller SHA256 da1acdd70783830fb8f00cbe847f5e1bd0495c8eeeef899970d0975f6b5f3151.
5. `backend/tests/Feature/StKepegawaianSecurityClosureTest.php:131` — **description**: Maintained native Laravel HTTP test seeds a complete approved dummy letter and user/ST member with explicit approval permission. Historical source returns 200 on the first purpose revision where 403 is required. Current source passes 1 test/9 assertions: two approve edits and status number edit are forbidden, purpose/number preserved, pending initial approval succeeds, and an ST administrator without explicit permission can correct the number.
6. `frontend/src/hooks/useRole.ts:15` — **description**: canWrite is restricted to admin/super_admin. Original baseline SuratTugasForm isPublished at 376 disables official-body edits and handleUpdateNomorSurat at 2346 requires canWrite and canApprove; current corresponding lines are 377 and 2359. These UI controls do not enforce authorization on direct HTTP requests.
7. `backend/app/Modules/SuratTugas/Models/AssignmentLetter.php:26` — **description**: Current fillable document fields include purpose and number; original baseline fillable begins at 24 and likewise lacks an administrator-only updating/saving hook. Current OFFICIAL_STATUSES at 22 centralizes the four aliases used by the repaired controller.
8. `backend/app/Models/User.php:229` — **description**: hasPermission accepts explicitly listed approval permission for the nonadmin dummy actor. CheckModuleAccess::handle separately admits any matching requested module; neither establishes authority to revise existing official content.

### Conditions

- **kind**: authentication_level
  **description**: Authenticated active dummy account accepted by Sanctum; the test uses Sanctum::actingAs and bypasses the login/MFA exchange.
- **kind**: authorization_role
  **description**: role=user, access_modules=['surat_tugas'], permissions=['surat_tugas.approve']; no administrator role. ST OR Kepegawaian module admission plus admin OR explicit approval is the actual policy.
- **kind**: data_state
  **description**: An existing approved dummy letter with valid number, purpose, funding source, dates and at least one employee, with no scheduling conflict. The demonstrated fixture assigns the actor's employee, has no creator or previous approver, and does not establish a cross-tenant or unrelated-person result.
- **kind**: system_configuration
  **description**: Historical result applies to original run-7/baseline-source. Current source includes the shared post-lock official-revision guard and rejects the demonstrated attempts.

### Execution

**attacker perspective**: A legitimate nonadmin module approver sends direct native HTTP document changes on an already approved letter, crossing the separate official-revision administrator boundary.
**payloads**: - PUT /api/surat-tugas/{dummy-id}/approve {"maksud_tujuan":"Dummy unauthorized revision","status":"approved"}
- PUT /api/surat-tugas/{dummy-id}/approve {"maksud_tujuan":"Dummy unauthorized revision"}
- PUT /api/surat-tugas/{dummy-id}/status {"status":"approved","nomor_surat":"ST/DUMMY/CHANGED"}
**instructions**: - Use the parent-authored trusted run-7/run.py only, with PORTAL_AUDIT_OWNER=phase3_19 and PORTAL_AUDIT_VARIANT=baseline, then current. Command arguments: php StKepegawaianSecurityClosureTest::test_approver_cannot_revise_already_official_content_through_sibling_actions. Maintained current test code is mounted against each selected source variant.
- The maintained fixture creates a dummy employee/account, complete approved letter ST/DUMMY/001, purpose Dummy assignment, 2026-12-01 through 2026-12-02, dipa funding and one assigned employee; request reaches the approval handler with valid input. The baseline stops at first accepted request, without continuing probing.
- Trusted runner enforces network none, env-i dummy allowlist with SQLite :memory:, RO source/tools, UID65534, capdrop/no-newprivileges, 1 CPU, 1536MiB memory, 64 pids, 128MiB scratch, 16MiB file limit and 185s wall bound. Logs/database/files are scratch-local; no .env, provider or shared database is exposed. Queue/storage/events use local maintained fakes; no deployed behavior is claimed.
- After writers stop, inspect own execution.json and hash-verified promoted output.txt/results.xml for baseline job php-be05e223b252 and current job php-77d63b1351a5. Both receipts confirm preopened observer descriptors and all_writers_stopped_before_promotion. Baseline XML SHA256 68de0239805b122c981c561e50fb8d2f20698ad5c0e056d55122a503a25d547a; current XML SHA256 448c9795ee940190884d82ef1cb2e7008b335df7b5b2fb40c3ad31826f5fce96. Receipts are under agents/phase3_19/artifacts/{job}/.
**observed result**: Baseline job php-be05e223b252 completed exit 1: one test/one failed assertion, expected 403 but received 200 at maintained test line 139 for the first purpose edit with status approved. This observes unauthorized acceptance; source places that success after document update/commit. The failing assertion prevents the later baseline DB-preservation assertions and sibling requests from running, so no independent baseline DB dump or roster mutation is claimed. Current job php-77d63b1351a5 completed exit 0 with one test/9 assertions: both purpose payloads and the number-change payload return 403 with purpose/number unchanged; the same explicit approver initially approves pending with 200, then matching-module admin corrects official number with 200. Current alias coverage is established by normalized shared source guard, not separately executed here.

### Remediation

**strategy**: Implemented in the current worktree: call the shared administrator-only existing-official guard after the row lock in update, approve and updateStatus, before any document or participant write. Preserve the intentional administrator OR explicit approval policy for pending documents. Retain the focused native HTTP regression test and its positive controls.

### Severity

**likelihood**: **score**: medium
**reason**: The historical path is a simple authenticated HTTP request but requires an expressly privileged module approver and an already official valid letter; ordinary users without approval authority are excluded.
**impact**: **score**: medium
**reason**: Historical acceptance bypasses official-document integrity policy for a bounded module record. The observed case changes a duty purpose through the approval route; no broad takeover, cross-tenant effect or provider consequence was demonstrated.
**overall severity**: medium

### Confidence

**score**: high
**reason**: Independent source reconstruction plus own bounded native HTTP baseline acceptance and current 9-assertion regression result establish the historical bypass and current repair. Runtime historical proof is limited to the first accepted purpose-edit request; sibling number edits and other official aliases are additionally source-traced.

## Original snapshot restore bypassed active scheduling validation; current worktree repaired

`surat-tugas/restore-bypasses-scheduling-validation`

Confirmed for the immutable original pre-fix run-7/baseline-source snapshot, not the current worktree at repository HEAD fc610d1dd81c5cad74feba71ac182a6825750ad6 plus current changes. An authenticated ordinary SuratTugas module creator could restore their trashed pending assignment despite an intervening overlapping assignment for the same employee. The native baseline check observed the intervening HTTP creation succeed with 201 and the conflicting single restore return 200 instead of 422. The protected boundary is the employee's shared active assignment schedule; creator ownership is intentionally sufficient for restoration and is not the defect. Original bulk restore has the same source-visible omission. Current single and bulk restore use transactional scheduling validation and the focused native current regression passed, including conflict rejection and unchanged state after rejection of a mixed batch. The maintained mixed-batch fixture was then strengthened to sort the safe tombstone first and transparently observe its native restored event. New native evidence shows that safe row active inside transaction level1 before the later conflict, followed by422 and the exact original row/pivot/file snapshot, proving rollback of an intermediate restoration rather than only unchanged state after early rejection.

### Root Cause

In original run-7/baseline-source, AssignmentLetterController::restore applied only onlyTrashed and admin-or-creator authorization before model restore at line 829; bulkRestore applied the equivalent creator-filtered query before builder restore at line 928. Neither path acquired employee scheduling locks or invoked AssignmentLetterConflictService. The normal creation boundary did both, and the conflict query correctly omitted deleted assignments. Laravel SoftDeletes supplied no scheduling check and there was no AssignmentLetter restoring hook or observer compensating for either omission.

### Intended Behavior

Keep the existing admin-or-creator restoration policy, including creator restoration of valid official letters. Before a pending or official assignment re-enters the active schedule, lock its involved employees in the same sorted order as other scheduling writers, recheck current assignment and leave conflicts using effective employee dates, and reject conflicts without restoring any member of a failed batch.

### Trace

1. `backend/app/Modules/SuratTugas/Routes/api.php:33` — **kind**: entrypoint
**scope**: POST /api/surat-tugas/{id}/restore
**description**: Original baseline route accepts an authenticated Sanctum caller with SuratTugas or Kepegawaian module access. The ordinary creator used by the native fixture has SuratTugas access and no approval permissions.
2. `backend/app/Modules/SuratTugas/Controllers/AssignmentLetterController.php:820` — **kind**: propagation
**scope**: AssignmentLetterController::restore, original run-7/baseline-source lines 820-827
**description**: Loads the creator's trashed pending letter and permits its creator or an admin. An intervening active letter now reserves the same employee and dates, but no current conflict check occurs.
3. `backend/app/Modules/SuratTugas/Controllers/AssignmentLetterController.php:829` — **kind**: sink
**scope**: AssignmentLetterController::restore, original run-7/baseline-source
**description**: Calls model restore directly, clearing deleted_at through SoftDeletes::restore/save and returning success. The baseline native HTTP check observed 200 for this conflicting restore after a 201 intervening booking.

### Evidence

1. `backend/app/Modules/SuratTugas/Controllers/AssignmentLetterController.php:432` — **description**: Original baseline and current normal store start a transaction, lock scheduling employees, invoke checkConflicts at 434 and return 422 with rollback at 442-447 when a conflict exists. This establishes the comparable normal scheduling boundary.
2. `backend/app/Modules/SuratTugas/Services/AssignmentLetterConflictService.php:75` — **description**: Original baseline line 75 excludes deleted_at rows; line 63 defines pending, approved, published, diterbitkan and completed as active schedule statuses. Effective pivot/header dates determine overlap. In current source the corresponding predicates are at 73 and 85-88.
3. `backend/app/Modules/SuratTugas/Controllers/AssignmentLetterController.php:928` — **description**: Original baseline bulkRestore directly calls the onlyTrashed, creator-filtered query's restore without scheduling checks. In current source line 928 instead passes ID-ordered locked rows to restoreScheduledLetters inside DB::transaction.
4. `backend/vendor/laravel/framework/src/Illuminate/Database/Eloquent/SoftDeletes.php:174` — **description**: Maintained framework model restore clears deleted_at and saves at 181 after the restoring event; baseline AssignmentLetter has no scheduling restoration callback. Builder restore in SoftDeletingScope at 78 directly updates deleted_at to null.
5. `backend/app/Modules/SuratTugas/Controllers/AssignmentLetterController.php:823` — **description**: Current single restore reselects and locks the tombstone inside a transaction, rechecks admin-or-creator authority, and delegates to restoreScheduledLetters. Bulk keeps the creator predicate in the locked query at 923-928.
6. `backend/app/Modules/SuratTugas/Controllers/AssignmentLetterController.php:936` — **description**: Current shared restoration extracts effective employee pivot dates, locks the combined employee set, validates official document contents, checks pending/official scheduling conflicts and throws an employees validation exception before restoring the conflicting row. Surrounding single/bulk transactions roll back prior batch restorations.
7. `backend/app/Modules/SuratTugas/Controllers/AssignmentLetterController.php:1325` — **description**: Current scheduling lock helper deduplicates and sorts numeric employee IDs and selects those employee rows for update in ascending order. It is shared by normal scheduling entrypoints and restoration.
8. `backend/tests/Feature/StKepegawaianSecurityClosureTest.php:182` — **description**: Maintained native fixture authenticates an ordinary module creator, creates and trashes an old pending assignment, obtains 201 for an overlapping HTTP booking, then requests restoration. Original snapshot run php-934bd065e29f failed at 193 because the single restore returned 200 rather than 422; execution stopped before its bulk iteration or post-response row assertions. Independent Phase5 baseline run php-0ed7f31e4bc1 reproduced this exact 200-versus-422 failure after the HTTP booking assertCreated passed, with 1 test and 2 assertions.
9. `backend/tests/Feature/StLifecycleAcceptanceTest.php:193` — **description**: Earlier current native runs php-0aa8df23abb6 and php-b53be355d776 passed1test14assertions, proving conflict denial and unchanged snapshots, but their original conflicting-first ID order did not independently prove undo of a prior restoration. The maintained fixture now creates safe first, asserts UUID sort order, and transparently observes its real Eloquent restored event before the conflicting member. Parent php-39be527538f2 passed1test15assertions and recorded safe active in transaction level1, safe trashed again after failure, exact row/pivot/file snapshot preserved, and legitimate2-row restore after the conflict is removed. Foreign tombstone remains deleted.
10. `backend/tests/Feature/StLifecycleAcceptanceTest.php:163` — **description**: Maintained policy fixture explicitly allows creator restoration of a valid official letter after admin archival; current restore continues to allow creator/admin while validating content and scheduling, without an invented admin-only restore policy. This policy fixture was source-reviewed, not executed by this verifier.
11. `backend/vendor/laravel/framework/src/Illuminate/Database/Eloquent/Concerns/HasUuids.php:18` — **description**: The framework generates UUIDv7 IDs. The refined fixture creates the safe tombstone before the conflicting one and asserts lexical UUID order, matching bulkRestore orderBy(id). Input array order is not used as proof. A nonmutating restored-event observer records actual intermediate database state; future prevalidation strategies need not emit an intermediate restore for the rejection/no-net-write assertions to remain valid.
12. `backend/vendor/laravel/framework/src/Illuminate/Database/Concerns/ManagesTransactions.php:41` — **description**: DB::transaction catches callback exceptions and rolls back before rethrowing. Current bulkRestore wraps the per-letter helper in this transaction. The refined native observer now directly records a safe row active inside that transaction before the later scheduling ValidationException; the post-response snapshot verifies that this intermediate database write was undone.

### Conditions

- **kind**: authentication_level
  **description**: Authenticated active dummy user accepted by Sanctum and the route middleware.
- **kind**: authorization_role
  **description**: Ordinary creator of the trashed assignment with SuratTugas or Kepegawaian module access; no approval permission is required for the existing restore policy.
- **kind**: data_state
  **description**: A trashed pending or official assignment retains its employee association and dates, and another active assignment or approved leave overlaps them before restoration. Native observation used pending assignments for one dummy employee.
- **kind**: system_configuration
  **description**: The vulnerable observation applies to original run-7/baseline-source. The reviewed current worktree has the restoration scheduling repair.

### Execution

**attacker perspective**: An ordinary module-enabled creator restoring an owned dummy pending assignment into a shared employee schedule.
**payloads**: - POST /api/surat-tugas with {maksud_tujuan:'Dummy new active assignment',tanggal_mulai:'2026-12-01',tanggal_selesai:'2026-12-02',sumber_dana:'dipa',employees:[{id:E}]} after the creator's fixture assignment X for E on those dates has been trashed.
- POST /api/surat-tugas/X/restore with an empty JSON body.
- Current mixed control: safe owned tombstone on2026-12-11 sorts before owned conflicting tombstone on2026-12-10; active booking is2026-12-10. POST bulk-restore includes safe,conflicting,foreign-trashed,missing IDs.
**instructions**: - Use the trusted run-7/run.py with PORTAL_AUDIT_OWNER set to your own assigned canonical owner and PORTAL_AUDIT_VARIANT=baseline; run php filter StKepegawaianSecurityClosureTest::test_single_and_bulk_restore_recheck_current_schedule_and_roll_back. The maintained native fixture creates only dummy principals and local disposable records.
- Run the maintained current filter StLifecycleAcceptanceTest::test_restore_conflicts_reject_single_and_roll_back_whole_mixed_batch under your own canonical owner. Inspect the restore-rollback-observation line as well as PHPUnit assertions: safe active_in_transaction=true/transaction_level=1, then safe_trashed_after_failure=true/exact_batch_snapshot_preserved=true. The callback only reads state and records observations; it does not change controller execution or inject an exception.
- Use the runner's empty allowlisted dummy environment with APP_ENV=testing, DB_CONNECTION=sqlite and DB_DATABASE=:memory:. Sandbox limits are network none, read-only source/tools/root, UID 65534, dropped capabilities, no-new-privileges, 1 CPU/170 CPU seconds, 1536 MiB memory, 64 PIDs, 128 MiB scratch, 16 MiB file size and 185-second wall limit. No deployed service or shared database is involved.
**observed result**: Baseline php-934bd065e29f completed with exit 1 solely from the focused security expectation: the intervening booking's assertCreated passed, then restoration returned HTTP 200 instead of expected 422 (1 test, 2 assertions). The fixture halted there; baseline bulk restoration, subsequent row assertions, and real concurrent races were not executed. The baseline source places the restore mutation before that response. Baseline fixture-state run php-958bfc5fe5e5 independently returned 200 instead of 422. Current php-0aa8df23abb6 completed exit 0, 1 test/14 assertions, confirming conflict denial, unchanged snapshots after a rejected mixed batch, and successful authorized restoration once conflict is removed. The old14-assertion mixed fixture did not independently establish intermediate-write undo. After the fixture refinement, parent php-39be527538f2 completed0 with1test15assertions and raw JSON intermediate=[{safe.id,active_in_transaction:true,transaction_level:1}], safe_trashed_after_failure:true, exact_batch_snapshot_preserved:true. Thus one safe restore occurred natively before the later conflict and was rolled back; no file-write rollback or concurrent restore race is claimed. Output SHA25686b4afe76e1c2264553659f384495773174269180919b102ee036e469f63d2b1; XMLdaee1c7d6bc8977dfd74fffd5387b0a4a24bd73c34a5f4c582f80c52a1b292b9. Existing source and framework controls plus the observed native transition support current repair. All observations use disposable SQLite/kernel/storage fixtures, no operational DB/provider. Fresh independent current run php-b91b97a7572d under phase5r_19_01 completed exit 0 with 1 test/15 assertions and independently reproduced intermediate active_in_transaction=true/transaction_level=1, safe_trashed_after_failure=true, and exact_batch_snapshot_preserved=true. Its output SHA256 is 4f1fc11930762d7f1c54a58a6fc4d16ab4026764316de4303af449b6156e350b and XML SHA256 is 248fff11e46501a6afb791179618b888fc7ca6113dfdd4861b8ab94bb0b9fcf9.

### Remediation

**strategy**: The current worktree implements the required narrow repair: reauthorize the locked tombstone; route single and bulk restore through shared restoration inside a transaction; lock the involved employees in sorted order; revalidate effective-date schedule conflicts before restoring pending/official letters; reject and roll back the entire batch on conflict. Preserve the existing creator/admin restore policy and retain the maintained native regression coverage. Current race safety is supported by the shared lock source. Undo of prior batch restorations is supported by the surrounding DB::transaction and framework rollback source. The refined maintained SQLite check directly observed a safe-row restoration before the later conflict and exact snapshot rollback; a concurrent restore race was not demonstrated.

### Severity

**likelihood**: **score**: medium
**reason**: Historically an ordinary module creator could invoke restore without approval, but exploitation requires an owned tombstone and an intervening overlapping reservation; no race is required.
**impact**: **score**: medium
**reason**: The bypass violates the shared employee scheduling boundary for assignments the caller already owns and can cause contradictory active bookings; it does not demonstrate account takeover, cross-owner document modification or broader data access.
**overall severity**: medium

### Confidence

**score**: high
**reason**: Original single-restore bypass is independently observed after native HTTP creation of the intervening reservation, with its exact source mutation and framework behavior reconstructed. The original bulk omission shares the same root cause but was not separately reached by the failing baseline test. Current focused native checks pass with conflict denial and unchanged mixed-batch state; source shows transactional locks, conflict validation and rollback. The refined mixed-batch fixture uses a nonmutating restored-event listener and directly observes the safe member active inside transaction level 1 before the later conflict, followed by its restored tombstone state and exact original batch snapshot after rejection. Historical severity is not a claim of a remaining current flaw.

## A delegated approver could reactivate a rejected conflicting assignment in the original snapshot

`surat-tugas/status/pending-reactivation-conflict-bypass`

Confirmed in the immutable run-7/baseline-source app/config snapshot associated with source HEAD fc610d1d and its pre-fix worktree; remediated in the reviewed current worktree. An active ordinary user with surat_tugas module access and explicit surat_tugas.approve permission changed a rejected assignment to pending despite another pending assignment for the same dummy employee on 2026-12-01 through 2026-12-02. Pending is a live reservation under the shared conflict policy, so this crossed the scheduling integrity boundary. Current execution rejects the conflicting transition and permits the conflict-free transition. This is a historical defect with verified current remediation, not a claim that the current writer remains vulnerable.

### Root Cause

The original updateStatus scheduling branch at baseline controller line 718 included only approved/completed. It omitted pending although the conflict service includes pending among active reservations. The target-letter transaction and row lock did not invoke the employee scheduling lock or conflict check for rejected-to-pending; publication validation also returned for this nonofficial transition. No model event or database control enforced this schedule invariant on the demonstrated path.

### Intended Behavior

Every supported transition into an active reservation status must check the affected employees' existing assignments and approved leave before committing. A conflict-free rejected-to-pending transition remains allowed for the delegated approver and must not assign approved_by.

### Trace

1. `backend/app/Modules/SuratTugas/Routes/api.php:31` — **kind**: entrypoint
**scope**: PUT /api/surat-tugas/{id}/status
**description**: Lower-trust authenticated caller enters through auth:sanctum and module.access:surat_tugas,kepegawaian. The demonstrated caller is role user with surat_tugas access and explicit approval permission, not an administrator. SuratTugasServiceProvider supplies the /api/surat-tugas prefix.
2. `backend/app/Modules/SuratTugas/Controllers/AssignmentLetterController.php:695` — **kind**: propagation
**scope**: AssignmentLetterController::updateStatus authority, validation and transaction
**description**: Current line 695 and original snapshot line 700 allow administrator OR explicit surat_tugas.approve authority. The supported pending input is lowercased, the target letter is loaded with lockForUpdate, and existing employees and effective dates are obtained server-side. Original validatePublication at line 1271 prevents official-status regression but returns for rejected-to-pending. Current official-revision authorization likewise permits this nonofficial source state.
3. `backend/app/Modules/SuratTugas/Controllers/AssignmentLetterController.php:714` — **kind**: propagation
**scope**: Active-status employee lock and conflict decision
**description**: Original snapshot line 718 tested only approved/completed, skipping both sorted employee locks and the shared conflict service for pending. Current line 714 includes pending and returns 422 on conflicts before mutation. The helper locks unique numeric employee IDs in ascending order; the shared service excludes only this letter, ignores deleted records, and detects overlapping pending reservations and approved leave.
4. `backend/app/Modules/SuratTugas/Controllers/AssignmentLetterController.php:730` — **kind**: sink
**scope**: AssignmentLetter::update status persistence
**description**: Original snapshot line 732 committed pending after the skipped scheduling guard, restoring a second live reservation of the same employee and dates. Independent baseline HTTP execution observed the stored old letter become pending. Current line 730 is reached only after the pending scheduling check passes.

### Evidence

1. `backend/app/Modules/SuratTugas/Services/AssignmentLetterConflictService.php:73` — **description**: Current line 73 and original snapshot line 63 classify pending as active. Current lines 82-91 and baseline lines 72-81 join the employee relation, ignore soft-deleted letters, compare effective overlapping date ranges, and exclude the letter being changed. This establishes the protected scheduling state independently of the status-writer branch.
2. `backend/app/Modules/SuratTugas/Controllers/AssignmentLetterController.php:714` — **description**: Current remediation adds pending to the scheduling branch; lines 715-724 lock employees and reject conflicts. Lines 726-728 restrict approved_by assignment to official statuses, preserving valid pending semantics. Original lines 718-730 omitted the pending guard entirely.
3. `backend/tests/Feature/StKepegawaianSecurityClosureTest.php:202` — **description**: Maintained native Laravel HTTP fixture uses an active role-user account, surat_tugas module, and only explicit surat_tugas.approve permission. It seeds a rejected letter and overlapping pending letter for one dummy employee. Independent baseline execution fails line 210 because stored status is pending, proving the forbidden state mutation. Identical current test passes 1 test/5 assertions: retained rejected state, HTTP 422, then HTTP 200/pending/approved_by null after the conflict is deleted.
4. `backend/app/Modules/SuratTugas/Controllers/AssignmentLetterController.php:1301` — **description**: Current publication validation and original snapshot line 1271 protect official completeness and forbid official-to-prepublication regression, but deliberately return for rejected-to-pending. These strong lifecycle controls do not substitute for the scheduling check. Current authorizeOfficialRevision at line 1294 also protects official records without blocking this legitimate nonofficial transition.
5. `backend/app/Models/User.php:229` — **description**: Explicit nonempty permissions are checked by membership, independently of administrator fallback. Together with CheckModuleAccess and the controller's OR branch, this confirms the demonstrated ordinary module member is a valid delegated approver; explicit permission alone without module access is not asserted sufficient.

### Conditions

- **kind**: authorization_role
  **description**: Authenticated active ordinary user with related module access and explicit surat_tugas.approve permission; the dummy user has no administrator role and is not password-locked.
- **kind**: data_state
  **description**: An accessible nonofficial rejected assignment and a separate non-deleted pending assignment reserve the same numeric employee for overlapping effective dates. The demonstrated dummy range is 2026-12-01 through 2026-12-02.

### Execution

**attacker perspective**: A limited dummy approver uses the real Laravel HTTP status interface against a rejected dummy assignment to bypass the shared schedule-conflict invariant. All data is local and disposable.
**payloads**: - PUT /api/surat-tugas/{dummy-rejected-id}/status with JSON {"status":"pending"}
**instructions**: - Run the parent-authored run-7/run.py runner with PORTAL_AUDIT_OWNER=phase3_22, PORTAL_AUDIT_VARIANT=baseline, kind php, and filter test_pending_status_transition_cannot_reactivate_conflicting_reservation. Repeat only the identical focused filter with PORTAL_AUDIT_VARIANT=current. Baseline mounts frozen original app/config and maintained current tests; current mounts the remediated app/config.
- Use only the runner's Docker sandbox: network none, env -i with recorded dummy allowlist, read-only source/toolchain, UID 65534, all capabilities dropped, no-new-privileges, 1 CPU, 1536 MiB memory, 64 PIDs, 128 MiB scratch, 16 MiB file limit, 170 CPU seconds and 185-second outer wall limit. The native fixture uses structural migrations and SQLite :memory:, with only the documented roster-data migrations excluded; no deployed endpoint or provider is contacted.
- Inspect agents/phase3_22/artifacts/php-ca9d7ba95f4b/{execution.json,output.txt,results.xml} for baseline and agents/phase3_22/artifacts/php-621eb6ced1c2/{execution.json,output.txt,results.xml} for current. Both completed receipts confirm descriptors opened before execution and all writers stopped before trusted observer promotion. Output and XML SHA256 values were independently matched to each receipt.
**observed result**: Baseline job php-ca9d7ba95f4b exited 1 with exactly one assertion failure: expected rejected, actual pending at maintained test line 210. The seeded separate pending reservation is not modified by the request, establishing two overlapping active assignments. The baseline stops at that minimum database-state violation, so no baseline HTTP status assertion is claimed. Current job php-621eb6ced1c2 exited 0 with 1 test and 5 assertions: conflict response 422 preserves rejected; deleting the conflict enables response 200 and pending with approved_by null. This sequential fixture does not establish concurrent-worker locking behavior or production effects.

### Remediation

**strategy**: Retain the current fix at the last status-write decision: include pending in the existing sorted employee-lock/conflict branch before update, and assign approved_by only for official statuses. Keep the focused conflicting and conflict-free ordinary-approver HTTP regression.

### Severity

**likelihood**: **score**: medium
**reason**: Requires an authenticated, module-enabled delegated approver and a rejected assignment overlapping an existing active reservation. A supported single status request suffices in the original snapshot.
**impact**: **score**: medium
**reason**: Demonstrated schedule-integrity violation creates a second active reservation for the selected employee. Evidence is confined to the affected assignment schedule and does not show data theft, code execution, production disruption or financial consequences.
**overall severity**: medium

### Confidence

**score**: high
**reason**: Independent source review reconstructed module and approval authority, ID/status normalization, target locking, publication lifecycle checks, employee lock ordering, active-status conflict policy and model persistence. Independently reproduced the original database-state violation and current negative/positive controls using the same maintained native HTTP test, with completed promoted and hash-verified receipts.

## Historical stale-participant update accepted after roster revocation; current source reauthorizes under lock

`surat-tugas/update/authorization-before-record-lock`

The original run-7 baseline-source snapshot of backend/app/Modules/SuratTugas/Controllers/AssignmentLetterController.php (SHA256 f18186a64ab02995e68b7612cfb84e8a5187387e342e071847c9e47ddf8bca4b) authorizes a pending-letter participant before its transaction, then reloads the letter without repeating participant/creator authorization. An independently executed maintained native Laravel HTTP test deterministically hydrated the original participant relation, replaced the database roster with another dummy employee, and submitted the removed participant's update with the old roster. Original source returned HTTP 200 instead of 403. This confirms the historical stale-resource-authorization boundary under that deterministic schedule. It does not demonstrate two simultaneous HTTP workers, a separately committed administrator request, PostgreSQL lock waiting, or an employees-omitted variant. Current dirty worktree over HEAD fc610d1dd81c5cad74feba71ac182a6825750ad6 fixes this path: locked-record authorization at line 615 rejects the same request with 403 and the focused test verifies unchanged content and replacement roster.

### Root Cause

In the original snapshot, update authorizes the first AssignmentLetter instance at line 608 using its loaded employee relation, then replaces it with a newly locked instance at line 618. The last resource-related decision on that locked instance at lines 619-620 checks only official status. Pending-to-pending reassignment does not trigger this guard, so loss of participant authority is ignored before document update and employee synchronization. Current line 615 repeats authorizeAccess on the fresh locked instance before any writes.

### Intended Behavior

A nonadministrator management updater must remain the letter's creator or an employee currently assigned to it at the serialized mutation decision. Removing a participant who is not the creator must prevent that principal from changing pending content or restoring its old roster. Official records additionally require administrator authority for revisions.

### Trace

1. `backend/app/Modules/SuratTugas/Routes/api.php:42` — **kind**: entrypoint
**scope**: Management PUT /api/surat-tugas/{id}
**description**: Original snapshot and current route accept authenticated Sanctum users behind module.access:surat_tugas,kepegawaian at line 28. The lower-trust principal is a normal user with surat_tugas membership and initial participation, without creator, administrator or approval authority.
2. `backend/app/Modules/SuratTugas/Controllers/AssignmentLetterController.php:608` — **kind**: propagation
**scope**: Original snapshot initial resource authorization
**description**: After validated input and initial lookup at lines 602-603, authorizeAccess accepts the old assigned-employee relation. Original lines 980-984 bind User.username to Employee.nip and allow administrator, assigned employee or creator. The test principal is assigned only.
3. `backend/app/Modules/SuratTugas/Controllers/AssignmentLetterController.php:618` — **kind**: propagation
**scope**: Original snapshot locked record reload
**description**: The transaction begins at line 616 and reloads the letter using lockForUpdate. The original employee-relation authorization is not repeated on this new instance after the roster has changed.
4. `backend/app/Modules/SuratTugas/Controllers/AssignmentLetterController.php:619` — **kind**: propagation
**scope**: Original snapshot last locked-record access decision
**description**: The action rejects nonadmin updates only if the reloaded record is approved, completed, published or diterbitkan. A pending record with a replacement participant passes; subsequent employee scheduling locks and conflict validation do not test the caller's current relation to this letter.
5. `backend/app/Modules/SuratTugas/Controllers/AssignmentLetterController.php:655` — **kind**: sink
**scope**: Original snapshot document and participant mutation
**description**: The accepted request updates validated document fields at line 655, synchronizes a supplied employees list at lines 657-658, commits at line 665 and returns HTTP 200 at line 675. The maintained historical test observes this success response for the removed participant's update carrying the old roster.

### Evidence

1. `backend/app/Http/Middleware/CheckModuleAccess.php:37` — **description**: Original snapshot and current middleware require ANY listed module through access_modules; super_admin bypasses at line 32. Personal Kepegawaian exceptions are GET-only and do not remove the management PUT's module prerequisite.
2. `backend/app/Modules/SuratTugas/Controllers/AssignmentLetterController.php:981` — **description**: Original snapshot authorizeAccess accepts the currently loaded employees relation or created_by at lines 981-984, after the administrator bypass at 976. A removed participant who is not the creator loses this intended resource authority. Current equivalent predicate is at lines 1001-1005.
3. `backend/app/Modules/SuratTugas/Controllers/AssignmentLetterController.php:619` — **description**: Original snapshot's locked-record official-status guard is a real preventing control for an official transition, but leaves pending-to-pending roster revocation unchecked. Validated fillable document updates, sorted employee locks, conflict checks, publication requirements and the model/pivot contain no later caller-participant check on this original path.
4. `backend/tests/Feature/StKepegawaianSecurityClosureTest.php:153` — **description**: The maintained focused test creates a normal surat_tugas member, a different creator and replacement employee. Its one-shot retrieved callback at lines 164-168 hydrates the old relation and synchronizes the replacement roster before initial authorization and the subsequent locked reload. Native routing, middleware, request validation, controller, models and SQLite database are exercised. This is a deterministic application interleaving hook, not a second HTTP request or native PostgreSQL multiworker test.
5. `backend/tests/Feature/StKepegawaianSecurityClosureTest.php:173` — **description**: Independent baseline execution php-797ac7aa5fa2 fails here because the stale participant receives HTTP 200, not 403 (1 test, 1 assertion). The failed first assertion prevents the later database-preservation assertions from running on baseline; their results must not be attributed to that execution.
6. `backend/app/Modules/SuratTugas/Controllers/AssignmentLetterController.php:615` — **description**: Current dirty worktree repeats authorizeAccess immediately after lockForUpdate at line 614, then enforces authorizeOfficialRevision at line 616. The fresh instance has no cached old employee relation. Independent current execution php-1e3662e4fd62 passes all 4 assertions: HTTP 403, interleaving occurred, original purpose preserved and only the replacement employee remains.

### Conditions

- **kind**: authentication_level
  **description**: Authenticated active normal user whose username maps to a dummy employee NIP; the native test disables two-factor enforcement for its local fixture.
- **kind**: authorization_role
  **description**: surat_tugas or kepegawaian module membership plus initial participant status; no administrator role, creator ownership or approval permission is required for this pending update path.
- **kind**: data_state
  **description**: Another user's pending letter initially includes the attacker employee, then its roster is replaced with another employee. The demonstrated request supplies valid dates, funding, purpose and the old employees list; ordinary nondraft request validation requires employees.
- **kind**: timing_dependency
  **description**: The earlier resource snapshot must retain participation while the database relation used by the reloaded record has lost it. Local evidence forces that ordering through a model retrieval hook; separate committed transactions and multiworker scheduling were not reproduced.

### Execution

**attacker perspective**: A normal module member initially assigned to a pending letter owned by another dummy user submits an update with its old roster after the fixture replaces current participation. All identities and resources are local dummy data.
**payloads**: - PUT /api/surat-tugas/{dummy-letter-id} {"maksud_tujuan":"Dummy stale participant overwrite","tanggal_mulai":"2026-12-01","tanggal_selesai":"2026-12-02","sumber_dana":"dipa","employees":[{"id":<initial-participant-employee-id>}]}
**instructions**: - Use the parent-authored trusted run-7/run.py runner only, with PORTAL_AUDIT_OWNER=phase3_23 and PORTAL_AUDIT_VARIANT=baseline: python run.py php test_update_rechecks_participant_authority_after_loading_locked_record. The runner mounts original app/config and maintained current tests, using native Laravel HTTP handling and a dummy SQLite memory database.
- Repeat exactly that focused maintained filter with PORTAL_AUDIT_VARIANT=current to verify remediation. Do not substitute sequential workers as a concurrency proof or contact deployed endpoints.
- Inspect own retained execution.json and verify output.txt/results.xml hashes against promotion receipts only after all writers have stopped. Both runs used network none, empty allowlisted dummy environment, read-only source/tools, UID 65534, dropped capabilities/no-new-privileges, 1 CPU, 1536 MiB memory, 64 PIDs, 128 MiB scratch, 16 MiB file limit and 185-second wall bound.
**observed result**: Original baseline php-797ac7aa5fa2 returned HTTP 200 at the stale participant request, failing expected 403; the source's successful response follows document update, roster sync and commit. The fixture stops at that first failed assertion, so it does not separately report baseline post-response field values or a separate administrator commit. Current php-1e3662e4fd62 returned 403 and passed all 4 assertions preserving purpose and replacement roster. Own retained receipts are agents/phase3_23/artifacts/php-797ac7aa5fa2/{execution.json,output.txt,results.xml} and agents/phase3_23/artifacts/php-1e3662e4fd62/{execution.json,output.txt,results.xml}. Baseline output/XML SHA256 are 27b485a66bb6d78a16de04e37187cea4855ab2bde068f3308c19f75aab85a19a and 5aa07d289d5bfc622037c65330b9054b1b75b503606861e17df86d3dbf5de742; current output/XML SHA256 are 5b6e2870f2590a20508a049910bcb505e81709ca8e9b45b7c1c85410a26056bc and 128c971e281da9548df5fa827204410fbbf4dfe1fe39b23e212127f281212ab5. Both execution receipts confirm completed processes and trusted bounded promotion. No simultaneous PostgreSQL or deployed race claim is made.

### Remediation

**strategy**: Already implemented and verified in the reviewed current worktree: after acquiring the AssignmentLetter row lock, repeat the complete participant/creator/admin resource predicate on the newly fetched instance, then apply official-revision authorization before mutation. Keep reassignment writers serialized through the same letter lock. Preserve the focused regression proving stale participant rejection and database preservation.

### Severity

**likelihood**: **score**: low
**reason**: The attacker requires module access and prior participation on this exact pending resource, followed by a narrowly ordered revocation during an in-flight request. Deterministic local scheduling establishes the stale decision, without demonstrating practical multiworker race reliability.
**impact**: **score**: medium
**reason**: Historical pending-letter integrity is crossed: a formerly authorized participant's request is accepted after losing the current relationship, reaching content update and supplied-roster replacement for that narrow resource. No official-document bypass, arbitrary foreign-letter access or broader data compromise is established.
**overall severity**: medium

### Confidence

**score**: high
**reason**: Independent source reconstruction identifies the missing original locked-record resource check, and completed hash-verified native HTTP runs show original 200 versus fixed 403 with preserved database state on current. Confidence applies to the historical deterministic stale-authorization boundary and current tested fix; live multiworker timing and separately committed reassignment remain outside the demonstrated result.
