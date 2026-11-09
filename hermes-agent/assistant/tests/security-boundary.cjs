'use strict';

/*
 * Parent-only offline runner. This file has not been executed by its author.
 * Required source mount: ASSISTANT_SOURCE_ROOT, default /assistant/src.
 * Required existing deps: ASSISTANT_DEPENDENCY_ROOT, default /frontend/node_modules.
 * Source is read/transpiled in memory; no generated files or .env are read/written.
 * Only HTTP traffic is to Express servers created here at 127.0.0.1:ephemeral.
 * Redis, SuperApp, Gemini and Evolution are in-memory adapters, never providers.
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const Module = require('node:module');

const sourceRoot = path.resolve(process.env.ASSISTANT_SOURCE_ROOT || '/assistant/src');
const dependencyRoot = path.resolve(process.env.ASSISTANT_DEPENDENCY_ROOT || '/frontend/node_modules');
const ts = require(path.join(dependencyRoot, 'typescript/lib/typescript.js'));
const realExpress = require(path.join(dependencyRoot, 'express'));

const results = [];
let assertions = 0;
const servers = new Set();

function check(value, message) {
  assertions += 1;
  assert.ok(value, message);
}
function same(actual, expected, message) {
  assertions += 1;
  assert.deepEqual(actual, expected, message);
}
async function test(name, fn) {
  const before = assertions;
  try {
    await fn();
    results.push({ name, status: 'passed', assertions: assertions - before });
  } catch (error) {
    results.push({
      name,
      status: 'failed',
      assertions: assertions - before,
      error: String(error && error.message || error).slice(0, 1600),
    });
  }
}

function loadActual(relativePath, stubs, cache = new Map()) {
  const absolute = path.resolve(sourceRoot, relativePath);
  const relative = path.relative(sourceRoot, absolute);
  check(relative !== '..' && !relative.startsWith('..' + path.sep) && !path.isAbsolute(relative),
    'compiled source remains within explicit assistant source mount');
  if (cache.has(absolute)) return cache.get(absolute).exports;
  const source = fs.readFileSync(absolute, 'utf8');
  const transformed = ts.transpileModule(source, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.CommonJS,
      esModuleInterop: true,
      strict: true,
    },
    fileName: absolute,
    reportDiagnostics: true,
  });
  const syntaxErrors = (transformed.diagnostics || [])
    .filter(diagnostic => diagnostic.category === ts.DiagnosticCategory.Error);
  same(syntaxErrors.map(diagnostic => String(diagnostic.messageText)), [],
    'actual TypeScript has no transpilation diagnostics');
  const compiled = new Module(absolute, module);
  compiled.filename = absolute;
  compiled.paths = [];
  cache.set(absolute, compiled);
  compiled.require = function(request) {
    if (Object.prototype.hasOwnProperty.call(stubs, request)) return stubs[request];
    if (request === 'crypto' || request === 'node:crypto') return require('node:crypto');
    if (request.startsWith('.')) {
      let resolved = path.resolve(path.dirname(absolute), request);
      if (!path.extname(resolved)) resolved += '.ts';
      return loadActual(path.relative(sourceRoot, resolved), stubs, cache);
    }
    throw new Error('Unexpected dependency; no real service adapter may load: ' + request);
  };
  compiled._compile(transformed.outputText, absolute);
  return compiled.exports;
}

function withEnvironment(changes, callback) {
  const previous = {};
  for (const [key, value] of Object.entries(changes)) {
    previous[key] = process.env[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  return Promise.resolve().then(callback).finally(() => {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });
}

function postJson(server, route, body, headers = {}, method = 'POST') {
  const address = server.address();
  check(address && address.address === '127.0.0.1',
    'native HTTP client can only use its own loopback fixture listener');
  return new Promise((resolve, reject) => {
    const json = method === 'GET' ? '' : JSON.stringify(body);
    const request = http.request({
      host: '127.0.0.1',
      port: address.port,
      method,
      path: route,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(json),
        ...headers,
      },
      agent: false,
    }, response => {
      let text = '';
      response.setEncoding('utf8');
      response.on('data', chunk => {
        text += chunk;
        if (text.length > 16384) request.destroy(new Error('Unexpected oversized fixture response'));
      });
      response.on('end', () => resolve({ status: response.statusCode, body: text, headers: response.headers }));
      response.on('error', reject);
    });
    request.setTimeout(2000, () => request.destroy(new Error('Fixture HTTP timeout')));
    request.on('error', reject);
    request.end(json);
  });
}

async function closeServer(server) {
  if (!server) return;
  await new Promise(resolve => {
    server.close(() => resolve());
    if (typeof server.closeIdleConnections === 'function') server.closeIdleConnections();
  });
  servers.delete(server);
}

async function startActualIndex() {
  const dispatched = [];
  const sent = [];
  let qrReads = 0;
  let fixtureServer;
  let dotenvCalls = 0;
  function expressFixture(...args) {
    const app = realExpress(...args);
    const listen = app.listen.bind(app);
    app.listen = function(_sourcePort, ...args) {
      const callback = args.find(value => typeof value === 'function');
      fixtureServer = listen(0, '127.0.0.1', callback);
      servers.add(fixtureServer);
      return fixtureServer;
    };
    return app;
  }
  Object.assign(expressFixture, realExpress);
  class StateMachineAdapter {
    async handleIncomingMessage(...args) {
      dispatched.push(args);
    }
  }
  class GatewayAdapter {
    async sendMessage(...args) {
      sent.push(args);
      return true;
    }
    async getConnectionStatus() { return 'open'; }
    async getLiveQrCode() { qrReads += 1; return { state: 'open' }; }
  }
  loadActual('index.ts', {
    express: expressFixture,
    dotenv: { config() { dotenvCalls += 1; return { parsed: {} }; } },
    './conversation/stateMachine': { ConversationStateMachine: StateMachineAdapter },
    './gateway/evolution': { EvolutionGateway: GatewayAdapter },
  });
  check(fixtureServer, 'actual index.ts created its Express listener');
  await new Promise((resolve, reject) => {
    if (fixtureServer.listening) return resolve();
    fixtureServer.once('listening', resolve);
    fixtureServer.once('error', reject);
  });
  same(dotenvCalls, 1, 'dotenv config is intercepted without reading any .env');
  return { server: fixtureServer, dispatched, sent, qrReads: () => qrReads };
}

async function operatorChecks() {
  await test('operator pages require separate configured credentials before gateway access', async () => {
    for (const password of [undefined, 'dummy-operator-only']) {
      await withEnvironment({ PORT: '0', ASSISTANT_ADMIN_USERNAME: 'dummy-admin',
        ASSISTANT_ADMIN_PASSWORD: password, EVOLUTION_WEBHOOK_KEY: evolutionKey,
        SUPERAPP_INTERNAL_KEY: superAppKey }, async () => {
        const fixture = await startActualIndex();
        try {
          for (const route of ['/qr', '/api/qr-live']) {
            for (const headers of [{}, { Authorization: 'Basic '+Buffer.from('dummy-admin:wrong').toString('base64') },
              { 'X-Agent-Internal-Key': superAppKey }, { 'X-Evolution-Webhook-Key': evolutionKey }]) {
              const response = await postJson(fixture.server, route, null, headers, 'GET');
              same(response.status, password ? 401 : 503, 'unauthorized operator request is denied');
              same(response.headers['cache-control'], 'no-store', 'operator response cannot be cached');
              same(fixture.qrReads(), 0, 'denial precedes gateway delegation');
            }
            if (password) {
              const response = await postJson(fixture.server, route, null,
                { Authorization: 'Basic '+Buffer.from('dummy-admin:'+password).toString('base64') }, 'GET');
              same(response.status, 200, 'designated operator can view page or connected state');
              same(response.headers['cache-control'], 'no-store', 'authorized response is also private');
            }
          }
          same(fixture.qrReads(), password ? 1 : 0, 'only one authorized API request delegates');
          same(fixture.dispatched, [], 'operator view dispatches no conversation');
          same(fixture.sent, [], 'operator view sends no messages');
        } finally { await closeServer(fixture.server); }
      });
    }
  });
}

const evolutionBody = {
  event: 'messages.upsert',
  data: {
    key: { fromMe: false, remoteJid: '6281111111111@s.whatsapp.net', id: 'dummy-webhook-event-1' },
    message: { conversation: 'cek cuti' },
  },
};
const publicationBody = {
  event: 'st_published',
  surat_id: 'dummy-st-id',
  nomor_surat: 'DUMMY-ST-ONLY',
  maksud_tujuan: 'DUMMY-OFFICIAL-MARKER',
  tempat_tujuan: 'Dummy Place',
  tanggal_mulai: '2026-11-09',
  tanggal_selesai: '2026-11-09',
  personil: [{ id: 1, nip: '199001012010011001', nama: 'Dummy A', telepon: '+6281111111111' }],
};
const evolutionKey = 'dummy-evolution-webhook-only';
const superAppKey = 'dummy-superapp-webhook-only';

async function webhookChecks() {
  await test('native Express denies missing/wrong producer keys and accepts each designated key', async () => {
    await withEnvironment({
      PORT: '0',
      EVOLUTION_WEBHOOK_KEY: evolutionKey,
      SUPERAPP_INTERNAL_KEY: superAppKey,
    }, async () => {
      const fixture = await startActualIndex();
      try {
        for (const [route, body, header, key, otherHeader, otherKey] of [
          ['/webhook/evolution', evolutionBody, 'X-Evolution-Webhook-Key', evolutionKey,
            'X-Agent-Internal-Key', superAppKey],
          ['/webhook/st-published', publicationBody, 'X-Agent-Internal-Key', superAppKey,
            'X-Evolution-Webhook-Key', evolutionKey],
        ]) {
          for (const headers of [{}, { [header]: 'wrong-dummy-key' }, { [otherHeader]: otherKey }]) {
            const dispatchBefore = fixture.dispatched.length;
            const sendBefore = fixture.sent.length;
            const response = await postJson(fixture.server, route, body, headers);
            process.stdout.write(JSON.stringify({ check: 'producer-denial-delegation', route,
              status: response.status, dispatch_delta: fixture.dispatched.length - dispatchBefore,
              send_delta: fixture.sent.length - sendBefore })+'\n');
            same(response.status, 403, route + ' rejects unauthorized producer');
            await new Promise(resolve => setImmediate(resolve));
            same(fixture.dispatched.length, dispatchBefore, 'unauthorized request does not dispatch conversation');
            same(fixture.sent.length, sendBefore, 'unauthorized request does not dispatch official message');
          }
          const dispatchBefore = fixture.dispatched.length;
          const sendBefore = fixture.sent.length;
          const accepted = await postJson(fixture.server, route, body, { [header]: key });
          same(accepted.status, 200, route + ' accepts designated explicit dummy key');
          await new Promise(resolve => setImmediate(resolve));
          if (route === '/webhook/evolution') {
            same(fixture.dispatched.length, dispatchBefore + 1, 'valid Evolution request reaches actual route dispatcher');
            same(fixture.dispatched.at(-1),
              ['6281111111111@s.whatsapp.net', 'cek cuti', 'text'],
              'actual route forwards parsed sender/text/type');
            same(fixture.sent.length, sendBefore, 'Evolution handler itself does not fabricate ST publications');
          } else {
            same(fixture.sent.length, sendBefore + 1, 'valid ST callback dispatches one mocked official send');
            same(fixture.sent.at(-1)[0], '6281111111111@s.whatsapp.net',
              'actual callback normalizes dummy recipient');
            check(fixture.sent.at(-1)[1].includes('DUMMY-OFFICIAL-MARKER'),
              'actual official message includes dummy task marker');
            same(fixture.dispatched.length, dispatchBefore, 'ST callback does not dispatch conversation');
          }
        }
      } finally {
        await closeServer(fixture.server);
      }
    });
  });

  for (const [route, body, missingEnvironment, header, dummy] of [
    ['/webhook/evolution', evolutionBody, 'EVOLUTION_WEBHOOK_KEY', 'X-Evolution-Webhook-Key', evolutionKey],
    ['/webhook/st-published', publicationBody, 'SUPERAPP_INTERNAL_KEY', 'X-Agent-Internal-Key', superAppKey],
  ]) {
    await test('native Express fails closed503 when ' + missingEnvironment + ' is unconfigured', async () => {
      await withEnvironment({
        PORT: '0',
        EVOLUTION_WEBHOOK_KEY: evolutionKey,
        SUPERAPP_INTERNAL_KEY: superAppKey,
        [missingEnvironment]: undefined,
      }, async () => {
        const fixture = await startActualIndex();
        try {
          for (const headers of [{}, { [header]: dummy }]) {
            const response = await postJson(fixture.server, route, body, headers);
            process.stdout.write(JSON.stringify({ check: 'unconfigured-producer-delegation', route,
              status: response.status, dispatch_count: fixture.dispatched.length,
              send_count: fixture.sent.length })+'\n');
            same(response.status, 503, 'missing configured producer key disables route');
            await new Promise(resolve => setImmediate(resolve));
            same(fixture.dispatched.length, 0, 'disabled route does not dispatch conversation');
            same(fixture.sent.length, 0, 'disabled route does not dispatch gateway send');
          }
        } finally {
          await closeServer(fixture.server);
        }
      });
    });
  }
}

const employeeA = {
  id: 1,
  nip: '199001012010011001',
  nama_lengkap: 'Dummy Employee A',
  satuan_kerja: 'Dummy Unit A',
  telepon: '+6281111111111',
};
const employeeB = {
  id: 2,
  nip: '199002022010011002',
  nama_lengkap: 'Dummy Employee B',
  satuan_kerja: 'Dummy Unit B',
  telepon: '+6281111111111',
};
const oldPhone = '6281111111111';
const sessionKey = 'session:user:' + oldPhone;
const pendingA = {
  nip: employeeA.nip,
  jenis_cuti: 'Cuti Tahunan',
  tanggal_mulai: '2026-11-09',
  tanggal_selesai: '2026-11-09',
  alasan_cuti: 'Dummy pending A only',
  alamat_menjalankan_cuti: 'Dummy address',
  telepon: '+' + oldPhone,
  idempotency_key: 'dummy-pending-A',
};
function copy(value) {
  return JSON.parse(JSON.stringify(value));
}
function session(state, pendingData) {
  return {
    state,
    employee: copy(employeeA),
    ...(pendingData === undefined ? {} : { pendingData: copy(pendingData) }),
    updatedAt: Date.now(),
  };
}

function stateFixture({ initialSession, verifiedEmployee, parsedIntent, modelPost }) {
  const values = new Map();
  const deadlines = new Map();
  let clock = 0;
  function expireKey(key) {
    if (deadlines.has(key) && deadlines.get(key) <= clock) {
      values.delete(key); deadlines.delete(key);
    }
  }
  if (initialSession) values.set(sessionKey, JSON.stringify(initialSession));
  const calls = { verify: [], link: [], balance: [], activeSt: [], submit: [], draft: [], sends: [], nlu: [] };
  class RedisAdapter {
    async get(key) { expireKey(key); return values.has(key) ? values.get(key) : null; }
    async set(key, value, ...options) {
      expireKey(key);
      if (options.includes('NX') && values.has(key)) return null;
      values.set(key, value);
      if (options.includes('EX')) deadlines.set(key, clock + options[options.indexOf('EX')+1]*1000);
      return 'OK';
    }
    async del(...keys) {
      let deleted = 0;
      for (const key of keys) if (values.delete(key)) deleted += 1;
      return deleted;
    }
    async expire(key, seconds) { deadlines.set(key, clock + seconds*1000); return 1; }
    async rpush(key, value) {
      const list = values.get(key) || [];
      list.push(value);
      values.set(key, list);
      return list.length;
    }
    async lrange(key) { expireKey(key); return [...(values.get(key) || [])]; }
    async eval(script, count, key, expected) {
      same(script, "if redis.call('GET', KEYS[1]) == ARGV[1] then return redis.call('DEL', KEYS[1]) else return 0 end",
        'recording adapter models only the explicit single-key compare-delete script');
      same(count, 1, 'atomic consumption uses one key');
      expireKey(key);
      if (values.get(key) !== expected) return 0;
      return values.delete(key) ? 1 : 0;
    }
    async quit() { return 'OK'; }
    disconnect() {}
  }
  class SuperAppAdapter {
    async verifyPhone(phone) {
      calls.verify.push(phone);
      return verifiedEmployee
        ? { success: true, data: copy(verifiedEmployee) }
        : { success: false, message: 'Dummy current phone binding withdrawn' };
    }
    async linkPhone(...args) {
      calls.link.push(args);
      return { success: false, message: 'Dummy no linking proof' };
    }
    async getLeaveBalance(nip) {
      calls.balance.push(nip);
      return {
        success: true,
        data: {
          year: 2026, hak_cuti_n: 12, sisa_cuti_n0: 12,
          sisa_cuti_n1: 0, sisa_cuti_n2: 0, total_tersedia: 12,
          pending_pengajuan: 0, sisa_dapat_diajukan: 12,
        },
      };
    }
    async getActiveSuratTugas(nip) {
      calls.activeSt.push(nip);
      return { success: true, data: { surat_tugas: [] } };
    }
    async submitLeaveRequest(payload) {
      calls.submit.push(copy(payload));
      return { success: true, data: { id: 1, nomor_tiket: 'DUMMY-CT-1', jumlah_hari: 1 } };
    }
    async createDraftSuratTugas(payload) {
      calls.draft.push(copy(payload));
      return { success: true, data: { id: 'DUMMY-ST-1' } };
    }
  }
  class GatewayAdapter {
    async sendMessage(...args) { calls.sends.push(args); return true; }
  }
  class NluAdapter {
    async parseUserMessage(...args) {
      calls.nlu.push(args);
      return copy(parsedIntent);
    }
  }
  const actual = loadActual('conversation/stateMachine.ts', {
    ioredis: RedisAdapter,
    '../superapp/client': { SuperAppClient: SuperAppAdapter },
    '../gateway/evolution': { EvolutionGateway: GatewayAdapter },
    '../nlu/gemini': modelPost ? loadActual('nlu/gemini.ts', { axios: { post: modelPost } }) : { GeminiNluService: NluAdapter },
  });
  const machine = new actual.ConversationStateMachine();
  check(typeof machine.processMessage === 'function',
    'actual compiled private processMessage is invoked without replacing class logic');
  return {
    calls,
    advance(milliseconds) { clock += milliseconds; },
    incoming(text) { return machine.handleIncomingMessage(oldPhone + '@s.whatsapp.net', text); },
    readSession() {
      const raw = values.get(sessionKey);
      return raw ? JSON.parse(raw) : null;
    },
    process(text) {
      return machine.processMessage(oldPhone + '@s.whatsapp.net', oldPhone, text);
    },
  };
}
function noPrivilegedCalls(fixture) {
  same(fixture.calls.balance, [], 'no stale employee balance request');
  same(fixture.calls.activeSt, [], 'no stale employee ST-status request');
  same(fixture.calls.submit, [], 'no stale employee leave submission');
  same(fixture.calls.draft, [], 'no stale employee ST draft');
}
function noPendingA(fixture) {
  const saved = fixture.readSession();
  check(!saved || !saved.pendingData, 'retained pending action is cleared');
  check(!saved || saved.state !== 'AWAITING_LEAVE_CONFIRMATION',
    'retained confirmation state is withdrawn');
  return saved;
}

const balanceIntent = { intent: 'CEK_CUTI', confidence: 1, data: {} };
const confirmIntent = { intent: 'KONFIRMASI_YA', confidence: 1, data: {} };
const draftIntent = {
  intent: 'BUAT_ST_DRAFT', confidence: 1,
  data: {
    nip: employeeB.nip,
    personil_nips: [employeeB.nip],
    maksud_tujuan: 'Dummy draft only',
    tempat_tujuan: 'Dummy Place',
    tanggal_mulai: '2026-11-10',
    tanggal_selesai: '2026-11-10',
    sumber_dana: 'Dummy funding',
  },
};

async function stateChecks() {
  await test('full incoming exact confirmation submits saved payload once and bypasses model HTTP', async () => {
    const fixture = stateFixture({ initialSession: session('AWAITING_LEAVE_CONFIRMATION', pendingA),
      verifiedEmployee: employeeA, modelPost: async () => { throw new Error('Literal YA must use native fast path'); } });
    const timer = global.setTimeout;
    global.setTimeout = (callback, delay, ...args) => delay === 2000
      ? timer(callback, 0, ...args) : timer(callback, delay, ...args);
    try {
      await fixture.incoming('YA');
      same(fixture.calls.submit, [pendingA], 'full entry submits exact previously saved own action');
      noPendingA(fixture);
      await fixture.incoming('YA');
      same(fixture.calls.submit, [pendingA], 'repeat literal confirmation has no pending action to resubmit');
    } finally { global.setTimeout = timer; }
  });
  await test('full incoming entry honors cancellation before deferred interpretation completes', async () => {
    let releaseModel;
    let modelStarted = false;
    const response = new Promise(resolve => { releaseModel = resolve; });
    const timer = global.setTimeout;
    global.setTimeout = (callback, delay, ...args) => delay === 2000
      ? timer(callback, 0, ...args) : timer(callback, delay, ...args);
    try {
      await withEnvironment({ GEMINI_API_KEY: 'dummy-model-adapter-only' }, async () => {
        // Construct NLU after the dummy environment is set.
        const actual = stateFixture({ initialSession: session('AWAITING_LEAVE_CONFIRMATION', pendingA),
          verifiedEmployee: employeeA, modelPost: async () => { modelStarted = true; return response; } });
        const pending = actual.incoming('lanjutkan permohonan tadi');
        for (let i=0; i<20 && !modelStarted; i++) await new Promise(resolve => timer(resolve, 1));
        check(modelStarted, 'actual NLU reached only its deferred recording adapter');
        actual.advance(16000); // fake Redis lease time; no real 16-second sleep or service.
        await actual.incoming('BATAL');
        check(actual.calls.sends.some(call => call[1].includes('telah dibatalkan')), 'cancellation acknowledged first');
        releaseModel({ data: { candidates: [{ content: { parts: [{ text: JSON.stringify(confirmIntent) }] } }] } });
        await pending;
        same(actual.calls.submit, [], 'cancelled pending request is never submitted by older interpretation');
        noPendingA(actual);
      });
    } finally { global.setTimeout = timer; releaseModel({ data: {} }); }
  });
  for (const [label, initialSession, intent, text] of [
    ['balance', session('IDLE', pendingA), balanceIntent, 'cek cuti'],
    ['ST status', session('IDLE', pendingA), { intent: 'STATUS_ST', confidence: 1, data: {} }, 'status surat tugas'],
    ['pending leave confirmation', session('AWAITING_LEAVE_CONFIRMATION', pendingA), confirmIntent, 'YA'],
    ['ST draft', session('IDLE', pendingA), draftIntent, 'buat draf ST dummy'],
  ]) {
    await test('actual state machine withdraws stale ' + label + ' after phone replacement', async () => {
      const fixture = stateFixture({ initialSession, verifiedEmployee: null, parsedIntent: intent });
      await fixture.process(text);
      noPrivilegedCalls(fixture);
      same(fixture.calls.verify, [oldPhone], 'current phone binding is revalidated even with cached employee');
      const saved = noPendingA(fixture);
      check(!saved || !saved.employee, 'invalid phone cannot retain cached employee authority');
      same(fixture.calls.link, [], 'non-NIP message does not attempt a replacement link');
    });
  }

  await test('actual current phone identity retains own balance capability', async () => {
    const fixture = stateFixture({
      initialSession: session('IDLE'), verifiedEmployee: employeeA, parsedIntent: balanceIntent,
    });
    await fixture.process('cek cuti');
    same(fixture.calls.verify, [oldPhone], 'positive control still revalidates current identity');
    same(fixture.calls.balance, [employeeA.nip], 'verified current employee can read own balance');
    same(fixture.calls.submit, [], 'read control creates no leave');
    same(fixture.calls.draft, [], 'read control creates no draft');
    check(fixture.calls.sends.some(args => args[0] === oldPhone + '@s.whatsapp.net'
      && args[1].includes(employeeA.nip)), 'actual formatter replies to current sender with own NIP');
  });

  await test('actual current phone confirmation submits the unchanged saved own leave', async () => {
    const fixture = stateFixture({
      initialSession: session('AWAITING_LEAVE_CONFIRMATION', pendingA),
      verifiedEmployee: employeeA,
      parsedIntent: confirmIntent,
    });
    await fixture.process('YA');
    same(fixture.calls.verify, [oldPhone], 'current confirmation revalidates sender');
    same(fixture.calls.submit, [pendingA], 'valid confirmation submits the exact saved payload');
    noPendingA(fixture);
  });

  await test('actual current phone draft pins personnel to session employee despite foreign model fields', async () => {
    const fixture = stateFixture({
      initialSession: session('IDLE'), verifiedEmployee: employeeA, parsedIntent: draftIntent,
    });
    await fixture.process('buat draf ST dummy');
    same(fixture.calls.verify, [oldPhone], 'draft positive control revalidates sender');
    same(fixture.calls.draft.length, 1, 'current verified employee can create one requested draft');
    same(fixture.calls.draft[0].personil_nips, [employeeA.nip],
      'model-supplied foreign nip/personil cannot expand draft authority');
    same(fixture.calls.submit, [], 'draft creates no leave');
  });

  await test('changed employee identity clears A pending action before interpreting YA as B', async () => {
    const fixture = stateFixture({
      initialSession: session('AWAITING_LEAVE_CONFIRMATION', pendingA),
      verifiedEmployee: employeeB,
      parsedIntent: confirmIntent,
    });
    await fixture.process('YA');
    noPrivilegedCalls(fixture);
    same(fixture.calls.verify, [oldPhone], 'resumed session asks source of truth for current employee');
    const saved = noPendingA(fixture);
    check(!saved || !saved.employee || saved.employee.nip !== employeeA.nip,
      'old A identity is removed from stored session');
  });
}

(async () => {
  const group = process.env.ASSISTANT_TEST_GROUP || 'all';
  assert.ok(['all', 'operator', 'state', 'webhooks'].includes(group), 'Only maintained bounded test groups are allowed');
  if (group === 'operator') {
    await operatorChecks();
    return;
  }
  if (group === 'state') {
    await stateChecks();
    return;
  }
  if (group === 'webhooks') {
    await webhookChecks();
    return;
  }
  await test('gateway constructor requires explicit credential before creating a transport', async () => {
    for (const key of [undefined, 'dummy-gateway-adapter-only']) {
      await withEnvironment({ EVOLUTION_API_KEY: key }, async () => {
        let created = 0;
        const actual = loadActual('gateway/evolution.ts', { axios: { create(options) {
          created += 1;
          same(options.headers.apikey, key, 'transport uses explicit dummy gateway credential');
          return {};
        } } });
        if (key) new actual.EvolutionGateway();
        else assert.throws(() => new actual.EvolutionGateway(), /EVOLUTION_API_KEY must be configured/);
        same(created, key ? 1 : 0, 'missing credential never creates provider transport');
      });
    }
  });
  await webhookChecks();
  await operatorChecks();
  await stateChecks();
})().catch(error => {
  results.push({ name: 'harness', status: 'failed', error: String(error.message || error).slice(0, 1600) });
}).finally(async () => {
  for (const server of [...servers]) {
    try { await closeServer(server); }
    catch (error) {
      results.push({ name: 'server cleanup', status: 'failed', error: String(error.message || error).slice(0, 800) });
    }
  }
  const failed = results.filter(result => result.status === 'failed').length;
  process.stdout.write(JSON.stringify({
    harness: 'assistant-boundary-check',
    source: 'actual TypeScript transpiled in memory',
    transport: 'actual Express/native HTTP loopback only',
    external_services: 'all mocked; no Gemini/Evolution/SuperApp/Redis/provider connections',
    tests: results.length,
    assertions,
    failed,
    results,
  }, null, 2) + '\n');
  process.exitCode = failed ? 1 : 0;
});
