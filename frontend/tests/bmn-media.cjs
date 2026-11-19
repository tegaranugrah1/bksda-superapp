/* Standalone dummy-only browser regression. Run in the documented network-isolated sandbox. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const ts = require('typescript');
const { chromium } = require('playwright');

async function main() {
  const requests = [];
  let slowReceivedResolve, slowClosedResolve;
  const slowReceived = new Promise(resolve => { slowReceivedResolve = resolve; });
  const slowClosed = new Promise(resolve => { slowClosedResolve = resolve; });
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6l5sAAAAASUVORK5CYII=', 'base64');
  const server = http.createServer((req, res) => {
    if (!req.url.startsWith('/api/')) { res.setHeader('Content-Type', 'text/html'); res.end('<div id="root"></div>'); return; }
    requests.push({ url: req.url, auth: req.headers.authorization });
    if (req.headers.authorization !== 'Bearer dummy-fixture' || req.url.includes('/forbidden/')) { res.writeHead(403); res.end(); return; }
    const type = req.url.includes('/html/') ? 'text/html' : req.url.includes('/document/bpkb/view') ? 'application/pdf' : 'image/png';
    const respond = () => {
      res.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'private, no-store' });
      res.end(type === 'image/png' ? png : type === 'text/html' ? '<script>throw Error("must not execute")</script>' : '%PDF-1.4\nDUMMY\n%%EOF');
    };
    if (req.url.includes('/slow/')) {
      slowReceivedResolve();
      const timer = setTimeout(respond, 800);
      res.on('close', () => { clearTimeout(timer); slowClosedResolve(!res.writableEnded); });
    } else if (req.url.includes('/bulk-')) setTimeout(respond, 80);
    else respond();
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser;
  try {
    const origin = `http://127.0.0.1:${server.address().port}`;
    // Bundle only the installed React runtime and the actual two target modules; no app server or live accounts.
    const runtime = (name, basename) => {
      const directory = path.join(path.dirname(require.resolve('next/package.json')), 'dist/compiled', name);
      const filename = [basename + '.production.js', basename + '.production.min.js'].map(file => path.join(directory, 'cjs', file)).find(file => fs.existsSync(file));
      return filename ? fs.readFileSync(filename, 'utf8') : "module.exports=require('react-dom');";
    };
    const modules = {
      react: runtime('react', 'react'),
      'react/jsx-runtime': runtime('react', 'react-jsx-runtime'),
      'react-dom': runtime('react-dom', 'react-dom'),
      'react-dom/client': runtime('react-dom', 'react-dom-client'),
      scheduler: runtime('scheduler', 'scheduler'),
    };
    for (const [name, file] of [['@/lib/bmn-media', 'lib/bmn-media.ts'], ['image', 'components/BmnMediaImage.tsx']]) {
      modules[name] = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src', file), 'utf8'), { compilerOptions: {
        module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2020,
      } }).outputText;
    }
    const bundle = `const process={env:{NODE_ENV:'production'}};const factories={${Object.entries(modules).map(([id, code]) => `${JSON.stringify(id)}:function(module,exports,require){${code}\n}`).join(',')}};
      const cache={};const listeners=new Set();let session='dummy-session';
      window.bulkStarts=0;window.slowAborted=false;const api={defaults:{baseURL:location.origin+'/api'},async get(url,config){if(url.includes('/bulk-'))window.bulkStarts++;if(url.includes('/slow/'))config?.signal?.addEventListener('abort',()=>{window.slowAborted=true},{once:true});const r=await fetch(url,{headers:{Authorization:'Bearer dummy-fixture'},signal:config?.signal});if(!r.ok)throw Error('HTTP '+r.status);return {data:await r.blob()}}};
      cache['@/lib/api']={exports:{__esModule:true,default:api,getApiSessionSnapshot:()=>session}};
      cache['@/lib/auth-store']={exports:{authStore:{subscribe:fn=>{listeners.add(fn);return ()=>listeners.delete(fn)}}}};
      function require(id){id=({'next/dist/compiled/react':'react','next/dist/compiled/react-dom':'react-dom','next/dist/compiled/scheduler':'scheduler'})[id]||id;if(cache[id])return cache[id].exports;const m=cache[id]={exports:{}};if(!factories[id])throw Error('Unexpected module '+id);factories[id](m,m.exports,require);return m.exports;}
      const React=require('react'),root=require('react-dom/client').createRoot(document.getElementById('root'));
      const Image=require('image').BmnMediaImage;window.media=require('@/lib/bmn-media');window.errors=0;window.revoked=[];
      const revoke=URL.revokeObjectURL.bind(URL);URL.revokeObjectURL=url=>{window.revoked.push(url);revoke(url)};
      window.renderPhoto=src=>root.render(React.createElement(Image,{src,alt:'Dummy asset',className:'original-photo',style:{width:120,height:80,borderRadius:12},referrerPolicy:'no-referrer',onError:()=>window.errors++}));
      window.renderGrid=()=>root.render(React.createElement('div',{style:{display:'grid',gridTemplateColumns:'repeat(6,120px)',gap:12}},...Array.from({length:100},(_,i)=>React.createElement(Image,{key:i,src:'/api/bmn/assets/bulk-'+i+'/photo/depan/view',alt:'Dummy '+i,loading:'lazy',style:{width:120,height:180},'data-index':i}))));window.changeSession=()=>{session+='-new';listeners.forEach(fn=>fn())};window.unmount=()=>root.unmount();`;
    browser = await chromium.launch({ executablePath: '/usr/bin/chromium', headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
    const page = await browser.newPage();
    await page.goto(origin); await page.addScriptTag({ content: bundle });
    const photo = '/api/bmn/assets/17/photo/depan/view?v=9';
    // A direct img without a cookie/header reproduces the original failure.
    assert.equal(await page.evaluate(async url => (await fetch(url)).status, photo), 403);
    await page.evaluate(url => window.renderPhoto(url + '&%74oken=legacy'), photo);
    await page.waitForFunction(() => { const img = document.querySelector('img'); return img?.src.startsWith('blob:') && img.naturalWidth === 1; });
    assert.deepEqual(await page.locator('img').evaluate(el => ({className:el.className,width:el.style.width,height:el.style.height,radius:el.style.borderRadius,referrer:el.referrerPolicy})), {className:'original-photo',width:'120px',height:'80px',radius:'12px',referrer:'no-referrer'});
    assert(requests.some(req => req.url === photo && req.auth === 'Bearer dummy-fixture'));
    assert(requests.every(req => !/token/i.test(req.url)));
    const oldBlob = await page.locator('img').getAttribute('src');
    await page.evaluate(() => window.changeSession());
    await page.waitForFunction(old => document.querySelector('img')?.src.startsWith('blob:') && document.querySelector('img').src !== old, oldBlob);
    assert(await page.evaluate(old => window.revoked.includes(old), oldBlob));
    for (const url of ['/api/bmn/assets/17/document/stnk/preview/2?v=9', '/api/bmn/power-of-attorneys/17/ktp']) {
      const previous = await page.locator('img').getAttribute('src');
      await page.evaluate(url => window.renderPhoto(url), url);
      await page.waitForFunction(previous => document.querySelector('img')?.naturalWidth === 1 && document.querySelector('img').src !== previous, previous);
    }
    for (const url of ['/api/bmn/assets/forbidden/photo/depan/view', '/api/bmn/assets/html/photo/depan/view']) {
      const count = await page.evaluate(() => window.errors);
      await page.evaluate(url => window.renderPhoto(url), url);
      await page.waitForFunction(count => window.errors > count, count);
      assert.equal(await page.locator('img').getAttribute('src'), null);
    }
    assert.deepEqual(await page.evaluate(() => [
      window.media.getBmnMediaUrl('https://external.test/api/bmn/assets/17/photo/depan/view'),
      window.media.getBmnMediaUrl('/api/me'),
      window.media.getBmnMediaUrl('https://user:pass@'+location.host+'/api/bmn/power-of-attorneys/17/ktp'),
    ]), [null,null,null]);
    assert.equal(await page.evaluate(async () => (await window.media.fetchBmnMedia('/api/bmn/assets/17/document/bpkb/view?token=legacy')).type), 'application/pdf');
    const opened = await page.evaluate(async () => {
      const calls=[]; let closed=false;
      window.open=(url)=>{calls.push(url);return {opener:window,location:{replace:url=>calls.push(url)},close:()=>{closed=true}}};
      await window.media.openBmnMedia('/api/bmn/assets/17/document/bpkb/view?token=legacy');
      try { await window.media.openBmnMedia('/api/bmn/assets/forbidden/document/bpkb/view'); } catch {}
      let download;
      HTMLAnchorElement.prototype.click=function(){download={href:this.href,name:this.download}};
      await window.media.openBmnMedia('/api/bmn/assets/17/document/bpkb/download?token=legacy','BMN.pdf');
      return {calls,closed,download};
    });
    assert.equal(opened.calls[0],'about:blank'); assert(opened.calls[1].startsWith('blob:'));
    assert.equal(opened.closed,true); assert(opened.download.href.startsWith('blob:')); assert.equal(opened.download.name,'BMN.pdf');
    assert(requests.every(req => !/token/i.test(req.url)));
    await page.evaluate(() => window.renderGrid());
    await page.waitForFunction(() => document.querySelectorAll('img[data-index][src^="blob:"]').length >= 6);
    const initialCount = await page.evaluate(() => window.bulkStarts);
    assert(initialCount > 0 && initialCount <= 36, `100-card list must defer off-screen API fetches, got ${initialCount}`);
    assert(await page.locator('img[data-index="99"]').getAttribute('src') === null);
    assert.equal(await page.locator('img[data-index="99"]').getAttribute('alt'), '');
    assert.equal(await page.locator('img[data-index="99"]').getAttribute('aria-busy'), 'true');
    await page.evaluate(() => window.scrollTo(0,document.body.scrollHeight));
    await page.waitForFunction(() => document.querySelector('img[data-index="99"]')?.src.startsWith('blob:'));
    assert(await page.evaluate(() => window.bulkStarts) < 100, 'Jumping to the bottom must keep unseen middle cards deferred');
    await page.evaluate(() => window.renderPhoto('/api/bmn/assets/slow/photo/depan/view'));
    await slowReceived;
    const previousErrors = await page.evaluate(() => window.errors);
    await page.evaluate(() => window.unmount());
    await page.waitForFunction(() => window.slowAborted);
    assert(await slowClosed, 'Leaving the view must abort the in-flight binary request');
    assert.equal(await page.evaluate(() => window.errors),previousErrors,'Aborted views must not report a photo failure');
    console.log('PASS: browser reproduces raw-image 403; protected photo/preview/KTP load as blobs; original img styles, header-only credentials, token cleanup, session cleanup, 403/HTML fallback, origin guards, PDF fetch/open/download, React 19 callbacks, 100-card viewport loading and request cancellation.');
  } finally { if (browser) await browser.close(); await new Promise(resolve => server.close(resolve)); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
