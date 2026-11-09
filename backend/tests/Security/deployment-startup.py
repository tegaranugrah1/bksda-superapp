"""Parse startup commands without running migrations or touching a database."""
from pathlib import Path
import json,re,shlex,subprocess

dockerfile=Path('/deployment/Dockerfile').read_text()
compose=Path('/deployment/docker-compose.dokploy.yml').read_text()
standalone=json.loads(next(line[4:] for line in dockerfile.splitlines() if line.startswith('CMD ')))
backend=next(line.strip() for line in compose.splitlines() if line.strip().startswith('sh -c '))
commands=[standalone,shlex.split(backend)]
for argv in commands:
    assert argv[:2]==['sh','-c']
    command=argv[2]
    assert 'db:seed' not in command, 'Redeploy must not reset existing account credentials through a seeder.'
    assert 'migrate --force' in command
    subprocess.run(['sh','-n','-c',command],check=True)
assert 'migrate --force &&' in commands[1][2] and 'exec php-fpm -F' in commands[1][2]
assert 'migrate --force || exit 1' in commands[0][2]
prefixes={}
for line in compose.splitlines():
    match=re.fullmatch(r'  ([a-z][a-z0-9-]*):',line)
    if match:service=match[1]
    if line.strip().startswith('CACHE_PREFIX:'):prefixes[service]=line.split(':',1)[1].strip()
assert set(prefixes)=={'backend','queue','scheduler','reverb'}
assert set(prefixes.values())=={'${CACHE_PREFIX:-bksda-superapp-cache-}'}, 'Queue heartbeat and locks must share the existing backend cache namespace.'
print('PASS: startup parses, avoids account reseeding, stops on migration failure, and shares the backend cache namespace across all runtime services.')
