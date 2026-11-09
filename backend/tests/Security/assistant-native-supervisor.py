"""Source-only proposal; adapted from fixtures/e2e-supervisor.py (no frontend)."""
from pathlib import Path
import json, os, sqlite3, subprocess, sys, time, urllib.request

scratch = Path('/scratch')
child = stream = None
result = 2
for name in ['bootstrap', 'storage/framework/sessions', 'storage/framework/views', 'storage/framework/cache', 'storage/logs']:
    (scratch / name).mkdir(parents=True, exist_ok=True)
assert os.environ['APP_ENV'] == 'audit'
assert os.environ['DB_DATABASE'] == '/scratch/e2e.sqlite'
(scratch / 'e2e.sqlite').touch(exist_ok=False)

def run(args):
    done = subprocess.run(args, capture_output=True, text=True, timeout=60)
    print(done.stdout[-3000:], flush=True)
    if done.returncode:
        raise RuntimeError('Setup failed: ' + done.stderr[-1200:])

def counts():
    with sqlite3.connect('file:/scratch/e2e.sqlite?mode=ro', uri=True) as db:
        return {table: db.execute('SELECT COUNT(*) FROM ' + table).fetchone()[0]
                for table in ['kpg_employee_leave_requests', 'st_assignment_letters']}

try:
    run(['php', '/app/artisan', 'migrate', '--force', '--no-interaction'])
    run(['php', '/app/tests/Security/assistant-native-seed.php'])
    before = counts()
    assert all(value == 0 for value in before.values()), 'Fresh dummy database required'
    stream = (scratch / 'backend.log').open('w')
    child = subprocess.Popen(['php', '-S', '127.0.0.1:18080', '-t', '/app/public',
        '/app/vendor/laravel/framework/src/Illuminate/Foundation/resources/server.php'],
        cwd='/app/public', stdout=stream, stderr=subprocess.STDOUT)
    deadline = time.monotonic() + 15
    while True:
        try:
            with urllib.request.urlopen('http://127.0.0.1:18080/api/health', timeout=2) as response:
                if response.status == 200:
                    break
        except Exception:
            if child.poll() is not None or time.monotonic() >= deadline:
                raise RuntimeError('Native PHP listener failed readiness')
            time.sleep(.2)
    done = subprocess.run(['node', '/assistant/tests/native-boundary.cjs'], capture_output=True, text=True, timeout=55)
    print(done.stdout[-24000:], flush=True)
    print(done.stderr[-2000:], flush=True)
    result = done.returncode
    after = counts()
    assert after == before, 'Fixture must create no leave requests or ST records'
    (scratch / 'results.json').write_text(json.dumps({'suite': 'assistant-native',
        'exit_code': result, 'record_counts_before': before, 'record_counts_after': after,
        'composition': 'actual compiled stateMachine+SuperAppClient+native Axios+native PHP+dummySQLite',
        'adapters': ['Map Redis', 'deterministic NLU', 'recording gateway'],
        'external_network': False}), encoding='utf-8')
except Exception as error:
    result = 2
    print('Native fixture error: ' + str(error), flush=True)
finally:
    if child is not None:
        child.terminate()
        try:
            child.wait(timeout=3)
        except subprocess.TimeoutExpired:
            child.kill()
            child.wait(timeout=3)
    if stream is not None:
        stream.close()
sys.exit(result)
