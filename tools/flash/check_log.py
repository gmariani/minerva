"""Checks Flash Player's trace log (flashlog.txt) from a run of both test SWFs. Exits 1 if anything failed.

Usage: python3 check_log.py <flashlog.txt>...
"""
import sys

from make_as2_swf import EXPECTED

lines = []
for path in sys.argv[1:]:
    with open(path, encoding='utf-8', errors='replace') as f:
        lines += [line.strip() for line in f]

failures, passed = [], 0
for line in lines:
    if line.startswith('WROTE ') and ' flushed ' not in line:
        failures.append(line + '  (Flash did not save it; storage limit?)')
    elif line.startswith(('ERROR', 'MISSING')):
        failures.append(line)
    elif line.startswith('RESULT '):
        if line.endswith(' PASS'):
            passed += 1
        else:
            failures.append(line)
    elif line.startswith('VALUE AS2 '):
        name, _, got = line[len('VALUE AS2 '):].partition(' ')
        if got == EXPECTED.get(name):
            passed += 1
        else:
            failures.append(f'{line}  (expected {EXPECTED.get(name)!r})')

seen = {line[len('VALUE AS2 '):].split(' ')[0] for line in lines if line.startswith('VALUE AS2 ')}
failures += [f'VALUE AS2 {name} missing from the log' for name in EXPECTED if name not in seen]
if lines.count('DONE') < len(sys.argv[1:]):
    failures.append('a test SWF did not finish')

print(f'Flash Player read Minerva\'s files: {passed} checks passed, {len(failures)} failed')
for f in failures:
    print('  ' + f)
sys.exit(1 if failures else 0)
