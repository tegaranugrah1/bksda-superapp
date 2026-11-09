# Native PostgreSQL security regressions

Full workflow and AI instructions: [panduan uji keamanan dan pentest portal](../../../docs/security/panduan-uji-keamanan-dan-pentest-portal.md).

`leave-concurrency.php`: duplicate submission, pending reservation, repeated approval/status debit and aggregate approval budget. `leave-master-concurrency.php`: master rename concurrent with a real own-leave create.

These are bounded audit fixtures, not PHPUnit test classes or application endpoints. They require the approved read-only `/app` sandbox, APP_ENV=testing, PORTAL_RACE_FIXTURE=1, a dedicated PostgreSQL audit database on loopback, two workers maximum and scratch-only writes. The fixture refuses ordinary environments. Scheduling gates wait at most2 seconds; no stress or live-service test is performed.

The trusted parent launchers and receipts are retained at `C:/Users/USER/security-audit-skill/bksda-superapp/run-4/sandbox/run-pg.py` and `agents/pentest/artifacts/`. Use a fresh unique job name with the launcher; it enforces network-none, explicit dummy environment, resource/time limits and safe descriptor promotion after both containers stop. Example for the existing local audited workspace:

```powershell
python C:/Users/USER/security-audit-skill/bksda-superapp/run-4/sandbox/run-pg.py unique-leave-check leave-concurrency.php source
python C:/Users/USER/security-audit-skill/bksda-superapp/run-4/sandbox/run-pg.py unique-master-check leave-master-concurrency.php source
```

The frozen-source fixtures and these repository copies are byte-identical. Mail/notifications/archive side effects are faked for quota tests; request routing, authorization, models, transactions and PostgreSQL are real. Transport/browser checks are retained separately in the audit workspace. See `docs/security/portal-security-pentest-2026-10-31.md` for scope and results.

## Portal notification lifecycle (run-8)

These fixtures must run inside the bounded, network-none audit sandbox, never directly against an operational database or server. The trusted local launcher is `C:/Users/USER/security-audit-skill/bksda-superapp/run-8/run.py`; it supplies an empty allowlisted environment, read-only code/toolchain, a disposable SQLite database, scratch limits and a descriptor-based observer. It uses locally available dependencies without installing or downloading packages.

```powershell
python C:/Users/USER/security-audit-skill/bksda-superapp/run-8/run.py php 'NotificationBmnLifecycleTest|NotificationHealthMonitorTest|PortalNotificationLifecycleTest'
python C:/Users/USER/security-audit-skill/bksda-superapp/run-8/run.py notification-client
python C:/Users/USER/security-audit-skill/bksda-superapp/run-8/run.py e2e transport
python C:/Users/USER/security-audit-skill/bksda-superapp/run-8/run.py e2e notifications
python C:/Users/USER/security-audit-skill/bksda-superapp/run-8/run.py frontend
python C:/Users/USER/security-audit-skill/bksda-superapp/run-8/run.py reverb-runtime
```

The supervisor starts native Laravel HTTP, a database queue, Reverb, a loopback HTTP/WebSocket proxy and, for `notifications`, the actual Next application and Chromium. `notification-control.php` is a CLI-only fixture with fixed stop/start markers; it adds no application route. `notification-seed.php` creates reserved dummy identities and requires `APP_ENV=audit` plus the exact scratch database. Font responses replace only the external font provider.

The trusted launcher assembles `/fixtures` from byte-identical repository copies: `notification-{supervisor.py,proxy.cjs,control.php}`, `notification-seed.php` as `seed-e2e.php`, `notification-font-responses.cjs` as `font-responses.cjs`, and `frontend/tests/notification-{flow.actual-app,transport}.cjs`. Its curated migrations exclude operational data migrations; the exclusion list and execution receipts remain outside the repository. All writers stop before bounded evidence is promoted. These hard-coded sandbox paths are intentional; the fixtures are not standalone host scripts.

`reverb-runtime.php` bootstraps only Composer autoload and checks the installed native Reverb signal subscriptions; Dockerfile also runs it during image build. A passing local check does not prove the production image has been rebuilt or deployed. The complete scope, case matrix, evidence and deployment status are in [the lifecycle report](../../../docs/security/portal-notification-lifecycle-report-2026-11-09.md).

`deployment-startup.py` parses both Dockerfile and Dokploy startup commands and invokes shell syntax checking without executing them. In the same network-none sandbox, mount the Dockerfile as `/deployment/Dockerfile`, the Compose file as `/deployment/docker-compose.dokploy.yml`, and run this Python check. It prevents automatic account reseeding on routine redeploy, checks migration failure stops startup, and requires backend/queue/scheduler/Reverb to share the existing backend cache namespace. This keeps heartbeat and distributed locks visible across processes even though their display names differ. Initial account creation remains an explicit administrator bootstrap operation.
