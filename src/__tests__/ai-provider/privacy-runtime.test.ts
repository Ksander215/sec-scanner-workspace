import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PrivacyRuntime } from '../../core/ai-provider/privacy-runtime.js';
import type * as Types from '../../core/ai-provider/types.js';
import {
  PrivacyLevel,
  DefaultAIProviderRuntimeConfig,
} from '../../core/ai-provider/types.js';

// ─── Factory helpers ─────────────────────────────────────────────

function makePrivacyConfig(
  overrides?: Partial<Types.PrivacyRuntimeConfig>,
): Types.PrivacyRuntimeConfig {
  return Object.freeze({
    ...DefaultAIProviderRuntimeConfig.privacyRuntime,
    ...overrides,
  });
}

function makeProviderId(): Types.ProviderId {
  return crypto.randomUUID() as Types.ProviderId;
}

function makePolicyId(): Types.PolicyId {
  return crypto.randomUUID() as Types.PolicyId;
}

function makePrivacyRule(
  overrides?: Partial<Types.PrivacyRule>,
): Types.PrivacyRule {
  return Object.freeze({
    id: crypto.randomUUID(),
    description: 'Test privacy rule',
    dataType: 'financial',
    allowedProviders: [],
    deniedProviders: [],
    requireEncryption: false,
    requireLocalOnly: false,
    ...overrides,
  });
}

function makePrivacyPolicy(
  overrides?: Partial<Types.PrivacyPolicy>,
): Types.PrivacyPolicy {
  return Object.freeze({
    id: makePolicyId(),
    name: 'Test Policy',
    level: PrivacyLevel.CloudAllowed,
    rules: [makePrivacyRule()],
    metadata: {},
    ...overrides,
  });
}

function makeRuntime(
  overrides?: Partial<Types.PrivacyRuntimeConfig>,
): PrivacyRuntime {
  return new PrivacyRuntime(makePrivacyConfig(overrides));
}

// ─── Tests ────────────────────────────────────────────────────────

describe('PrivacyRuntime', () => {
  let runtime: PrivacyRuntime;

  beforeEach(() => {
    runtime = makeRuntime();
  });

  afterEach(() => {
    // Each test is independent via fresh runtime in beforeEach
  });

  // ═══════════════════════════════════════════════════════════════
  // evaluate — allowed scenarios
  // ═══════════════════════════════════════════════════════════════
  describe('evaluate — allowed', () => {
    it('should allow when provider level equals required level', async () => {
      runtime.setDefaultLevel(PrivacyLevel.CloudAllowed);
      const providerId = makeProviderId();
      const result = await runtime.evaluate(providerId, ['general']);
      expect(result.allowed).toBe(true);
    });

    it('should allow cloud+cloud with no policies', async () => {
      runtime.setDefaultLevel(PrivacyLevel.CloudAllowed);
      const providerId = makeProviderId();
      const result = await runtime.evaluate(providerId, ['chat', 'general']);
      expect(result.allowed).toBe(true);
    });

    it('should allow when no policies are defined', async () => {
      const providerId = makeProviderId();
      const result = await runtime.evaluate(providerId, ['financial', 'pii']);
      expect(result.allowed).toBe(true);
    });

    it('should allow when no data types match any policy', async () => {
      const policy = makePrivacyPolicy({
        rules: [makePrivacyRule({ dataType: 'financial' })],
      });
      await runtime.addPolicy(policy);
      const providerId = makeProviderId();
      const result = await runtime.evaluate(providerId, ['general-chat']);
      expect(result.allowed).toBe(true);
    });

    it('should allow when provider level exceeds required level', async () => {
      runtime.setDefaultLevel(PrivacyLevel.EnterpriseOnly);
      const policy = makePrivacyPolicy({
        level: PrivacyLevel.Public,
        rules: [makePrivacyRule({ dataType: 'general' })],
      });
      await runtime.addPolicy(policy);
      const providerId = makeProviderId();
      const result = await runtime.evaluate(providerId, ['general']);
      expect(result.allowed).toBe(true);
    });

    it('should return allowed=true when data types are empty', async () => {
      const providerId = makeProviderId();
      const result = await runtime.evaluate(providerId, []);
      expect(result.allowed).toBe(true);
    });

    it('should allow internal+local when default is LocalOnly', async () => {
      runtime.setDefaultLevel(PrivacyLevel.LocalOnly);
      const providerId = makeProviderId();
      const result = await runtime.evaluate(providerId, ['internal-docs']);
      expect(result.allowed).toBe(true);
    });

    it('should allow pii+encrypted when default is EncryptedOnly', async () => {
      runtime.setDefaultLevel(PrivacyLevel.EncryptedOnly);
      const providerId = makeProviderId();
      const result = await runtime.evaluate(providerId, ['pii']);
      expect(result.allowed).toBe(true);
    });

    it('should set reason to satisfaction message when allowed', async () => {
      const providerId = makeProviderId();
      const result = await runtime.evaluate(providerId, ['general']);
      expect(result.reason).toBe('Privacy requirements satisfied');
    });

    it('should return correct requiredLevel when allowed with no policies', async () => {
      runtime.setDefaultLevel(PrivacyLevel.Public);
      const providerId = makeProviderId();
      const result = await runtime.evaluate(providerId, ['general']);
      expect(result.requiredLevel).toBe(PrivacyLevel.Public);
    });

    it('should return correct actualLevel matching default', async () => {
      runtime.setDefaultLevel(PrivacyLevel.EnterpriseOnly);
      const providerId = makeProviderId();
      const result = await runtime.evaluate(providerId, ['general']);
      expect(result.actualLevel).toBe(PrivacyLevel.EnterpriseOnly);
    });

    it('should return frozen evaluation result', async () => {
      const providerId = makeProviderId();
      const result = await runtime.evaluate(providerId, ['general']);
      expect(Object.isFrozen(result)).toBe(true);
    });

    it('should return metadata object in evaluation', async () => {
      const providerId = makeProviderId();
      const result = await runtime.evaluate(providerId, ['general']);
      expect(result.metadata).toBeDefined();
    });

    it('should have policyId empty string when no policy matches', async () => {
      const providerId = makeProviderId();
      const result = await runtime.evaluate(providerId, ['general']);
      expect(result.policyId).toBe('' as Types.PolicyId);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // evaluate — denied scenarios
  // ═══════════════════════════════════════════════════════════════
  describe('evaluate — denied', () => {
    it('should deny when default is Public and policy requires EnterpriseOnly', async () => {
      runtime.setDefaultLevel(PrivacyLevel.Public);
      const policy = makePrivacyPolicy({
        level: PrivacyLevel.EnterpriseOnly,
        rules: [makePrivacyRule({ dataType: 'financial' })],
      });
      await runtime.addPolicy(policy);
      const providerId = makeProviderId();
      const result = await runtime.evaluate(providerId, ['financial']);
      expect(result.allowed).toBe(false);
    });

    it('should deny when default is CloudAllowed and policy requires LocalOnly', async () => {
      runtime.setDefaultLevel(PrivacyLevel.CloudAllowed);
      const policy = makePrivacyPolicy({
        level: PrivacyLevel.LocalOnly,
        rules: [makePrivacyRule({ dataType: 'internal' })],
      });
      await runtime.addPolicy(policy);
      const providerId = makeProviderId();
      const result = await runtime.evaluate(providerId, ['internal']);
      expect(result.allowed).toBe(false);
    });

    it('should deny when policy requires EncryptedOnly and default is CloudAllowed', async () => {
      runtime.setDefaultLevel(PrivacyLevel.CloudAllowed);
      const policy = makePrivacyPolicy({
        level: PrivacyLevel.EncryptedOnly,
        rules: [makePrivacyRule({ dataType: 'pii' })],
      });
      await runtime.addPolicy(policy);
      const providerId = makeProviderId();
      const result = await runtime.evaluate(providerId, ['pii']);
      expect(result.allowed).toBe(false);
    });

    it('should set reason with level comparison when denied', async () => {
      runtime.setDefaultLevel(PrivacyLevel.Public);
      const policy = makePrivacyPolicy({
        level: PrivacyLevel.EnterpriseOnly,
        rules: [makePrivacyRule({ dataType: 'secret' })],
      });
      await runtime.addPolicy(policy);
      const providerId = makeProviderId();
      const result = await runtime.evaluate(providerId, ['secret']);
      expect(result.reason).toContain('Public');
      expect(result.reason).toContain('EnterpriseOnly');
    });

    it('should return requiredLevel from matching policy', async () => {
      runtime.setDefaultLevel(PrivacyLevel.Public);
      const policy = makePrivacyPolicy({
        level: PrivacyLevel.OfflineOnly,
        rules: [makePrivacyRule({ dataType: 'top-secret' })],
      });
      await runtime.addPolicy(policy);
      const providerId = makeProviderId();
      const result = await runtime.evaluate(providerId, ['top-secret']);
      expect(result.requiredLevel).toBe(PrivacyLevel.OfflineOnly);
    });

    it('should return the matching policyId when denied', async () => {
      runtime.setDefaultLevel(PrivacyLevel.Public);
      const policy = makePrivacyPolicy({
        level: PrivacyLevel.EnterpriseOnly,
        rules: [makePrivacyRule({ dataType: 'financial' })],
      });
      await runtime.addPolicy(policy);
      const providerId = makeProviderId();
      const result = await runtime.evaluate(providerId, ['financial']);
      expect(result.policyId).toBe(policy.id);
    });

    it('should deny when default is LocalOnly and policy requires EnterpriseOnly', async () => {
      runtime.setDefaultLevel(PrivacyLevel.LocalOnly);
      const policy = makePrivacyPolicy({
        level: PrivacyLevel.EnterpriseOnly,
        rules: [makePrivacyRule({ dataType: 'critical' })],
      });
      await runtime.addPolicy(policy);
      const providerId = makeProviderId();
      const result = await runtime.evaluate(providerId, ['critical']);
      expect(result.allowed).toBe(false);
    });

    it('should use the highest required level from multiple matching policies', async () => {
      runtime.setDefaultLevel(PrivacyLevel.Public);
      const policy1 = makePrivacyPolicy({
        level: PrivacyLevel.LocalOnly,
        rules: [makePrivacyRule({ dataType: 'pii' })],
      });
      const policy2 = makePrivacyPolicy({
        level: PrivacyLevel.EnterpriseOnly,
        rules: [makePrivacyRule({ dataType: 'pii' })],
      });
      await runtime.addPolicy(policy1);
      await runtime.addPolicy(policy2);
      const providerId = makeProviderId();
      const result = await runtime.evaluate(providerId, ['pii']);
      expect(result.allowed).toBe(false);
      expect(result.requiredLevel).toBe(PrivacyLevel.EnterpriseOnly);
    });

    it('should deny when default is OfflineOnly and policy requires EncryptedOnly', async () => {
      runtime.setDefaultLevel(PrivacyLevel.OfflineOnly);
      const policy = makePrivacyPolicy({
        level: PrivacyLevel.EncryptedOnly,
        rules: [makePrivacyRule({ dataType: 'health-record' })],
      });
      await runtime.addPolicy(policy);
      const providerId = makeProviderId();
      const result = await runtime.evaluate(providerId, ['health-record']);
      expect(result.allowed).toBe(false);
    });

    it('should deny when default is EncryptedOnly and policy requires EnterpriseOnly', async () => {
      runtime.setDefaultLevel(PrivacyLevel.EncryptedOnly);
      const policy = makePrivacyPolicy({
        level: PrivacyLevel.EnterpriseOnly,
        rules: [makePrivacyRule({ dataType: 'military' })],
      });
      await runtime.addPolicy(policy);
      const providerId = makeProviderId();
      const result = await runtime.evaluate(providerId, ['military']);
      expect(result.allowed).toBe(false);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // evaluate — privacy level hierarchy
  // ═══════════════════════════════════════════════════════════════
  describe('evaluate — level hierarchy', () => {
    it('should allow Public < CloudAllowed (actual > required)', async () => {
      runtime.setDefaultLevel(PrivacyLevel.CloudAllowed);
      const policy = makePrivacyPolicy({
        level: PrivacyLevel.Public,
        rules: [makePrivacyRule({ dataType: 'x' })],
      });
      await runtime.addPolicy(policy);
      const result = await runtime.evaluate(makeProviderId(), ['x']);
      expect(result.allowed).toBe(true);
    });

    it('should deny Public > CloudAllowed (actual < required)', async () => {
      runtime.setDefaultLevel(PrivacyLevel.Public);
      const policy = makePrivacyPolicy({
        level: PrivacyLevel.CloudAllowed,
        rules: [makePrivacyRule({ dataType: 'x' })],
      });
      await runtime.addPolicy(policy);
      const result = await runtime.evaluate(makeProviderId(), ['x']);
      expect(result.allowed).toBe(false);
    });

    it('should allow CloudAllowed == CloudAllowed', async () => {
      runtime.setDefaultLevel(PrivacyLevel.CloudAllowed);
      const policy = makePrivacyPolicy({
        level: PrivacyLevel.CloudAllowed,
        rules: [makePrivacyRule({ dataType: 'x' })],
      });
      await runtime.addPolicy(policy);
      const result = await runtime.evaluate(makeProviderId(), ['x']);
      expect(result.allowed).toBe(true);
    });

    it('should allow EnterpriseOnly for any lower required level', async () => {
      runtime.setDefaultLevel(PrivacyLevel.EnterpriseOnly);
      const policy = makePrivacyPolicy({
        level: PrivacyLevel.Public,
        rules: [makePrivacyRule({ dataType: 'x' })],
      });
      await runtime.addPolicy(policy);
      const result = await runtime.evaluate(makeProviderId(), ['x']);
      expect(result.allowed).toBe(true);
    });

    it('should deny Public for EnterpriseOnly requirement', async () => {
      runtime.setDefaultLevel(PrivacyLevel.Public);
      const policy = makePrivacyPolicy({
        level: PrivacyLevel.EnterpriseOnly,
        rules: [makePrivacyRule({ dataType: 'x' })],
      });
      await runtime.addPolicy(policy);
      const result = await runtime.evaluate(makeProviderId(), ['x']);
      expect(result.allowed).toBe(false);
    });

    it('should allow OfflineOnly for OfflineOnly requirement', async () => {
      runtime.setDefaultLevel(PrivacyLevel.OfflineOnly);
      const policy = makePrivacyPolicy({
        level: PrivacyLevel.OfflineOnly,
        rules: [makePrivacyRule({ dataType: 'x' })],
      });
      await runtime.addPolicy(policy);
      const result = await runtime.evaluate(makeProviderId(), ['x']);
      expect(result.allowed).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // evaluate — multi-rule policies
  // ═══════════════════════════════════════════════════
  describe('evaluate — multi-rule policies', () => {
    it('should match if any rule dataType matches', async () => {
      runtime.setDefaultLevel(PrivacyLevel.Public);
      const policy = makePrivacyPolicy({
        level: PrivacyLevel.EnterpriseOnly,
        rules: [
          makePrivacyRule({ dataType: 'financial' }),
          makePrivacyRule({ dataType: 'pii' }),
        ],
      });
      await runtime.addPolicy(policy);
      const providerId = makeProviderId();
      const result = await runtime.evaluate(providerId, ['pii']);
      expect(result.allowed).toBe(false);
      expect(result.requiredLevel).toBe(PrivacyLevel.EnterpriseOnly);
    });

    it('should not trigger if no rule dataType matches request data types', async () => {
      runtime.setDefaultLevel(PrivacyLevel.Public);
      const policy = makePrivacyPolicy({
        level: PrivacyLevel.EnterpriseOnly,
        rules: [
          makePrivacyRule({ dataType: 'financial' }),
          makePrivacyRule({ dataType: 'pii' }),
        ],
      });
      await runtime.addPolicy(policy);
      const providerId = makeProviderId();
      const result = await runtime.evaluate(providerId, ['chat']);
      expect(result.allowed).toBe(true);
    });

    it('should handle multiple policies with different data types', async () => {
      runtime.setDefaultLevel(PrivacyLevel.Public);
      const finPolicy = makePrivacyPolicy({
        level: PrivacyLevel.EnterpriseOnly,
        rules: [makePrivacyRule({ dataType: 'financial' })],
      });
      const chatPolicy = makePrivacyPolicy({
        level: PrivacyLevel.LocalOnly,
        rules: [makePrivacyRule({ dataType: 'chat' })],
      });
      await runtime.addPolicy(finPolicy);
      await runtime.addPolicy(chatPolicy);
      const providerId = makeProviderId();
      const result = await runtime.evaluate(providerId, ['chat']);
      expect(result.allowed).toBe(false);
      expect(result.policyId).toBe(chatPolicy.id);
    });

    it('should match first matching rule in multi-rule policy', async () => {
      runtime.setDefaultLevel(PrivacyLevel.Public);
      const policy = makePrivacyPolicy({
        level: PrivacyLevel.EnterpriseOnly,
        rules: [
          makePrivacyRule({ id: 'r1', dataType: 'health' }),
          makePrivacyRule({ id: 'r2', dataType: 'financial' }),
        ],
      });
      await runtime.addPolicy(policy);
      const providerId = makeProviderId();
      const result = await runtime.evaluate(providerId, ['financial']);
      expect(result.allowed).toBe(false);
    });

    it('should handle policy with empty rules array', async () => {
      runtime.setDefaultLevel(PrivacyLevel.Public);
      const policy = makePrivacyPolicy({
        level: PrivacyLevel.EnterpriseOnly,
        rules: [],
      });
      await runtime.addPolicy(policy);
      const providerId = makeProviderId();
      const result = await runtime.evaluate(providerId, ['any-data']);
      expect(result.allowed).toBe(true);
    });

    it('should use highest level from multiple matching policies', async () => {
      runtime.setDefaultLevel(PrivacyLevel.Public);
      await runtime.addPolicy(makePrivacyPolicy({
        level: PrivacyLevel.LocalOnly,
        rules: [makePrivacyRule({ dataType: 'x' })],
      }));
      await runtime.addPolicy(makePrivacyPolicy({
        level: PrivacyLevel.EnterpriseOnly,
        rules: [makePrivacyRule({ dataType: 'x' })],
      }));
      const result = await runtime.evaluate(makeProviderId(), ['x']);
      expect(result.requiredLevel).toBe(PrivacyLevel.EnterpriseOnly);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // addPolicy
  // ═══════════════════════════════════════════════════════════════
  describe('addPolicy', () => {
    it('should add a policy successfully', async () => {
      const policy = makePrivacyPolicy();
      await runtime.addPolicy(policy);
      const retrieved = await runtime.getPolicy(policy.id);
      expect(retrieved).not.toBeNull();
      expect(retrieved!.id).toBe(policy.id);
    });

    it('should store policy name', async () => {
      const policy = makePrivacyPolicy({ name: 'High Security Policy' });
      await runtime.addPolicy(policy);
      const retrieved = await runtime.getPolicy(policy.id);
      expect(retrieved!.name).toBe('High Security Policy');
    });

    it('should store policy level', async () => {
      const policy = makePrivacyPolicy({ level: PrivacyLevel.EnterpriseOnly });
      await runtime.addPolicy(policy);
      const retrieved = await runtime.getPolicy(policy.id);
      expect(retrieved!.level).toBe(PrivacyLevel.EnterpriseOnly);
    });

    it('should store policy rules', async () => {
      const rules = [makePrivacyRule({ dataType: 'pii' }), makePrivacyRule({ dataType: 'financial' })];
      const policy = makePrivacyPolicy({ rules });
      await runtime.addPolicy(policy);
      const retrieved = await runtime.getPolicy(policy.id);
      expect(retrieved!.rules).toHaveLength(2);
    });

    it('should store policy metadata', async () => {
      const policy = makePrivacyPolicy({ metadata: { department: 'hr' } as Record<string, unknown> });
      await runtime.addPolicy(policy);
      const retrieved = await runtime.getPolicy(policy.id);
      expect((retrieved!.metadata as Record<string, unknown>)['department']).toBe('hr');
    });

    it('should allow adding multiple policies', async () => {
      await runtime.addPolicy(makePrivacyPolicy());
      await runtime.addPolicy(makePrivacyPolicy());
      const list = await runtime.listPolicies();
      expect(list).toHaveLength(2);
    });

    it('should overwrite policy with same id', async () => {
      const id = makePolicyId();
      await runtime.addPolicy(makePrivacyPolicy({ id, name: 'Old' }));
      await runtime.addPolicy(makePrivacyPolicy({ id, name: 'New' }));
      const retrieved = await runtime.getPolicy(id);
      expect(retrieved!.name).toBe('New');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // removePolicy
  // ═══════════════════════════════════════════════════════════════
  describe('removePolicy', () => {
    it('should remove an existing policy', async () => {
      const policy = makePrivacyPolicy();
      await runtime.addPolicy(policy);
      await runtime.removePolicy(policy.id);
      const retrieved = await runtime.getPolicy(policy.id);
      expect(retrieved).toBeNull();
    });

    it('should not throw when removing non-existent policy', async () => {
      await expect(runtime.removePolicy(makePolicyId())).resolves.not.toThrow();
    });

    it('should not affect other policies', async () => {
      const p1 = makePrivacyPolicy();
      const p2 = makePrivacyPolicy();
      await runtime.addPolicy(p1);
      await runtime.addPolicy(p2);
      await runtime.removePolicy(p1.id);
      expect(await runtime.getPolicy(p2.id)).not.toBeNull();
      expect(await runtime.getPolicy(p1.id)).toBeNull();
    });

    it('should cause evaluate to allow previously denied request', async () => {
      runtime.setDefaultLevel(PrivacyLevel.Public);
      const policy = makePrivacyPolicy({
        level: PrivacyLevel.EnterpriseOnly,
        rules: [makePrivacyRule({ dataType: 'secret' })],
      });
      await runtime.addPolicy(policy);
      const providerId = makeProviderId();
      expect((await runtime.evaluate(providerId, ['secret'])).allowed).toBe(false);
      await runtime.removePolicy(policy.id);
      expect((await runtime.evaluate(providerId, ['secret'])).allowed).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // getPolicy
  // ═══════════════════════════════════════════════════════════════
  describe('getPolicy', () => {
    it('should return null for non-existent policy', async () => {
      const result = await runtime.getPolicy(makePolicyId());
      expect(result).toBeNull();
    });

    it('should return the policy by id', async () => {
      const policy = makePrivacyPolicy({ name: 'GetTest' });
      await runtime.addPolicy(policy);
      const result = await runtime.getPolicy(policy.id);
      expect(result).not.toBeNull();
      expect(result!.name).toBe('GetTest');
    });

    it('should return policy with correct level', async () => {
      const policy = makePrivacyPolicy({ level: PrivacyLevel.EncryptedOnly });
      await runtime.addPolicy(policy);
      const result = await runtime.getPolicy(policy.id);
      expect(result!.level).toBe(PrivacyLevel.EncryptedOnly);
    });

    it('should return policy with correct rules', async () => {
      const rule = makePrivacyRule({ dataType: 'health' });
      const policy = makePrivacyPolicy({ rules: [rule] });
      await runtime.addPolicy(policy);
      const result = await runtime.getPolicy(policy.id);
      expect(result!.rules[0].dataType).toBe('health');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // listPolicies
  // ═══════════════════════════════════════════════════════════════
  describe('listPolicies', () => {
    it('should return empty array when no policies', async () => {
      const list = await runtime.listPolicies();
      expect(list).toHaveLength(0);
    });

    it('should return all added policies', async () => {
      const p1 = makePrivacyPolicy({ name: 'P1' });
      const p2 = makePrivacyPolicy({ name: 'P2' });
      const p3 = makePrivacyPolicy({ name: 'P3' });
      await runtime.addPolicy(p1);
      await runtime.addPolicy(p2);
      await runtime.addPolicy(p3);
      const list = await runtime.listPolicies();
      expect(list).toHaveLength(3);
    });

    it('should return policies with correct names', async () => {
      await runtime.addPolicy(makePrivacyPolicy({ name: 'Alpha' }));
      await runtime.addPolicy(makePrivacyPolicy({ name: 'Beta' }));
      const list = await runtime.listPolicies();
      const names = list.map(p => p.name);
      expect(names).toContain('Alpha');
      expect(names).toContain('Beta');
    });

    it('should reflect removals in list', async () => {
      const p = makePrivacyPolicy();
      await runtime.addPolicy(p);
      await runtime.removePolicy(p.id);
      const list = await runtime.listPolicies();
      expect(list).toHaveLength(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // setDefaultLevel / getDefaultLevel
  // ═══════════════════════════════════════════════════════════════
  describe('setDefaultLevel / getDefaultLevel', () => {
    it('should return CloudAllowed by default', () => {
      expect(runtime.getDefaultLevel()).toBe(PrivacyLevel.CloudAllowed);
    });

    it('should update default level via setDefaultLevel', () => {
      runtime.setDefaultLevel(PrivacyLevel.EnterpriseOnly);
      expect(runtime.getDefaultLevel()).toBe(PrivacyLevel.EnterpriseOnly);
    });

    it('should accept Public level', () => {
      runtime.setDefaultLevel(PrivacyLevel.Public);
      expect(runtime.getDefaultLevel()).toBe(PrivacyLevel.Public);
    });

    it('should accept LocalOnly level', () => {
      runtime.setDefaultLevel(PrivacyLevel.LocalOnly);
      expect(runtime.getDefaultLevel()).toBe(PrivacyLevel.LocalOnly);
    });

    it('should accept OfflineOnly level', () => {
      runtime.setDefaultLevel(PrivacyLevel.OfflineOnly);
      expect(runtime.getDefaultLevel()).toBe(PrivacyLevel.OfflineOnly);
    });

    it('should accept EncryptedOnly level', () => {
      runtime.setDefaultLevel(PrivacyLevel.EncryptedOnly);
      expect(runtime.getDefaultLevel()).toBe(PrivacyLevel.EncryptedOnly);
    });

    it('should affect evaluate after changing default level', async () => {
      runtime.setDefaultLevel(PrivacyLevel.Public);
      const policy = makePrivacyPolicy({
        level: PrivacyLevel.LocalOnly,
        rules: [makePrivacyRule({ dataType: 'data' })],
      });
      await runtime.addPolicy(policy);
      const providerId = makeProviderId();
      expect((await runtime.evaluate(providerId, ['data'])).allowed).toBe(false);
      runtime.setDefaultLevel(PrivacyLevel.EnterpriseOnly);
      expect((await runtime.evaluate(providerId, ['data'])).allowed).toBe(true);
    });

    it('should allow updating default multiple times', () => {
      runtime.setDefaultLevel(PrivacyLevel.Public);
      runtime.setDefaultLevel(PrivacyLevel.LocalOnly);
      runtime.setDefaultLevel(PrivacyLevel.EnterpriseOnly);
      expect(runtime.getDefaultLevel()).toBe(PrivacyLevel.EnterpriseOnly);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // Constructor / Config
  // ═══════════════════════════════════════════════════════════════
  describe('constructor', () => {
    it('should use defaultLevel from config', () => {
      const rt = makeRuntime({ defaultLevel: PrivacyLevel.Public });
      expect(rt.getDefaultLevel()).toBe(PrivacyLevel.Public);
    });

    it('should use EnterpriseOnly defaultLevel from config', () => {
      const rt = makeRuntime({ defaultLevel: PrivacyLevel.EnterpriseOnly });
      expect(rt.getDefaultLevel()).toBe(PrivacyLevel.EnterpriseOnly);
    });

    it('should accept null event bus', () => {
      const rt = new PrivacyRuntime(makePrivacyConfig(), null);
      expect(rt.getDefaultLevel()).toBeDefined();
    });

    it('should work without event bus', () => {
      const rt = new PrivacyRuntime(makePrivacyConfig());
      expect(rt.getDefaultLevel()).toBeDefined();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // evaluate — evaluate result properties
  // ═══════════════════════════════════════════════════════════════
  describe('evaluate — result properties', () => {
    it('should return allowed as boolean', async () => {
      const result = await runtime.evaluate(makeProviderId(), ['x']);
      expect(typeof result.allowed).toBe('boolean');
    });

    it('should return policyId as string', async () => {
      const result = await runtime.evaluate(makeProviderId(), ['x']);
      expect(typeof result.policyId).toBe('string');
    });

    it('should return reason as string', async () => {
      const result = await runtime.evaluate(makeProviderId(), ['x']);
      expect(typeof result.reason).toBe('string');
    });

    it('should return requiredLevel as PrivacyLevel enum value', async () => {
      const result = await runtime.evaluate(makeProviderId(), ['x']);
      expect(Object.values(PrivacyLevel)).toContain(result.requiredLevel);
    });

    it('should return actualLevel as PrivacyLevel enum value', async () => {
      const result = await runtime.evaluate(makeProviderId(), ['x']);
      expect(Object.values(PrivacyLevel)).toContain(result.actualLevel);
    });

    it('should allow EncryptedOnly for EncryptedOnly requirement', async () => {
      runtime.setDefaultLevel(PrivacyLevel.EncryptedOnly);
      const policy = makePrivacyPolicy({
        level: PrivacyLevel.EncryptedOnly,
        rules: [makePrivacyRule({ dataType: 'data' })],
      });
      await runtime.addPolicy(policy);
      const result = await runtime.evaluate(makeProviderId(), ['data']);
      expect(result.allowed).toBe(true);
    });

    it('should handle policy with multiple rules matching same data type', async () => {
      runtime.setDefaultLevel(PrivacyLevel.Public);
      const policy = makePrivacyPolicy({
        level: PrivacyLevel.LocalOnly,
        rules: [
          makePrivacyRule({ dataType: 'pii' }),
          makePrivacyRule({ dataType: 'pii', id: crypto.randomUUID() }),
        ],
      });
      await runtime.addPolicy(policy);
      const result = await runtime.evaluate(makeProviderId(), ['pii']);
      expect(result.allowed).toBe(false);
      expect(result.policyId).toBe(policy.id);
    });

    it('should allow same level for all hierarchy comparisons (Public)', async () => {
      runtime.setDefaultLevel(PrivacyLevel.Public);
      const policy = makePrivacyPolicy({
        level: PrivacyLevel.Public,
        rules: [makePrivacyRule({ dataType: 'x' })],
      });
      await runtime.addPolicy(policy);
      const result = await runtime.evaluate(makeProviderId(), ['x']);
      expect(result.allowed).toBe(true);
    });

    it('should allow same level for all hierarchy comparisons (OfflineOnly)', async () => {
      runtime.setDefaultLevel(PrivacyLevel.OfflineOnly);
      const policy = makePrivacyPolicy({
        level: PrivacyLevel.OfflineOnly,
        rules: [makePrivacyRule({ dataType: 'x' })],
      });
      await runtime.addPolicy(policy);
      const result = await runtime.evaluate(makeProviderId(), ['x']);
      expect(result.allowed).toBe(true);
    });

    it('should work with enforcePolicies false', async () => {
      const rt = makeRuntime({ enforcePolicies: false, defaultLevel: PrivacyLevel.Public });
      const policy = makePrivacyPolicy({
        level: PrivacyLevel.EnterpriseOnly,
        rules: [makePrivacyRule({ dataType: 'secret' })],
      });
      await rt.addPolicy(policy);
      const result = await rt.evaluate(makeProviderId(), ['secret']);
      expect(result.allowed).toBe(false);
    });

    it('should evaluate independently for different provider IDs', async () => {
      runtime.setDefaultLevel(PrivacyLevel.Public);
      const policy = makePrivacyPolicy({
        level: PrivacyLevel.EnterpriseOnly,
        rules: [makePrivacyRule({ dataType: 'x' })],
      });
      await runtime.addPolicy(policy);
      const r1 = await runtime.evaluate(makeProviderId(), ['x']);
      const r2 = await runtime.evaluate(makeProviderId(), ['x']);
      expect(r1.allowed).toBe(false);
      expect(r2.allowed).toBe(false);
    });

    it('should return correct reason mentioning levels', async () => {
      runtime.setDefaultLevel(PrivacyLevel.LocalOnly);
      const policy = makePrivacyPolicy({
        level: PrivacyLevel.EnterpriseOnly,
        rules: [makePrivacyRule({ dataType: 'y' })],
      });
      await runtime.addPolicy(policy);
      const result = await runtime.evaluate(makeProviderId(), ['y']);
      expect(result.reason).toContain('LocalOnly');
      expect(result.reason).toContain('EnterpriseOnly');
    });

    it('should evaluate with multiple data types matching different policies', async () => {
      runtime.setDefaultLevel(PrivacyLevel.Public);
      const p1 = makePrivacyPolicy({
        level: PrivacyLevel.LocalOnly,
        rules: [makePrivacyRule({ dataType: 'health' })],
      });
      const p2 = makePrivacyPolicy({
        level: PrivacyLevel.EnterpriseOnly,
        rules: [makePrivacyRule({ dataType: 'financial' })],
      });
      await runtime.addPolicy(p1);
      await runtime.addPolicy(p2);
      const result = await runtime.evaluate(makeProviderId(), ['health', 'financial']);
      expect(result.allowed).toBe(false);
      expect(result.requiredLevel).toBe(PrivacyLevel.EnterpriseOnly);
    });
  });
});
