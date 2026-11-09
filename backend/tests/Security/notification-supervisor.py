from pathlib import Path
import json,os,shutil,socket,subprocess,sys,threading,time,urllib.request

s=Path('/scratch');children={};handles=[];stop=threading.Event();result=2
assert os.environ.get('APP_ENV')=='audit' and os.environ.get('DB_DATABASE')=='/scratch/e2e.sqlite'
for name in ['bootstrap','storage/framework/sessions','storage/framework/views','storage/framework/cache','storage/logs']:(s/name).mkdir(parents=True,exist_ok=True)
(s/'e2e.sqlite').touch()
def run(args,timeout=65):
    done=subprocess.run(args,capture_output=True,text=True,timeout=timeout)
    print(done.stdout[-2000:],flush=True)
    if done.returncode:raise RuntimeError('Setup failed:'+done.stderr[-2000:])
def start(name,args,cwd='/app'):
    log=(s/(name+'.log')).open('a');handles.append(log)
    p=subprocess.Popen(args,cwd=cwd,stdout=log,stderr=subprocess.STDOUT);children[name]=p;return p
def ready(url,seconds):
    end=time.monotonic()+seconds
    while time.monotonic()<end:
        try:
            with urllib.request.urlopen(url,timeout=4) as response:
                if response.status==200:return
        except Exception:pass
        time.sleep(.2)
    raise RuntimeError('Loopback fixture readiness failed:'+url)
def start_reverb():
    start('reverb',['php','artisan','reverb:start','--host=127.0.0.1','--port=18081','--no-interaction'])
    end=time.monotonic()+12
    while time.monotonic()<end:
        try:
            with socket.create_connection(('127.0.0.1',18081),timeout=.2):return
        except OSError:time.sleep(.1)
    raise RuntimeError('Native Reverb did not listen')
def controls():
    while not stop.wait(.05):
        for service in ['reverb','worker']:
            for action in ['stop','start']:
                marker=s/(service+'.'+action)
                if not marker.exists():continue
                marker.unlink()
                try:
                    if action=='stop':
                        p=children.get(service)
                        if p and p.poll() is None:p.terminate();p.wait(timeout=5)
                    elif service=='reverb':start_reverb()
                    else:start('worker',['php','artisan','queue:work','--sleep=1','--tries=1','--timeout=10','--no-interaction'])
                    (s/(service+'.'+action+'.done')).write_text('done')
                except Exception:(s/(service+'.control.error')).write_text('fixture control failed')
try:
    run(['php','/app/artisan','migrate','--force','--no-interaction'])
    run(['php','/fixtures/seed-e2e.php'])
    start('backend',['php','-S','127.0.0.1:18080','-t','/app/public','/app/vendor/laravel/framework/src/Illuminate/Foundation/resources/server.php'],'/app/public')
    start_reverb()
    start('proxy',['node','/fixtures/notification-proxy.cjs'])
    ready('http://localhost:14000/api/health',15)
    thread=threading.Thread(target=controls,daemon=True);thread.start()
    script=os.environ['ST_E2E_SCRIPT'];assert script in ['notification-transport.cjs','notification-flow.actual-app.cjs']
    if script=='notification-flow.actual-app.cjs':
        shutil.copytree('/frontend',s/'frontend',ignore=shutil.ignore_patterns('node_modules','.next'))
        config=s/'frontend/next.config.ts';text=config.read_text();assert text.count('return config;')==1
        config.write_text(text.replace('return config;','config.cache = false; return config;'))
        (s/'frontend/node_modules').symlink_to('/frontend/node_modules',target_is_directory=True)
        start('frontend',['node','/frontend/node_modules/next/dist/bin/next','dev','/scratch/frontend','--hostname','127.0.0.1','--port','13000','--webpack'],'/scratch/frontend')
        start('worker',['php','artisan','queue:work','--sleep=1','--tries=1','--timeout=10','--no-interaction'])
        ready('http://localhost:14000/login',140)
    done=subprocess.run(['node','/fixtures/'+script],capture_output=True,text=True,timeout=390)
    print(done.stdout[-42000:],flush=True);print(done.stderr[-2500:],flush=True);result=done.returncode
    (s/'results.json').write_text(json.dumps({'suite':script,'exit_code':result,'actual_stack':'Laravel+databasequeue+nativeReverb+loopbackproxy+Chromium;Next/UI only in browserflow','network':'none'}))
except Exception as e:print('Notification fixture:'+str(e),flush=True)
finally:
    stop.set()
    if 'thread' in globals():thread.join(timeout=15)
    for p in list(children.values()):
        if p.poll() is None:p.terminate()
    for p in list(children.values()):
        try:p.wait(timeout=4)
        except subprocess.TimeoutExpired:p.kill();p.wait()
    for h in handles:h.close()
    if result:
        for name in children:
            p=s/(name+'.log')
            if p.exists():print('SERVICE '+name+'\n'+p.read_text(errors='replace')[-4500:],flush=True)
sys.exit(result)
