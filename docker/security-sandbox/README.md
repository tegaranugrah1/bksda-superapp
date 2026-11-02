# Local audit runtime images

For the complete Indonesian workflow, source/snapshot checks, test recipes and AI handoff, read [the portal security testing guide](../../docs/security/panduan-uji-keamanan-dan-pentest-portal.md).

From the repository root, using already-installed dependencies:

```powershell
docker build -t bksda-security-sandbox:php84 docker/security-sandbox
docker build -f docker/security-sandbox/Dockerfile.browser --build-context phpdeps=backend/vendor --build-context nodedeps=frontend/node_modules -t bksda-security-sandbox:browser docker/security-sandbox
```

Named contexts include only vendor/node_modules. Application source and `.env` are not build contexts. Installed dependency bytes are copied AFTER every trusted toolchain RUN, so application/package hooks never run during provisioning. Browser native bindings use `NODE_PATH=/opt/browser-toolchain/node_modules` at runtime.

The image is tooling, not a complete sandbox policy. The audit parent must enforce network-none/no published ports, env-i with explicit dummy values, read-only source/toolchain/root, UID65534/cap-drop/no-new-privileges, bounded writable scratch/CPU/RAM/pids/files/wall time, dedicated local dummy services and an ephemeral Chromium profile. Current launchers and per-job limits/receipts live in `C:/Users/USER/security-audit-skill/bksda-superapp/run-4/sandbox/` and its parent artifact directory. Do not substitute deployment compose for those controls.

Evidence promotion uses a separate trusted pre-opened descriptor observer after all target writers stop; target containers never mount retained artifacts. Runtime image IDs, source hashes, final checks and exclusions are recorded in run metadata and the portal security report.
