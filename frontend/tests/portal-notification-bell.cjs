'use strict';
// Actual TypeScript callbacks/effect with controlled HTTP, clock and visibility.
// This is not React rendering, real browser visibility, or network delivery proof.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const root = process.env.PORTAL_NOTIFICATION_SOURCE_ROOT || '/frontend/src';
const text = fs.readFileSync(root+'/app/portal/_components/NotificationBell.tsx', 'utf8');
const file = ts.createSourceFile('bell.tsx', text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const found = {};
let visibility;
function visit(node) {
  if (ts.isVariableDeclaration(node) && ['fetchLatest','fetchHistory','handleMarkAsRead','handleCreated'].includes(node.name.getText(file))) {
    const init = node.initializer;
    found[node.name.getText(file)] = ts.isCallExpression(init) ? init.arguments[0] : init;
  }
  if (ts.isCallExpression(node) && node.expression.getText(file)==='useEffect' && node.arguments[0]?.getText(file).includes('visibilitychange')) visibility=node.arguments[0];
  ts.forEachChild(node, visit);
}
visit(file);
assert.equal(Object.keys(found).length, 4);assert(visibility);
const declarations=Object.entries(found).map(([name,node])=>`globalThis.${name}=(${node.getText(file)});`).join('\n')+`\nglobalThis.visibilityEffect=(${visibility.getText(file)});`;
const source=ts.transpileModule(declarations,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None}}).outputText;
function setup() {
  const item={id:17,title:'Dummy',message:'Dummy private body',type:'surat_tugas',read_at:null,reference_id:'dummy',action_tab:'surat_tugas'};
  const state={items:[item],history:[],unread:1,toasts:0,changed:0,requests:[],postError:false,interval:null,listeners:{},cleared:false};
  const setter=key=>value=>{state[key]=typeof value==='function'?value(state[key]):value;};
  const context={
    api:{get:()=>new Promise((resolve,reject)=>state.requests.push({resolve,reject})),post:async()=>{if(state.postError)throw Error('controlled HTTP500');return{data:{unread_count:0}};}},
    clearGetCache(){},
    isMountedRef:{current:true},latestRequestRef:{current:0},historyRequestRef:{current:0},seenIdsRef:{current:new Set()},initializedRef:{current:false},
    historyCacheRef:{current:{}},historyStateRef:{current:{open:false,page:1,filter:'all'}},
    notificationHandlerRef:{current:()=>state.changed++},refreshHandlerRef:{current:()=>{}},
    setNotifications:setter('items'),setHistoryItems:setter('history'),setUnreadCount:setter('unread'),
    setLoading(){},setHistoryLoading(){},setHistoryTotal(){},setHistoryTotalPages(){},setHistoryPage(){},
    onSelectTab(){},document:{visibilityState:'visible',addEventListener:(name,fn)=>{state.listeners[name]=fn;},removeEventListener:name=>{delete state.listeners[name];}},
    setInterval:fn=>{state.interval=fn;return 1;},clearInterval:()=>{state.cleared=true;},
    toast:Object.assign(()=>state.toasts++,{error:()=>{}}),
  };
  vm.createContext(context);vm.runInContext(source,context,{timeout:1000});
  return{state,context,item};
}
const response=(items,unread=1)=>({data:{data:items,meta:{unread_count:unread,current_page:1,last_page:1,total:items.length}}});
const tick=()=>new Promise(resolve=>setImmediate(resolve));
(async()=>{
  let {state,context,item}=setup();
  context.handleCreated(item);context.handleCreated(item);
  for(const r of state.requests)r.resolve(response([item]));await tick();
  assert.equal(state.items.length,1);assert.equal(state.unread,1);assert.equal(state.toasts,1);
  console.log('PASS PN01: actual duplicate event callback preserves authoritative count and one toast/item');

  ({state,context,item}=setup());state.postError=true;
  await context.handleMarkAsRead(item);
  assert.equal(state.requests.length,1);
  state.requests[0].resolve(response([item],1));await tick();
  assert.equal(state.unread,1);assert.equal(state.items[0].read_at,null);
  console.log('PASS PN02: actual optimistic read failure restores authoritative unread and read state');

  ({state,context,item}=setup());
  const older=context.fetchHistory(1,'unread');const newer=context.fetchHistory(1,'read');
  state.requests[1].resolve(response([{...item,read_at:'2026-11-09T00:00:00Z'}],0));await newer;
  state.requests[0].resolve(response([item],1));await older;
  assert(state.history.every(n=>n.read_at!==null));
  console.log('PASS PN02: late previous-filter history response cannot replace current read-filter data');

  ({state,context,item}=setup());
  const cleanup=context.visibilityEffect();state.requests.shift().resolve(response([] ,0));await tick();
  context.document.visibilityState='hidden';state.interval();assert.equal(state.requests.length,0);
  context.document.visibilityState='visible';state.listeners.visibilitychange();
  assert.equal(state.requests.length,1);state.requests[0].resolve(response([item],1));await tick();
  assert.equal(state.unread,1);assert.equal(state.items[0].id,item.id);
  cleanup();assert.equal(state.cleared,true);assert.equal(state.listeners.visibilitychange,undefined);
  console.log('PASS PN03: actual visibility/poll effect skips hidden polls,catches up on visible and cleans listeners');
  console.log(JSON.stringify({cases:4,failed:0,interface:'actual TS callbacks/effect;controlled HTTP/time/visibility;no DOM/network claim'}));
})().catch(error=>{console.error(error.message);process.exitCode=1;});
