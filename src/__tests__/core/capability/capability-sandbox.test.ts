import { CapabilitySandbox } from '../../../core/capability/capability-sandbox.js';
import type { CapabilityPermission, CapabilityPackId, CapabilityLogger } from '../../../core/capability/types.js';
import { CapabilityTrustLevel, CapabilityPermissionType, CapabilityAccessLevel } from '../../../core/capability/types.js';

function createPackId(): CapabilityPackId { return crypto.randomUUID() as any; }
function createPerm(type: CapabilityPermissionType, access: CapabilityAccessLevel, resource: string): CapabilityPermission {
  return Object.freeze({ type, access, resource, description: 'test perm' });
}
function createMockLogger(): CapabilityLogger {
  return Object.freeze({
    debug: () => {},
    info: () => {},
    warn: () => {},
    error: () => {},
  });
}

describe('CapabilitySandbox', () => {
  let sandbox: CapabilitySandbox;
  beforeEach(() => { sandbox = new CapabilitySandbox(); });

  describe('checkPermission', () => {
    it('grants permission by default', () => {
      const packId = createPackId();
      const perm = createPerm(CapabilityPermissionType.Memory, CapabilityAccessLevel.Read, 'context');
      expect(sandbox.checkPermission(packId, perm)).toBe(true);
    });

    it('denies resource on deny list', () => {
      sandbox = new CapabilitySandbox({ denyList: ['forbidden'] });
      const packId = createPackId();
      const perm = createPerm(CapabilityPermissionType.Memory, CapabilityAccessLevel.Read, 'forbidden/resource');
      expect(sandbox.checkPermission(packId, perm)).toBe(false);
    });

    it('records violation on deny', () => {
      sandbox = new CapabilitySandbox({ denyList: ['blocked'] });
      const packId = createPackId();
      const perm = createPerm(CapabilityPermissionType.Tool, CapabilityAccessLevel.Write, 'blocked/action');
      sandbox.checkPermission(packId, perm);
      expect(sandbox.getViolations(packId).length).toBe(1);
      expect(sandbox.totalViolations).toBe(1);
    });

    it('tracks granted action count', () => {
      const packId = createPackId();
      const perm = createPerm(CapabilityPermissionType.Memory, CapabilityAccessLevel.Read, 'test');
      sandbox.checkPermission(packId, perm);
      sandbox.checkPermission(packId, perm);
      const stats = sandbox.getStats();
      expect(stats.granted).toBe(2);
      expect(stats.denied).toBe(0);
    });
  });

  describe('hasPermission', () => {
    it('returns true for exact permission match', () => {
      const packId = createPackId();
      const permMap = new Map<string, CapabilityPermission>();
      permMap.set('Memory:Read:context', createPerm(CapabilityPermissionType.Memory, CapabilityAccessLevel.Read, 'context'));
      expect(sandbox.hasPermission(packId, CapabilityPermissionType.Memory, CapabilityAccessLevel.Read, 'context', permMap)).toBe(true);
    });

    it('denies Admin when only Read granted', () => {
      const packId = createPackId();
      const permMap = new Map<string, CapabilityPermission>();
      permMap.set('Memory:Read:context', createPerm(CapabilityPermissionType.Memory, CapabilityAccessLevel.Read, 'context'));
      expect(sandbox.hasPermission(packId, CapabilityPermissionType.Memory, CapabilityAccessLevel.Admin, 'context', permMap)).toBe(false);
    });

    it('denies Write when only Read granted', () => {
      const packId = createPackId();
      const permMap = new Map<string, CapabilityPermission>();
      permMap.set('Memory:Read:data', createPerm(CapabilityPermissionType.Memory, CapabilityAccessLevel.Read, 'data'));
      expect(sandbox.hasPermission(packId, CapabilityPermissionType.Memory, CapabilityAccessLevel.Write, 'data', permMap)).toBe(false);
    });

    it('denies Read when only Write is granted (exact match required)', () => {
      const packId = createPackId();
      const permMap = new Map<string, CapabilityPermission>();
      permMap.set('Tool:Write:execute', createPerm(CapabilityPermissionType.Tool, CapabilityAccessLevel.Write, 'execute'));
      expect(sandbox.hasPermission(packId, CapabilityPermissionType.Tool, CapabilityAccessLevel.Read, 'execute', permMap)).toBe(false);
    });

    it('denies when no matching permission exists', () => {
      const packId = createPackId();
      const permMap = new Map<string, CapabilityPermission>();
      expect(sandbox.hasPermission(packId, CapabilityPermissionType.Execution, CapabilityAccessLevel.Read, 'none', permMap)).toBe(false);
    });

    it('records denial when no permission', () => {
      const packId = createPackId();
      const permMap = new Map<string, CapabilityPermission>();
      sandbox.hasPermission(packId, CapabilityPermissionType.Memory, CapabilityAccessLevel.Read, 'none', permMap);
      expect(sandbox.totalViolations).toBe(1);
    });
  });

  describe('createContext', () => {
    it('returns a frozen context', () => {
      const packId = createPackId();
      const permMap = new Map<string, CapabilityPermission>();
      const ctx = sandbox.createContext(packId, 'test-pack', CapabilityTrustLevel.Trusted, permMap, createMockLogger(), async () => {});
      expect(Object.isFrozen(ctx)).toBe(true);
    });

    it('has correct packId and packName', () => {
      const packId = createPackId();
      const ctx = sandbox.createContext(packId, 'my-pack', CapabilityTrustLevel.Trusted, new Map(), createMockLogger(), async () => {});
      expect(ctx.packId).toBe(packId);
      expect(ctx.packName).toBe('my-pack');
    });

    it('context state management works', async () => {
      const packId = createPackId();
      const ctx = sandbox.createContext(packId, 'test', CapabilityTrustLevel.Trusted, new Map(), createMockLogger(), async () => {});
      expect(Object.keys(ctx.getState())).toHaveLength(0);
      await ctx.setState('key', 'value');
      expect((ctx.getState() as any).key).toBe('value');
    });

    it('emit callback is preserved', async () => {
      const packId = createPackId();
      let emitted = false;
      const ctx = sandbox.createContext(packId, 'test', CapabilityTrustLevel.Trusted, new Map(), createMockLogger(),
        async (type, payload) => { emitted = true; });
      await ctx.emit('test-event', { data: 42 });
      expect(emitted).toBe(true);
    });
  });

  describe('recordViolation', () => {
    it('records and retrieves violations', () => {
      const packId = createPackId();
      const violation = sandbox.recordViolation(packId, 'write', 'core/state', 'Cannot modify core');
      expect(violation.packId).toBe(packId);
      expect(violation.action).toBe('write');
      expect(violation.resource).toBe('core/state');
      expect(sandbox.getViolations(packId).length).toBe(1);
    });

    it('tracks violations per pack separately', () => {
      const id1 = createPackId();
      const id2 = createPackId();
      sandbox.recordViolation(id1, 'read', 'secret', 'no');
      sandbox.recordViolation(id2, 'write', 'core', 'no');
      expect(sandbox.getViolations(id1).length).toBe(1);
      expect(sandbox.getViolations(id2).length).toBe(1);
    });
  });

  describe('getStats', () => {
    it('returns initial stats', () => {
      const stats = sandbox.getStats();
      expect(stats.granted).toBe(0);
      expect(stats.denied).toBe(0);
      expect(stats.violations).toBe(0);
    });
  });

  describe('clear', () => {
    it('clears all violations', () => {
      const packId = createPackId();
      sandbox.recordViolation(packId, 'x', 'y', 'z');
      sandbox.clear();
      expect(sandbox.totalViolations).toBe(0);
      expect(sandbox.getViolations(packId).length).toBe(0);
    });
  });
});
