"""Parse startup commands without running migrations or touching a database."""
from pathlib import Path
import json,shlex,subprocess

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
print('PASS: both deployment startup commands parse, avoid account reseeding, and stop on migration failure.')
