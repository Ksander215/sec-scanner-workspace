#!/usr/bin/env python3
"""Generate simple subsystem tests."""
import os

T = '/home/z/my-project/src/__tests__/desktop'

def w(p, c):
    os.makedirs(os.path.dirname(p), exist_ok=True)
    with open(p, 'w') as f:
        f.write(c)

SUBSYSTEMS = [
    ('local-storage', 'LocalStorage'),
    ('search', 'Search'),
    ('startup', 'Startup'),
    ('settings', 'Settings'),
    ('diagnostics', 'Diagnostics'),
    ('crash-recovery', 'CrashRecovery'),
    ('notification', 'Notification'),
    ('command-palette', 'CommandPalette'),
]

for sub, cls in SUBSYSTEMS:
    p = T + '/' + sub + '/' + sub + '.test.ts'
    with open(p, 'w') as f:
        f.write('import { describe, it, expect, beforeEach } from \'vitest\'\n')
        f.write('import { ' + cls + 'Runtime } from \'../../../desktop/' + sub + '/' + sub + '.js\';\n\n')
        f.write('describe(\'' + cls + 'Runtime\', () => {\n')
        f.write('  let runtime: ' + cls + 'Runtime;\n')
        f.write('  beforeEach(async () => { runtime = new ' + cls + 'Runtime(); await runtime.initialize(); });\n\n')
        f.write('  describe(\'lifecycle\', () => {\n')
        f.write('    it(\'should have name\', () => { expect(runtime.name).toBe(\'' + cls + 'Runtime\''); });\n')
        f.write('    it(\'should initialize\', () => { expect(runtime.initialized).toBe(true); });\n')
        f.write('    it(\'should start\', async () => { await runtime.start(); });\n')
        f.write('    it(\'should stop\', async () => { await runtime.stop(); });\n')
        f.write('    it(\'should shutdown\', async () => { await runtime.shutdown(); expect(runtime.initialized).toBe(false); });\n')
        f.write('    it(\'should implement Service\', () => { expect(typeof runtime.initialize).toBe(\'function\''); });\n')
        f.write('  });\n')
    w(f)

print('Generated lifecycle tests for', len(SUBSYSTEMS), 'subsystems')
