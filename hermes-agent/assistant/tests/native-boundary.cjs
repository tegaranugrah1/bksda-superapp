'use strict';
// Source-only proposal. Parent alone reviews, installs and runs in its bounded offline sandbox.
// Reuses security-boundary.cjs's in-memory TypeScript loader; replaces only Redis/NLU/gateway.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const dependencyRoot = process.env.ASSISTANT_DEPENDENCY_ROOT || '/frontend/node_modules';
const ts = require(path.join(dependencyRoot, 'typescript/lib/typescript.js'));
const axios = require(path.join(dependencyRoot, 'axios/dist/node/axios.cjs'));
const sourceRoot = path.resolve(process.env.ASSISTANT_SOURCE_ROOT || '/assistant/src');
const baselineRoot = path.resolve('/assistant-baseline/src');
const variant = process.env.ASSISTANT_NATIVE_VARIANT;
assert.ok(['baseline', 'current'].includes(variant));
const origin = 'http://127.0.0.1:18080';
assert.equal(process.env.SUPERAPP_API_URL, origin);
assert.equal(process.env.SUPERAPP_INTERNAL_KEY, 'dummy-assistant-native-only');
assert.equal(process.env.APP_ENV, 'audit');
const nip = '900000000000000001';
const oldPhone = '6281111111111';
const newPhone = '6282222222222';
const sessionKey = 'session:user:' + oldPhone;
const sends = [], trace = [], blocked = [], values = new Map(), deadlines = new Map();
let phase = 'setup';
let employeeId;

function loadActual(root, relativePath, stubs, cache = new Map()) {
  const absolute = path.resolve(root, relativePath);
  const relative = path.relative(root, absolute);
  assert.ok(relative !== '..' && !relative.startsWith('..' + path.sep) && !path.isAbsolute(relative));
  assert.equal(path.extname(absolute), '.ts');
  if (cache.has(absolute)) return cache.get(absolute).exports;
  const transformed = ts.transpileModule(fs.readFileSync(absolute, 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS,
      esModuleInterop: true, strict: true }, fileName: absolute, reportDiagnostics: true,
  });
  assert.deepEqual((transformed.diagnostics || []).filter(d => d.category === ts.DiagnosticCategory.Error), []);
  const compiled = new Module(absolute, module);
  compiled.filename = absolute;
  compiled.paths = [];
  cache.set(absolute, compiled);
  compiled.require = request => {
    if (Object.prototype.hasOwnProperty.call(stubs, request)) return stubs[request];
    if (request === 'crypto' || request === 'node:crypto') return require('node:crypto');
    if (request.startsWith('.')) {
      let resolved = path.resolve(path.dirname(absolute), request);
      if (!path.extname(resolved)) resolved += '.ts';
      return loadActual(root, path.relative(root, resolved), stubs, cache);
    }
    throw new Error('Unexpected dependency: ' + request);
  };
  compiled._compile(transformed.outputText, absolute);
  return compiled.exports;
}

function expire(key) {
  if (deadlines.has(key) && deadlines.get(key) <= Date.now()) {
    values.delete(key); deadlines.delete(key);
  }
}
class RedisAdapter {
  async get(key) { expire(key); return values.has(key) ? values.get(key) : null; }
  async set(key, value, ...options) {
    expire(key);
    if (options.includes('NX') && values.has(key)) return null;
    values.set(key, value);
    deadlines.delete(key);
    if (options.includes('EX')) deadlines.set(key, Date.now() + options[options.indexOf('EX') + 1] * 1000);
    return 'OK';
  }
  async del(...keys) {
    let count = 0;
    for (const key of keys) { expire(key); if (values.delete(key)) count++; deadlines.delete(key); }
    return count;
  }
  async expire(key, seconds) {
    expire(key); if (!values.has(key)) return 0;
    deadlines.set(key, Date.now() + seconds * 1000); return 1;
  }
  async rpush(key, value) {
    expire(key); const list = values.get(key) || []; list.push(value); values.set(key, list); return list.length;
  }
  async lrange(key, start, stop) {
    assert.equal(start, 0); assert.equal(stop, -1); expire(key); return [...(values.get(key) || [])];
  }
  async eval(script, count, key, expected) {
    assert.equal(script, "if redis.call('GET', KEYS[1]) == ARGV[1] then return redis.call('DEL', KEYS[1]) else return 0 end");
    assert.equal(count, 1); expire(key);
    return values.get(key) === expected ? this.del(key) : 0;
  }
}
class GatewayAdapter {
  async sendMessage(destination, message) { sends.push({ phase, destination, message }); return true; }
}
class NluAdapter {
  async parseUserMessage(text) {
    if (text === 'DUMMY COMPLETE LEAVE DRAFT') return { intent: 'AJUKAN_CUTI', confidence: 1,
      data: { tanggal_mulai: '2026-11-10', tanggal_selesai: '2026-11-10', jenis_cuti: 'Cuti Tahunan',
        alasan_cuti: 'Dummy cancelled draft only', alamat_cuti: 'Dummy address' } };
    if (text === 'BATAL') return { intent: 'KONFIRMASI_BATAL', confidence: 1, data: {} };
    if (text === 'cek cuti') return { intent: 'CEK_CUTI', confidence: 1, data: {} };
    throw new Error('Unexpected deterministic NLU input');
  }
}

// Recording interceptors leave Axios's actual HTTP adapter and native backend responses intact.
// No leave-write, ST, linking, provider, redirect, or arbitrary HTTP route is permitted.
function instrument(api) {
  api.defaults.proxy = false;
  api.defaults.maxRedirects = 0;
  api.defaults.maxContentLength = 65536;
  api.defaults.maxBodyLength = 65536;
  api.interceptors.request.use(config => {
    const url = new URL(api.getUri(config));
    const method = (config.method || 'get').toUpperCase();
    const body = typeof config.data === 'string' ? JSON.parse(config.data) : config.data;
    const permitted = url.origin === origin && !url.search && !url.username && !url.password && (
      (method === 'POST' && url.pathname === '/api/agent/v1/auth/verify-phone'
        && [oldPhone, newPhone].includes(body?.phone)) ||
      (method === 'GET' && url.pathname === '/api/agent/v1/employees/' + nip + '/leaves') ||
      (method === 'POST' && url.pathname === '/api/login' && body?.username === 'dummy-e2e-admin') ||
      (method === 'PUT' && employeeId && url.pathname === '/api/kepegawaian/employees/' + employeeId
        && body?.nip === nip && body?.telepon === '+' + newPhone));
    if (!permitted) {
      blocked.push({ phase, method, route: url.pathname });
      throw new Error('Fixture denied an out-of-scope request');
    }
    config.fixtureRecord = { phase, method, route: url.pathname,
      ...(url.pathname.endsWith('/verify-phone') ? { phone: body.phone } : {}) };
    trace.push(config.fixtureRecord);
    return config;
  });
  api.interceptors.response.use(response => {
    response.config.fixtureRecord.status = response.status;
    return response;
  }, error => {
    if (error.config?.fixtureRecord) error.config.fixtureRecord.status = error.response?.status || 'transport-error';
    return Promise.reject(error);
  });
  return api;
}
function machine(root) {
  const actual = loadActual(root, 'conversation/stateMachine.ts', {
    axios, ioredis: RedisAdapter,
    '../gateway/evolution': { EvolutionGateway: GatewayAdapter },
    '../nlu/gemini': { GeminiNluService: NluAdapter },
  });
  const instance = new actual.ConversationStateMachine();
  // TypeScript private visibility only: observe the actual client instance without substituting it.
  instrument(instance.superapp.api);
  return instance;
}
const incoming = (instance, phone, text) => instance.handleIncomingMessage(phone + '@s.whatsapp.net', text, 'text');
const balances = entries => entries.filter(e => e.route === '/api/agent/v1/employees/' + nip + '/leaves');
const marker = send => send.message.includes(nip) && send.message.includes('12 hari')
  && send.message.includes('*10 hari*');

(async () => {
  phase = 'organic-baseline-session';
  const baseline = machine(baselineRoot);
  await incoming(baseline, oldPhone, 'DUMMY COMPLETE LEAVE DRAFT');
  const draft = JSON.parse(values.get(sessionKey));
  assert.equal(draft.state, 'AWAITING_LEAVE_CONFIRMATION');
  assert.equal(draft.employee.nip, nip);
  assert.equal(draft.pendingData.nip, nip);
  employeeId = draft.employee.id;
  await incoming(baseline, oldPhone, 'BATAL');
  const retained = values.get(sessionKey);
  const idle = JSON.parse(retained);
  assert.equal(idle.state, 'IDLE');
  assert.equal(idle.employee.nip, nip);
  assert.ok(!idle.pendingData);
  assert.ok(deadlines.get(sessionKey) > Date.now());
  assert.equal(balances(trace).length, 0);
  assert.ok(sends.some(s => s.message.includes('telah dibatalkan')));

  let selected = baseline;
  if (variant === 'current') {
    // Current cancellation deletes its session. First exercise that organic behavior,
    // then replay the baseline's legitimately created IDLE value as a controlled negative.
    phase = 'organic-current-cancellation';
    await new RedisAdapter().del(sessionKey);
    selected = machine(sourceRoot);
    await incoming(selected, oldPhone, 'DUMMY COMPLETE LEAVE DRAFT');
    assert.equal(JSON.parse(values.get(sessionKey)).state, 'AWAITING_LEAVE_CONFIRMATION');
    await incoming(selected, oldPhone, 'BATAL');
    assert.equal(values.has(sessionKey), false);
    await new RedisAdapter().set(sessionKey, retained, 'EX', 1800);
    assert.equal(values.get(sessionKey), retained);
  } else {
    assert.equal(sourceRoot, baselineRoot, 'Baseline mode must select the original baseline mount');
  }

  phase = 'native-authorized-profile-phone-replacement';
  const admin = instrument(axios.create({ baseURL: origin, timeout: 8000,
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' } }));
  const login = await admin.post('/api/login', { username: 'dummy-e2e-admin', password: 'DummyE2E-Local-Password42!' });
  assert.equal(login.status, 200);
  assert.ok(login.data.token);
  assert.equal(login.data.data.role, 'super_admin');
  const updated = await admin.put('/api/kepegawaian/employees/' + employeeId,
    { nip, nama_lengkap: idle.employee.nama_lengkap, telepon: '+' + newPhone },
    { headers: { Authorization: 'Bearer ' + login.data.token } });
  assert.equal(updated.status, 200);
  assert.equal(updated.data.data.telepon, '+' + newPhone);
  assert.equal(values.get(sessionKey), retained, 'Backend profile update must leave the recording Redis session intact');

  phase = 'native-phone-binding-controls';
  const oldBinding = await selected.superapp.verifyPhone(oldPhone);
  const newBinding = await selected.superapp.verifyPhone(newPhone);
  assert.equal(oldBinding.success, false);
  assert.ok(trace.some(e => e.phase === phase && e.phone === oldPhone && e.status === 404));
  assert.equal(newBinding.success, true);
  assert.equal(newBinding.data.nip, nip);
  assert.equal(newBinding.data.id, employeeId);

  phase = 'old-phone-message';
  const before = trace.length, sendsBefore = sends.length;
  await incoming(selected, oldPhone, 'cek cuti');
  const oldTrace = trace.slice(before), oldSends = sends.slice(sendsBefore);
  assert.equal(oldSends.length, 1);
  assert.equal(oldSends[0].destination, oldPhone + '@s.whatsapp.net');
  if (variant === 'current') {
    assert.equal(balances(oldTrace).length, 0, 'Current must reject before balance HTTP');
    assert.ok(oldTrace.some(e => e.phone === oldPhone && e.status === 404));
    assert.equal(values.has(sessionKey), false);
    assert.equal(oldSends.some(marker), false);
    assert.ok(oldSends[0].message.includes('belum dapat diverifikasi'));
  }

  phase = 'new-phone-positive-control';
  const positiveBefore = trace.length, positiveSendsBefore = sends.length;
  await incoming(selected, newPhone, 'cek cuti');
  const positiveTrace = trace.slice(positiveBefore), positiveSends = sends.slice(positiveSendsBefore);
  assert.equal(balances(positiveTrace).length, 1);
  assert.equal(balances(positiveTrace)[0].status, 200);
  assert.ok(positiveSends.some(s => s.destination === newPhone + '@s.whatsapp.net' && marker(s)));
  assert.deepEqual(blocked, []);
  console.log(JSON.stringify({ fixture: 'assistant-native', variant,
    session_origin: variant === 'baseline' ? 'organic initial verify+complete draft+BATAL => cached IDLE'
      : 'CONTROLLED NEGATIVE: exact organic baseline IDLE replayed into Map after current cancellation deleted its own session',
    old_phone_balance_http_calls: balances(oldTrace).length,
    old_phone_balance_http_statuses: balances(oldTrace).map(e => e.status),
    old_phone_dummy_balance_marker: oldSends.some(marker),
    old_phone_recording_destinations: oldSends.map(s => s.destination),
    new_phone_positive_balance_marker: positiveSends.some(marker),
    new_phone_recording_destinations: positiveSends.map(s => s.destination),
    trace, blocked_requests: blocked.length,
    services: 'native Axios/native PHP/dummySQLite; deterministic Redis+NLU+gateway; no provider adapter loaded',
  }, null, 2));
})().catch(error => {
  // Deliberately omit Axios error serialization: it may contain the dummy login token/password.
  console.error(JSON.stringify({ fixture: 'assistant-native', variant, phase,
    error: String(error.message).slice(0, 800), trace, blocked }));
  process.exitCode = 1;
});
