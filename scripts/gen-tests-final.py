import os

T = '/home/z/my-project/src/__tests__/desktop'

def wf(p, c):
    os.makedirs(os.path.dirname(p), exist_ok=True)
    with open(p, 'w') as f:
        f.write(c)

I = "import { describe, it, expect, beforeEach } from 'vitest';\n"
LC = '\n'

LIFECYCLE = '''
  describe('lifecycle', () => {
    it('should have name', () => { expect(runtime.name).toBe('{CLS}Runtime'); });
    it('should initialize', () => { expect(runtime.initialized).toBe(true); });
    it('should start', async () => { await runtime.start(); });
    it('should stop', async () => { await runtime.stop(); });
    it('should shutdown', async () => { await runtime.shutdown(); expect(runtime.initialized).toBe(false); });
    it('should implement Service', () => { expect(typeof runtime.initialize).toBe('function'); });
  });\n'''

tests_data = {
    'local-storage': [
        ('set and get string', 'runtime.set("k", "v"); expect(runtime.get("k")).toBe("v")'),
        ('set and get number', 'runtime.set("k", 42); expect(runtime.get("k")).toBe(42)'),
        ('set and get boolean', 'runtime.set("k", true); expect(runtime.get("k")).toBe(true)'),
        ('set and get object', 'runtime.set("k", {a:1}); expect(runtime.get("k")).toEqual({a:1})'),
        ('set and get array', 'runtime.set("k", [1,2]); expect(runtime.get("k")).toEqual([1,2])'),
        ('set and get null', 'runtime.set("k", null); expect(runtime.get("k")).toBeNull()'),
        ('get missing returns undefined', 'expect(runtime.get("missing")).toBeUndefined()'),
        ('has returns true', 'runtime.set("x", 1); expect(runtime.has("x")).toBe(true)'),
        ('has returns false', 'expect(runtime.has("missing")).toBe(false)'),
        ('delete existing', 'runtime.set("d", 1); expect(runtime.delete("d")).toBe(true); expect(runtime.has("d")).toBe(false)'),
        ('delete missing returns false', 'expect(runtime.delete("nope")).toBe(false)'),
        ('clear removes all', 'runtime.set("a", 1); runtime.set("b", 2); runtime.clear(); expect(runtime.size).toBe(0)'),
        ('size tracks count', 'runtime.set("a", 1); runtime.set("b", 2); runtime.set("c", 3); expect(runtime.size).toBe(3)'),
        ('keys returns all', 'runtime.set("a", 1); runtime.set("b", 2); expect(runtime.keys()).toHaveLength(2)'),
        ('entries returns all', 'runtime.set("a", 1); runtime.set("b", 2); expect(runtime.entries()).toHaveLength(2)'),
        ('overwrite key', 'runtime.set("k", 1); runtime.set("k", 2); expect(runtime.get("k")).toBe(2)'),
        ('empty string key', 'runtime.set("", "empty"); expect(runtime.get("")).toBe("empty")'),
        ('100 entries', 'for(let i=0;i<100;i++) runtime.set("k"+i, i); expect(runtime.size).toBe(100)'),
        ('typed get', 'runtime.set("n", 42); const v: number|undefined = runtime.get<number>("n"); expect(v).toBe(42)'),
        ('has after delete', 'runtime.set("x", 1); runtime.delete("x"); expect(runtime.has("x")).toBe(false)'),
        ('get after delete', 'runtime.set("x", 1); runtime.delete("x"); expect(runtime.get("x")).toBeUndefined()'),
        ('multiple gets same value', 'runtime.set("k", "v"); expect(runtime.get("k")).toBe("v"); expect(runtime.get("k")).toBe("v")'),
        ('set with zero', 'runtime.set("k", 0); expect(runtime.get("k")).toBe(0)'),
        ('set with false', 'runtime.set("k", false); expect(runtime.get("k")).toBe(false)'),
        ('set with empty string', 'runtime.set("k", ""); expect(runtime.get("k")).toBe("")'),
        ('clear empty', 'runtime.clear(); expect(runtime.size).toBe(0)'),
        ('delete from empty', 'expect(runtime.delete("nope")).toBe(false)'),
        ('get number stored as string', 'runtime.set("n", "42"); expect(runtime.get("n")).toBe("42")'),
        ('entries are key-value pairs', 'runtime.set("a", 1); const e = runtime.entries()[0]; expect(e[0]).toBe("a"); expect(e[1]).toBe(1)'),
        ('keys preserve insertion order', 'runtime.set("b", 2); runtime.set("a", 1); expect(runtime.keys()[0]).toBe("b")'),
        ('has after clear', 'runtime.set("x", 1); runtime.clear(); expect(runtime.has("x")).toBe(false)'),
        ('get never set', 'expect(runtime.get("never")).toBeUndefined()'),
        ('size starts at 0', 'expect(runtime.size).toBe(0)'),
        ('set clear set', 'runtime.set("a", 1); runtime.clear(); runtime.set("b", 2); expect(runtime.size).toBe(1); expect(runtime.get("b")).toBe(2)'),
    ],
}

for sub, cls in [('search', 'Search'), ('startup', 'Startup'), ('settings', 'Settings'),
    ('diagnostics', 'Diagnostics'), ('crash-recovery', 'CrashRecovery'),
    ('notification', 'Notification'), ('command-palette', 'CommandPalette')]:
    path = T + '/' + sub + '/' + sub + '.test.ts'
    with open(path, 'w') as f:
        f.write(I)
        f.write('import { ' + cls + 'Runtime } from "../../../desktop/' + sub + '/' + sub + '.js";' + LC + LC)
        f.write('describe("' + cls + 'Runtime", () => {' + LC)
        f.write('  let runtime: ' + cls + 'Runtime;' + LC)
        f.write('  beforeEach(async () => { runtime = new ' + cls + 'Runtime(); await runtime.initialize(); });' + LC + LC)
        f.write(LIFECYCLE.replace('{CLS}', cls))

wf(path, '')
print('Done')
