'use strict';

// Run only in the network-none audit container; real React/Chromium, dummy API.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { spawn } = require('node:child_process');
const { createRequire } = require('node:module');
const root = path.resolve(__dirname, '..');
const fromFrontend = createRequire(path.join(root, 'package.json'));
const ts = fromFrontend('typescript');

class CdpClient {
  constructor(url) {
    this.ws = new WebSocket(url);
    this.next = 0;
    this.pending = new Map();
    this.errors = [];
    this.ws.addEventListener('message', event => {
      const message = JSON.parse(String(event.data));
      if (message.method === 'Runtime.exceptionThrown') this.errors.push(message.params.exceptionDetails.text + ' ' + (message.params.exceptionDetails.exception?.description ?? ''));
      const entry = this.pending.get(message.id);
      if (entry) {
        this.pending.delete(message.id);
        clearTimeout(entry.timer);
        if (message.error) entry.reject(new Error(JSON.stringify(message.error)));
        else entry.resolve(message.result);
      }
    });
  }
  async ready() {
    await new Promise((resolve, reject) => {
      this.ws.addEventListener('open', resolve, { once: true });
      this.ws.addEventListener('error', reject, { once: true });
    });
  }
  call(method, params = {}) {
    const id = ++this.next;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('CDP timeout: ' + method)), 5000);
      this.pending.set(id, { resolve, reject, timer });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }
  async evaluate(expression) {
    const value = await this.call('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    assert(!value.exceptionDetails, JSON.stringify(value.exceptionDetails));
    return value.result.value;
  }
}

const modules = [];
const ids = new Map();
function bundle(file) {
  if (ids.has(file)) return ids.get(file);
  const id = modules.length;
  ids.set(file, id);
  modules.push('');
  let code = fs.readFileSync(file, 'utf8');
  if (/\.tsx?$/.test(file)) code = ts.transpileModule(code, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
  }).outputText;
  code = code.replace(/require\(["']([^"']+)["']\)/g, (_, spec) => {
    if (Object.hasOwn(stubs, spec)) return `__r(${stub(spec)})`;
    let dependency;
    if (spec.startsWith('@/')) {
      const base = path.join(root, 'src', spec.slice(2));
      dependency = ['.ts', '.tsx', '.js'].map(ext => base + ext).find(p => fs.existsSync(p));
      assert(dependency, spec);
    } else dependency = createRequire(file).resolve(spec);
    return `__r(${bundle(dependency)})`;
  });
  modules[id] = `function(module,exports,__r){${code}\n}`;
  return id;
}
const stubs = {
  'next/navigation': `const router={replace:u=>window.__navigations.push(u),push:u=>window.__navigations.push(u)};exports.useParams=()=>({id:'dummy-letter'});exports.usePathname=()=>'/portal/surat-tugas/dummy-letter';exports.useRouter=()=>router;`,
  'next/link': `exports.__esModule=true;exports.default=({children,...props})=>__r(REACT_ID).createElement('a',props,children);`,
  'lucide-react': `module.exports=new Proxy({}, {get:()=>()=>null});`,
  'sonner': `exports.toast={error:()=>{},info:()=>{}};`,
  '@/lib/letter-utils': `exports.formatNIP=String;exports.formatDateRangeIndonesian=()=> 'Dummy date';`,
  '@/lib/api': `exports.clearGetCache=()=>{};exports.api={get:async()=>{const snap=window.authStore.getSnapshot();const u=JSON.parse(snap.substring(snap.indexOf('\\n')+1));window.__apiUsers.push(u?.id??'missing');if(u?.id==='b')throw {response:{data:{message:'Dummy B has no access'}}};if(!u)throw Error('No dummy user');return {data:{data:{id:'dummy-letter',nomor_surat:'DUMMY-A-PRIVATE',maksud_tujuan:'CONFIDENTIAL DUMMY A',tanggal_mulai:'2026-11-02',tanggal_selesai:'2026-11-02',status:'approved',employees:[],dasar:[],menimbang:['<img data-portal-audit src="dummy-missing" onerror="window.__auditMarkupExecuted=true">']}}}}};`,
};
function stub(spec) {
  const key = 'stub:' + spec;
  if (ids.has(key)) return ids.get(key);
  const id = modules.length;
  ids.set(key, id);
  modules.push(`function(module,exports,__r){${stubs[spec].replaceAll('REACT_ID', react)}}`);
  return id;
}
const react = bundle(fromFrontend.resolve('react'));
const dom = bundle(fromFrontend.resolve('react-dom/client'));
const auth = bundle(path.join(root, 'src/lib/auth-store.ts'));
const sync = bundle(path.join(root, 'src/components/AuthSync.tsx'));
const pageModule = bundle(path.join(root, 'src/app/portal/surat-tugas/[id]/page.tsx'));
const bootstrap = `const process={env:{NODE_ENV:'production'}};const M=[${modules.join(',')}],C={};function __r(id){if(!C[id]){C[id]={exports:{}};M[id](C[id],C[id].exports,__r)}return C[id].exports;}window.__navigations=[];window.__apiUsers=[];const React=__r(${react});window.authStore=__r(${auth}).authStore;const user=id=>({id,username:id,email:id+'@example.test',name:'Dummy '+id,role:'user',access_modules:[]});window.login=id=>authStore.login('dummy-'+id,user(id));if(!location.pathname.startsWith('/controller')){window.login('a');__r(${dom}).createRoot(document.getElementById('root')).render(React.createElement(React.Fragment,null,React.createElement(__r(${sync}).AuthSync),React.createElement(__r(${pageModule}).default)));}`;

(async () => {
  const server = http.createServer((req, res) => {
    res.setHeader('Content-Type', req.url === '/app.js' ? 'application/javascript' : 'text/html');
    res.end(req.url === '/app.js' ? bootstrap : '<!doctype html><div id="root"></div><script src="/app.js"></script>');
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser, client, controller;
  let browserError = '';
  const result = { interface: 'Actual ST detail TSX, RouteGuard, useAuth, authStore and React in native Chromium; Next router and API are dummy fixtures', external_network: false };
  try {
    browser = spawn('/usr/bin/chromium', ['--headless=new', '--no-sandbox', '--disable-dev-shm-usage',
      '--disable-gpu', '--disable-background-networking', '--disable-component-update', '--no-first-run',
      '--no-default-browser-check', '--password-store=basic', '--use-mock-keychain', '--user-data-dir=/scratch/chromium',
      '--disk-cache-dir=/scratch/chromium-cache',
      '--remote-debugging-address=127.0.0.1', '--remote-debugging-port=19223', 'about:blank'], { stdio: ['ignore', 'ignore', 'pipe'] });
    browser.stderr.on('data', data => { browserError = (browserError + data.toString()).slice(-2000); });
    let targets;
    const deadline = Date.now() + 10000;
    while (Date.now() < deadline) {
      try { targets = await (await fetch('http://127.0.0.1:19223/json')).json(); break; } catch {}
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    assert(targets, 'Chromium CDP did not start: ' + browserError);
    const initialTarget = targets.find(t => t.type === 'page');
    client = new CdpClient(initialTarget.webSocketDebuggerUrl);
    await client.ready();
    await client.call('Runtime.enable');
    await client.call('Page.navigate', { url: `http://127.0.0.1:${server.address().port}/portal/surat-tugas/dummy-letter` });
    let visible = false;
    while (Date.now() < deadline) {
      visible = await client.evaluate("document.body?.textContent.includes('CONFIDENTIAL DUMMY A')");
      if (visible) break;
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    assert(visible, 'Dummy A page never rendered');
    result.initial_a_visible = true;
    const inert = "!window.__auditMarkupExecuted && !document.querySelector('img[data-portal-audit]') && document.body.textContent.includes('data-portal-audit')";
    result.literal_markup_inert = await client.evaluate(inert);
    assert.equal(result.literal_markup_inert, true, 'Stored dummy markup must render as text');
    await client.call('Emulation.setEmulatedMedia', { media: 'print' });
    result.print_markup_inert = await client.evaluate(inert);
    assert.equal(result.print_markup_inert, true, 'Print media must preserve inert text');
    await client.call('Emulation.setEmulatedMedia', { media: '' });
    // Freeze the background tab while another same-origin tab changes identity.
    await client.call('Page.setWebLifecycleState', { state: 'frozen' });
    const target = await client.call('Target.createTarget', { url: `http://127.0.0.1:${server.address().port}/controller` });
    const list = await (await fetch('http://127.0.0.1:19223/json')).json();
    controller = new CdpClient(list.find(t => t.id === target.targetId).webSocketDebuggerUrl);
    await controller.ready();
    const controllerDeadline = Date.now() + 5000;
    while (Date.now() < controllerDeadline) {
      if (await controller.evaluate("typeof window.login === 'function'")) break;
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    await controller.evaluate("window.authStore.logout(); window.login('b'); true");
    await client.call('Page.setWebLifecycleState', { state: 'active' });
    await client.call('Target.activateTarget', { targetId: initialTarget.id });
    await client.evaluate("window.dispatchEvent(new Event('focus')); true");
    const switchDeadline = Date.now() + 5000;
    do {
      result.after_switch = await client.evaluate(`({
        user: JSON.parse(localStorage.getItem('bksda_user')).id,
        a_visible: document.body.textContent.includes('CONFIDENTIAL DUMMY A'),
        api_users: window.__apiUsers,
        navigations: window.__navigations,
        body: document.body.textContent.slice(0, 350),
        visibility: document.visibilityState,
      })`);
      if (result.after_switch.api_users.includes('b')) break;
      await new Promise(resolve => setTimeout(resolve, 50));
    } while (Date.now() < switchDeadline);
    result.errors = client.errors;
    fs.writeFileSync('/scratch/results.json', JSON.stringify(result, null, 2));
    assert.equal(result.after_switch.user, 'b');
    assert.equal(result.after_switch.a_visible, false, 'Private A letter remained visible after B became current');
    assert(result.after_switch.api_users.includes('b'), 'New identity did not fetch its own authorization result');
    console.log('PASS: actual letter page clears completed private state and reauthorizes on account switch.');
  } finally {
    console.log(JSON.stringify(result));
    if (client) client.ws.close();
    if (controller) controller.ws.close();
    if (browser && browser.exitCode === null && browser.signalCode === null) {
      const exited = new Promise(resolve => browser.once('exit', resolve));
      browser.kill('SIGTERM');
      await exited;
    }
    await new Promise(resolve => server.close(resolve));
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
