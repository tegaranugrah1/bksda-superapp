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
