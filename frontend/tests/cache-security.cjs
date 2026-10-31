'use strict';
/* eslint-disable @typescript-eslint/no-require-imports */

// Execute this actual-source regression check in the isolated test sandbox.
// No HTTP transport is used: real Axios request/response interceptors reach a dummy adapter.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const Module = require('node:module');

const frontendRoot = path.resolve(process.argv[2] || path.join(__dirname, '..'));
const outputPath = process.argv[3] || null;
const frontendRequire = Module.createRequire(path.join(frontendRoot, 'package.json'));
const ts = frontendRequire('typescript');
const allowedModules = {
  '@/lib/api': path.join(frontendRoot, 'src/lib/api.ts'),
  '@/lib/auth-store': path.join(frontendRoot, 'src/lib/auth-store.ts'),
};

class MemoryStorage {
  constructor() { this.items = new Map(); }
  get length() { return this.items.size; }
  key(index) { return Array.from(this.items.keys())[index] ?? null; }
  getItem(key) { return this.items.has(String(key)) ? this.items.get(String(key)) : null; }
  setItem(key, value) { this.items.set(String(key), String(value)); }
  removeItem(key) { this.items.delete(String(key)); }
  clear() { this.items.clear(); }
}

function installBrowserFixture() {
  const win = new EventTarget();
  win.location = {
    protocol: 'http:',
    hostname: 'localhost',
    host: 'localhost:3000',
    origin: 'http://localhost:3000',
    href: 'http://localhost:3000/portal',
    pathname: '/portal',
    search: '',
  };
  win.localStorage = new MemoryStorage();
  win.sessionStorage = new MemoryStorage();
  const doc = new EventTarget();
  const cookieJar = new Map();
  Object.defineProperty(doc, 'cookie', {
    get() { return Array.from(cookieJar.entries()).map(([key, value]) => key + '=' + value).join('; '); },
    set(value) {
      const text = String(value);
      const pair = text.split(';')[0];
      const separator = pair.indexOf('=');
      const key = pair.slice(0, separator);
      const content = pair.slice(separator + 1);
      if (/expires=Thu, 01 Jan 1970/i.test(text) || /max-age=0(?:;|$)/i.test(text)) {
        cookieJar.delete(key);
      } else {
        cookieJar.set(key, content);
      }
    },
  });
  globalThis.window = win;
  globalThis.document = doc;
  globalThis.localStorage = win.localStorage;
  globalThis.sessionStorage = win.sessionStorage;
  globalThis.BroadcastChannel = class FixtureBroadcastChannel extends EventTarget {
    postMessage() {}
    close() {}
  };
}

function createRuntime() {
  installBrowserFixture();
  const loaded = new Map();
  function loadSource(filename) {
    if (loaded.has(filename)) return loaded.get(filename).exports;
    const source = fs.readFileSync(filename, 'utf8');
    const compiled = ts.transpileModule(source, {
      fileName: filename,
      compilerOptions: {
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.CommonJS,
        esModuleInterop: true,
      },
    }).outputText;
    const mod = new Module(filename, module);
    loaded.set(filename, mod); // Required for the real api/auth-store circular import.
    mod.filename = filename;
    mod.paths = Module._nodeModulePaths(frontendRoot);
    mod.require = (specifier) => {
      if (Object.hasOwn(allowedModules, specifier)) return loadSource(allowedModules[specifier]);
      return frontendRequire(specifier);
    };
    mod._compile(compiled, filename);
    mod.loaded = true;
    return mod.exports;
  }
  const apiModule = loadSource(allowedModules['@/lib/api']);
  const authModule = loadSource(allowedModules['@/lib/auth-store']);
  return { api: apiModule.api, authStore: authModule.authStore };
}

function login(authStore, identity) {
  // Dummy tokens are used only to let the real request interceptor select a fixture principal.
  authStore.login('fixture-token-' + identity, {
    id: identity, username: identity, name: identity,
    email: identity + '@example.test', role: 'user', access_modules: [],
  });
}

function identityFromRequest(config) {
  const header = typeof config.headers.get === 'function'
    ? config.headers.get('Authorization')
    : config.headers.Authorization;
  if (header === 'Bearer fixture-token-dummy-a') return 'dummy-a';
  if (header === 'Bearer fixture-token-dummy-b') return 'dummy-b';
  return 'anonymous';
}

function response(config, owner) {
  return { data: { owner }, status: 200, statusText: 'OK', headers: {}, config };
}

function deferred() {
  let resolve;
  const promise = new Promise((done) => { resolve = done; });
  return { promise, resolve };
}

async function waitFor(predicate) {
  for (let i = 0; i < 20; i++) {
    if (predicate()) return;
    await new Promise((done) => setImmediate(done));
  }
  assert.fail('Dummy adapter was not reached within the bounded microtask window');
}

const cases = [
  {
    name: 'same_identity_pending_gets_are_deduplicated',
    async run(observed) {
      const { api, authStore } = createRuntime();
      const gate = deferred();
      let calls = 0;
      api.defaults.adapter = async (config) => {
        calls++;
        await gate.promise;
        return response(config, identityFromRequest(config));
      };
      login(authStore, 'dummy-a');
      const first = api.get('/me/dashboard');
      const second = api.get('/me/dashboard');
      await waitFor(() => calls > 0);
      gate.resolve();
      const [a, b] = await Promise.all([first, second]);
      observed.adapter_calls = calls;
      observed.owners = [a.data.owner, b.data.owner];
      assert.equal(calls, 1, 'Same-session identical GETs must share one actual Axios request');
      assert.equal(a.data.owner, 'dummy-a');
      assert.equal(b.data.owner, 'dummy-a');
    },
  },
  {
    name: 'logout_clears_completed_personal_cache',
    async run(observed) {
      const { api, authStore } = createRuntime();
      let calls = 0;
      api.defaults.adapter = async (config) => {
        calls++;
        return response(config, identityFromRequest(config));
      };
      login(authStore, 'dummy-a');
      await api.get('/me/dashboard');
      authStore.logout();
      login(authStore, 'dummy-b');
      const result = await api.get('/me/dashboard');
      observed.adapter_calls = calls;
      observed.active_identity = 'dummy-b';
      observed.returned_owner = result.data.owner;
      assert.equal(result.data.owner, 'dummy-b', 'Logout must prevent completed account-A cache from serving account B');
      assert.equal(calls, 2);
    },
  },
  {
    name: 'late_old_session_get_cannot_repopulate_new_session_cache',
    async run(observed) {
      const { api, authStore } = createRuntime();
      const oldRequest = deferred();
      const calls = [];
      api.defaults.adapter = async (config) => {
        const identity = identityFromRequest(config);
        calls.push(identity);
        if (identity === 'dummy-a') await oldRequest.promise;
        return response(config, identity);
      };
      login(authStore, 'dummy-a');
      const pendingA = api.get('/me/dashboard');
      await waitFor(() => calls.length === 1);
      authStore.logout();
      login(authStore, 'dummy-b');
      oldRequest.resolve();
      // A secure implementation may reject/cancel a stale response or simply avoid caching it.
      let staleResponseDelivered = false;
      await pendingA.then(() => { staleResponseDelivered = true; }, () => null);
      observed.stale_response_delivered = staleResponseDelivered;
      const resultB = await api.get('/me/dashboard');
      observed.adapter_principals = calls;
      observed.active_identity = 'dummy-b';
      observed.returned_owner = resultB.data.owner;
      assert.equal(resultB.data.owner, 'dummy-b', 'Account B received dummy account-A data after its login');
      assert.deepEqual(calls, ['dummy-a', 'dummy-b'], 'B must issue its own authorized Axios request after stale A completes');
      assert.equal(staleResponseDelivered, false, 'Old-session data must not reach caller callbacks');
    },
  },
  {
    name: 'identity_change_without_logout_never_reuses_another_personal_cache',
    async run(observed) {
      const { api, authStore } = createRuntime();
      const calls = [];
      api.defaults.adapter = async (config) => {
        const identity = identityFromRequest(config);
        calls.push(identity);
        return response(config, identity);
      };
      login(authStore, 'dummy-a');
      await api.get('/me/dashboard');
      login(authStore, 'dummy-b');
      const resultB = await api.get('/me/dashboard');
      observed.adapter_principals = calls;
      observed.active_identity = 'dummy-b';
      observed.returned_owner = resultB.data.owner;
      assert.equal(resultB.data.owner, 'dummy-b', 'A new identity must never inherit the previous identity cache');
    },
  },
  {
    name: 'old_finally_preserves_current_session_pending_deduplication',
    async run(observed) {
      const { api, authStore } = createRuntime();
      const oldGate = deferred();
      const currentGate = deferred();
      let calls = 0;
      api.defaults.adapter = async (config) => {
        const requestNumber = ++calls;
        await (requestNumber === 1 ? oldGate.promise : currentGate.promise);
        return response(config, 'dummy-session-' + requestNumber);
      };
      login(authStore, 'dummy-a');
      const old = api.get('/me/dashboard');
      const oldOutcome = old.then(() => 'delivered', () => 'rejected');
      await waitFor(() => calls === 1);
      authStore.logout();
      // Reusing this dummy credential makes identity-only cache partitioning insufficient.
      login(authStore, 'dummy-a');
      const current = api.get('/me/dashboard');
      await waitFor(() => calls === 2);
      oldGate.resolve();
      const oldResult = await oldOutcome;
      const duplicate = api.get('/me/dashboard');
      await new Promise((done) => setImmediate(done));
      observed.stale_outcome = oldResult;
      observed.adapter_calls_before_current_completion = calls;
      currentGate.resolve();
      const values = await Promise.all([current, duplicate]);
      observed.returned_owners = values.map((value) => value.data.owner);
      assert.equal(oldResult, 'rejected', 'Logout/relogin must invalidate an old request even for identical dummy credentials');
      assert.equal(calls, 2, 'Old completion must not delete the newer pending request');
      assert.equal(values[0].data.owner, 'dummy-session-2');
      assert.equal(values[1].data.owner, 'dummy-session-2');
    },
  },
  {
    name: 'old_session_401_cannot_log_out_the_current_account',
    async run(observed) {
      const { api, authStore } = createRuntime();
      const gate = deferred();
      const axios = frontendRequire('axios');
      let started = false;
      api.defaults.adapter = async (config) => {
        started = true;
        await gate.promise;
        throw new axios.AxiosError('Dummy unauthorized response', 'ERR_BAD_REQUEST', config, null, {
          ...response(config, 'dummy-a'), status: 401, statusText: 'Unauthorized',
        });
      };
      login(authStore, 'dummy-a');
      const old = api.get('/me/dashboard').catch((error) => error.code);
      await waitFor(() => started);
      authStore.logout();
      login(authStore, 'dummy-b');
      gate.resolve();
      const code = await old;
      observed.rejection_code = code;
      observed.remaining_identity = JSON.parse(localStorage.getItem('bksda_user') || 'null')?.username || null;
      observed.navigation = window.location.pathname;
      assert.equal(observed.remaining_identity, 'dummy-b', 'An old account-A failure must not log out account B');
      assert.equal(code, 'ERR_CANCELED', 'A stale unauthorized response must be treated as cancellation');
      assert.equal(window.location.href, 'http://localhost:3000/portal');
    },
  },
  {
    name: 'queued_cross_tab_logout_login_invalidates_old_requests',
    async run(observed) {
      const { api, authStore } = createRuntime();
      const gate = deferred();
      let started = false;
      api.defaults.adapter = async (config) => {
        started = true;
        await gate.promise;
        return response(config, identityFromRequest(config));
      };
      login(authStore, 'dummy-a');
      const old = api.get('/me/dashboard').then(() => 'delivered', () => 'rejected');
      await waitFor(() => started);
      // Another tab can log out and restore the same identity before its storage events arrive.
      const boundary = new Event('storage');
      Object.defineProperty(boundary, 'key', { value: 'bksda_logged_in' });
      Object.defineProperty(boundary, 'oldValue', { value: 'true' });
      Object.defineProperty(boundary, 'newValue', { value: null });
      window.dispatchEvent(boundary);
      gate.resolve();
      observed.stale_outcome = await old;
      assert.equal(observed.stale_outcome, 'rejected', 'A queued cross-tab auth boundary must invalidate an older request');
    },
  },
  {
    name: 'same_session_profile_refresh_keeps_pending_response_and_flushes_cache',
    async run(observed) {
      const { api, authStore } = createRuntime();
      const gate = deferred();
      const calls = { assets: 0, dashboard: 0 };
      api.defaults.adapter = async (config) => {
        if (config.url === '/me/dashboard') {
          calls.dashboard++;
          await gate.promise;
        } else {
          calls.assets++;
        }
        return response(config, identityFromRequest(config));
      };
      login(authStore, 'dummy-a');
      await api.get('/me/assets');
      await api.get('/me/assets');
      assert.equal(calls.assets, 1, 'Precondition: the completed GET is cached');
      const pending = api.get('/me/dashboard').then(
        (value) => ({ outcome: 'delivered', owner: value.data.owner }),
        (error) => ({ outcome: 'rejected', code: error.code })
      );
      await waitFor(() => calls.dashboard === 1);
      const oldValue = localStorage.getItem('bksda_user');
      const user = JSON.parse(oldValue);
      // Different property order and profile metadata, identical identity and authority.
      const newValue = JSON.stringify({
        access_modules: user.access_modules, role: user.role,
        email: 'updated-profile@example.test', name: 'Updated Dummy Profile',
        username: user.username, id: user.id,
      });
      localStorage.setItem('bksda_user', newValue);
      const refresh = new Event('storage');
      Object.defineProperties(refresh, {
        key: { value: 'bksda_user' }, oldValue: { value: oldValue }, newValue: { value: newValue },
      });
      window.dispatchEvent(refresh);
      gate.resolve();
      observed.pending = await pending;
      await api.get('/me/assets');
      await api.get('/me/dashboard');
      observed.adapter_calls = calls;
      assert.equal(observed.pending.outcome, 'delivered', 'A profile-only update must not cancel the current session dashboard');
      assert.equal(observed.pending.owner, 'dummy-a');
      assert.equal(calls.assets, 2, 'Profile update must flush previously completed GET cache');
      assert.equal(calls.dashboard, 2, 'A pre-refresh pending response must not repopulate invalidated cache');
    },
  },
];

async function main() {
  const results = [];
  for (const entry of cases) {
    const observed = {};
    try {
      await entry.run(observed);
      results.push({ name: entry.name, status: 'passed', observed });
    } catch (error) {
      results.push({
        name: entry.name, status: 'failed', observed,
        error: String(error.message).slice(0, 500),
      });
    }
  }
  const sourceHashes = {};
  for (const [alias, filename] of Object.entries(allowedModules)) {
    sourceHashes[alias] = crypto.createHash('sha256').update(fs.readFileSync(filename)).digest('hex');
  }
  const report = {
    native_interface: 'actual TypeScript api/auth-store modules and real Axios using a controlled dummy adapter',
    containment: 'No HTTP transport, real credentials, production state, or browser security-policy claim',
    node: process.version,
    source_sha256: sourceHashes,
    passed: results.filter((entry) => entry.status === 'passed').length,
    failed: results.filter((entry) => entry.status === 'failed').length,
    tests: results,
  };
  if (outputPath) fs.writeFileSync(outputPath, JSON.stringify(report, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
  process.stdout.write(JSON.stringify(outputPath ? { passed: report.passed, failed: report.failed } : report, null, outputPath ? 0 : 2) + '\n');
  if (report.failed) process.exitCode = 1;
}

main().catch((error) => {
  process.stderr.write('Harness setup failed: ' + String(error.message).slice(0, 500) + '\n');
  process.exitCode = 2;
});
