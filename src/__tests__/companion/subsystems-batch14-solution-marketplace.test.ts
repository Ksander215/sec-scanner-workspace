import { describe, it, expect, beforeEach } from 'vitest';
import { SolutionCenter } from '../../core/companion/solution-center.js';
import { MarketplaceCenter } from '../../core/companion/marketplace-center.js';
import { CapabilityManager } from '../../core/companion/capability-manager.js';
import { KnowledgeCenter } from '../../core/companion/knowledge-center.js';
import {
  DefaultCompanionRuntimeConfig, SolutionStatus, SolutionCenterConfig,
  CapabilityManagerConfig, KnowledgeCenterConfig, MarketplaceCenterConfig,
} from '../../core/companion/types.js';
import {
  SolutionNotFoundError, SolutionLimitExceededError,
  MarketplaceError, CapabilityError, KnowledgeError, CompanionError,
} from '../../core/companion/errors.js';

const solTitles = [
  'Auth Service', 'Payment Gateway', 'User Profile', 'Search Engine', 'Notification Hub',
  'Data Pipeline', 'ML Predictor', 'File Storage', 'Email Sender', 'Cache Manager',
  'Rate Limiter', 'Log Aggregator', 'API Gateway', 'Config Service', 'Feature Flags',
  'A/B Tester', 'Analytics Engine', 'Workflow Runner', 'Job Scheduler', 'Queue Manager',
];
const categories = ['auth', 'data', 'ai', 'devops', 'utility', 'integration'];
const knowledgeCategories = ['architecture', 'patterns', 'best-practices', 'domain', 'tech-stack'];

// ── SolutionCenter: create ──────────────────────────────────────────────
describe('SolutionCenter create', () => {
  let sc: SolutionCenter;
  beforeEach(() => { sc = new SolutionCenter(DefaultCompanionRuntimeConfig.solutionCenterConfig); });

  for (let i = 0; i < 20; i++) {
    it(`creates solution ${solTitles[i]}`, async () => {
      const s = await sc.create('s1', 'u1', solTitles[i], `desc-${i}`);
      expect(s.title).toBe(solTitles[i]);
      expect(s.description).toBe(`desc-${i}`);
      expect(s.status).toBe(SolutionStatus.Draft);
      expect(s.valueScore).toBe(0);
      expect(s.workflowsGenerated).toBe(0);
      expect(s.completedAt).toBeNull();
    });
  }

  for (let i = 0; i < 10; i++) {
    it(`create with goalId variant ${i}`, async () => {
      const s = await sc.create('s1', 'u1', 'Sol', '', `goal-${i}`);
      expect(s.goalId).toBe(`goal-${i}`);
    });
  }

  for (let i = 0; i < 10; i++) {
    it(`create without goalId variant ${i} has null goalId`, async () => {
      const s = await sc.create('s1', 'u1', `Sol ${i}`);
      expect(s.goalId).toBeNull();
    });
  }

  for (let i = 0; i < 10; i++) {
    it(`solution ${i} is frozen`, async () => {
      expect(Object.isFrozen(await sc.create('s1', 'u1', `S${i}`))).toBe(true);
    });
  }

  it('solution metadata is frozen', async () => {
    const s = await sc.create('s1', 'u1', 'S');
    expect(Object.isFrozen(s.metadata)).toBe(true);
  });

  for (let i = 0; i < 10; i++) {
    it(`unique solution id pair ${i}`, async () => {
      const a = await sc.create('s1', 'u1', 'A');
      const b = await sc.create('s1', 'u1', 'B');
      expect(a.id).not.toBe(b.id);
    });
  }

  it('null eventBus', () => {
    expect(new SolutionCenter(DefaultCompanionRuntimeConfig.solutionCenterConfig, null)).toBeDefined();
  });
});

// ── SolutionCenter: open ────────────────────────────────────────────────
describe('SolutionCenter open', () => {
  let sc: SolutionCenter;
  beforeEach(() => { sc = new SolutionCenter(DefaultCompanionRuntimeConfig.solutionCenterConfig); });

  for (let i = 0; i < 15; i++) {
    it(`opens solution ${solTitles[i]}`, async () => {
      const s = await sc.open('s1', 'u1', solTitles[i]);
      expect(s.status).toBe(SolutionStatus.Assembling);
      expect(s.title).toBe(solTitles[i]);
    });
  }

  for (let i = 0; i < 10; i++) {
    it(`open with goalId variant ${i}`, async () => {
      const s = await sc.open('s1', 'u1', 'Sol', `goal-${i}`);
      expect(s.goalId).toBe(`goal-${i}`);
      expect(s.status).toBe(SolutionStatus.Assembling);
    });
  }
});

// ── SolutionCenter: generate ────────────────────────────────────────────
describe('SolutionCenter generate', () => {
  let sc: SolutionCenter;
  beforeEach(() => { sc = new SolutionCenter(DefaultCompanionRuntimeConfig.solutionCenterConfig); });

  for (let i = 1; i <= 10; i++) {
    it(`generate ${i} times increments workflowsGenerated`, async () => {
      const s = await sc.open('s1', 'u1', 'Sol');
      for (let j = 0; j < i; j++) { await sc.generate(s.id as string); }
      const u = await sc.get(s.id as string);
      expect(u!.workflowsGenerated).toBe(i);
    });
  }

  it('generate sets status to Validating', async () => {
    const s = await sc.open('s1', 'u1', 'Sol');
    const u = await sc.generate(s.id as string);
    expect(u.status).toBe(SolutionStatus.Validating);
  });

  it('generate throws for missing', async () => {
    await expect(sc.generate('x')).rejects.toThrow(SolutionNotFoundError);
  });
});

// ── SolutionCenter: complete ────────────────────────────────────────────
describe('SolutionCenter complete', () => {
  let sc: SolutionCenter;
  beforeEach(() => { sc = new SolutionCenter(DefaultCompanionRuntimeConfig.solutionCenterConfig); });

  for (let i = 0; i < 15; i++) {
    it(`completes solution variant ${i}`, async () => {
      const s = await sc.create('s1', 'u1', solTitles[i]);
      const c = await sc.complete(s.id as string);
      expect(c.status).toBe(SolutionStatus.Completed);
      expect(c.completedAt).not.toBeNull();
    });
  }

  it('complete throws for missing', async () => {
    await expect(sc.complete('x')).rejects.toThrow(SolutionNotFoundError);
  });

  for (let i = 0; i < 5; i++) {
    it(`complete preserves title ${solTitles[i]}`, async () => {
      const s = await sc.create('s1', 'u1', solTitles[i]);
      const c = await sc.complete(s.id as string);
      expect(c.title).toBe(solTitles[i]);
    });
  }
});

// ── SolutionCenter: cancel ──────────────────────────────────────────────
describe('SolutionCenter cancel', () => {
  let sc: SolutionCenter;
  beforeEach(() => { sc = new SolutionCenter(DefaultCompanionRuntimeConfig.solutionCenterConfig); });

  for (let i = 0; i < 10; i++) {
    it(`cancels solution variant ${i}`, async () => {
      const s = await sc.create('s1', 'u1', `Sol ${i}`);
      const c = await sc.cancel(s.id as string, `reason-${i}`);
      expect(c.status).toBe(SolutionStatus.Cancelled);
    });
  }

  it('cancel throws for missing', async () => {
    await expect(sc.cancel('x')).rejects.toThrow(SolutionNotFoundError);
  });

  for (let i = 0; i < 5; i++) {
    it(`cancel with reason variant ${i}`, async () => {
      const s = await sc.create('s1', 'u1', 'S');
      await sc.cancel(s.id as string, `reason-${i}`);
      const u = await sc.get(s.id as string);
      expect(u!.status).toBe(SolutionStatus.Cancelled);
    });
  }
});

// ── SolutionCenter: limits, analytics, get, list, count, remove ─────────
describe('SolutionCenter limits analytics get list count remove', () => {
  let sc: SolutionCenter;
  let created = 0;
  let completed = 0;
  beforeEach(() => {
    created = 0; completed = 0;
    sc = new SolutionCenter(DefaultCompanionRuntimeConfig.solutionCenterConfig);
    sc.setAnalyticsCallback((e) => { if (e === 'solutionCreated') created++; if (e === 'solutionCompleted') completed++; });
  });

  it('analytics fires solutionCreated', async () => {
    await sc.create('s1', 'u1', 'S');
    expect(created).toBe(1);
  });

  it('analytics fires solutionCompleted', async () => {
    const s = await sc.create('s1', 'u1', 'S');
    await sc.complete(s.id as string);
    expect(completed).toBe(1);
  });

  for (let i = 1; i <= 10; i++) {
    it(`analytics counts ${i} creates`, async () => {
      for (let j = 0; j < i; j++) { await sc.create('s1', 'u1', `S${j}`); }
      expect(created).toBe(i);
    });
  }

  for (const limit of [1, 3, 5, 10]) {
    it(`respects solution limit of ${limit}`, async () => {
      const cfg: SolutionCenterConfig = { maxSolutionsPerSession: limit, defaultValueScore: 0 };
      const sc2 = new SolutionCenter(cfg);
      for (let j = 0; j < limit; j++) { await sc2.create('s1', 'u1', `S${j}`); }
      await expect(sc2.create('s1', 'u1', 'overflow')).rejects.toThrow(SolutionLimitExceededError);
    });
  }

  it('SolutionLimitExceededError has correct fields', async () => {
    const cfg: SolutionCenterConfig = { maxSolutionsPerSession: 1, defaultValueScore: 0 };
    const sc2 = new SolutionCenter(cfg);
    await sc2.create('s1', 'u1', 'S');
    try { await sc2.create('s1', 'u1', 'S2'); } catch (e) {
      expect(e).toBeInstanceOf(SolutionLimitExceededError);
      expect((e as SolutionLimitExceededError).code).toBe('SOLUTION_LIMIT');
      expect((e as SolutionLimitExceededError).limit).toBe(1);
    }
  });

  it('get returns null for missing', async () => {
    expect(await sc.get('x')).toBeNull();
  });

  for (let i = 1; i <= 10; i++) {
    it(`list returns ${i} solutions`, async () => {
      for (let j = 0; j < i; j++) { await sc.create('s1', 'u1', `S${j}`); }
      expect((await sc.list('s1'))).toHaveLength(i);
    });
  }

  for (let i = 1; i <= 10; i++) {
    it(`count returns ${i}`, async () => {
      for (let j = 0; j < i; j++) { await sc.create('s1', 'u1', `S${j}`); }
      expect(await sc.count('s1')).toBe(i);
    });
  }

  it('remove', async () => {
    const s = await sc.create('s1', 'u1', 'S');
    await sc.remove(s.id as string);
    expect(await sc.get(s.id as string)).toBeNull();
  });

  it('remove throws for missing', async () => {
    await expect(sc.remove('x')).rejects.toThrow(SolutionNotFoundError);
  });

  it('SolutionNotFoundError has correct fields', () => {
    const e = new SolutionNotFoundError('sol-123');
    expect(e.code).toBe('SOLUTION_NOT_FOUND');
    expect(e.solutionId).toBe('sol-123');
    expect(e).toBeInstanceOf(CompanionError);
  });
});

// ── MarketplaceCenter: browse, getDetails, install, seedListings ────────
describe('MarketplaceCenter', () => {
  let mc: MarketplaceCenter;
  const seedData = [
    { id: 'l1', title: 'Auth Module', description: 'OAuth2 support', category: 'auth', rating: 4.5, version: '1.0.0', author: 'team-a' },
    { id: 'l2', title: 'Data Connector', description: 'SQL and NoSQL', category: 'data', rating: 4.0, version: '2.1.0', author: 'team-b' },
    { id: 'l3', title: 'AI Predictor', description: 'ML predictions', category: 'ai', rating: 4.8, version: '1.2.0', author: 'team-c' },
    { id: 'l4', title: 'DevOps Toolkit', description: 'CI/CD pipeline', category: 'devops', rating: 3.9, version: '1.0.0', author: 'team-d' },
    { id: 'l5', title: 'Utility Pack', description: 'Common helpers', category: 'utility', rating: 4.2, version: '3.0.0', author: 'team-e' },
    { id: 'l6', title: 'API Integrator', description: 'REST/SOAP', category: 'integration', rating: 4.1, version: '1.5.0', author: 'team-f' },
    { id: 'l7', title: 'Auth Pro', description: 'Advanced auth', category: 'auth', rating: 4.7, version: '2.0.0', author: 'team-a' },
    { id: 'l8', title: 'Data Stream', description: 'Real-time data', category: 'data', rating: 4.3, version: '1.1.0', author: 'team-b' },
  ];

  beforeEach(() => {
    mc = new MarketplaceCenter(DefaultCompanionRuntimeConfig.marketplaceCenterConfig);
    mc.seedListings(seedData);
  });

  it('browse all', async () => {
    const results = await mc.browse('s1');
    expect(results).toHaveLength(8);
  });

  for (const cat of categories) {
    it(`browse by category ${cat}`, async () => {
      const results = await mc.browse('s1', undefined, cat);
      expect(results.length).toBeGreaterThan(0);
      expect(results.every(r => r.category === cat)).toBe(true);
    });
  }

  for (let i = 0; i < 8; i++) {
    it(`browse by query "${seedData[i].title.slice(0, 4)}"`, async () => {
      const q = seedData[i].title.slice(0, 4).toLowerCase();
      const results = await mc.browse('s1', q);
      expect(results.length).toBeGreaterThan(0);
    });
  }

  for (let i = 0; i < 8; i++) {
    it(`getDetails for ${seedData[i].id}`, async () => {
      const d = await mc.getDetails('s1', seedData[i].id);
      expect(d).not.toBeNull();
      expect(d!.title).toBe(seedData[i].title);
      expect(d!.version).toBe(seedData[i].version);
      expect(d!.author).toBe(seedData[i].author);
    });
  }

  it('getDetails returns null for missing', async () => {
    expect(await mc.getDetails('s1', 'nonexistent')).toBeNull();
  });

  for (let i = 0; i < 8; i++) {
    it(`install ${seedData[i].id}`, async () => {
      const result = await mc.install('s1', seedData[i].id);
      expect(result.listingId).toBe(seedData[i].id);
      expect(result.instanceId).toBeTruthy();
    });
  }

  it('install throws for missing listing', async () => {
    await expect(mc.install('s1', 'nonexistent')).rejects.toThrow(MarketplaceError);
  });

  it('MarketplaceError has correct fields', () => {
    const e = new MarketplaceError('list-123', 'Listing not found');
    expect(e.code).toBe('MARKETPLACE_ERROR');
    expect(e.listingId).toBe('list-123');
    expect(e.message).toContain('list-123');
    expect(e).toBeInstanceOf(CompanionError);
  });

  it('browse respects maxBrowseResults', async () => {
    const cfg: MarketplaceCenterConfig = { maxBrowseResults: 3 };
    const mc2 = new MarketplaceCenter(cfg);
    mc2.seedListings(seedData);
    expect((await mc2.browse('s1'))).toHaveLength(3);
  });

  for (let i = 0; i < 8; i++) {
    it(`install returns unique instanceId ${i}`, async () => {
      const a = await mc.install('s1', seedData[i % 8].id);
      const b = await mc.install('s1', seedData[(i + 1) % 8].id);
      expect(a.instanceId).not.toBe(b.instanceId);
    });
  }

  it('browse empty marketplace', async () => {
    const mc2 = new MarketplaceCenter(DefaultCompanionRuntimeConfig.marketplaceCenterConfig);
    expect((await mc2.browse('s1'))).toHaveLength(0);
  });

  it('null eventBus', () => {
    expect(new MarketplaceCenter(DefaultCompanionRuntimeConfig.marketplaceCenterConfig, null)).toBeDefined();
  });
});

// ── CapabilityManager ───────────────────────────────────────────────────
describe('CapabilityManager', () => {
  let cm: CapabilityManager;
  beforeEach(() => { cm = new CapabilityManager(DefaultCompanionRuntimeConfig.capabilityManagerConfig); });

  for (let i = 0; i < 15; i++) {
    it(`installs capability variant ${i}`, async () => {
      const r = await cm.install('s1', `cap-${i}`, `Label ${i}`);
      expect(r.capabilityId).toBe(`cap-${i}`);
      expect(r.label).toBe(`Label ${i}`);
      expect(r.installedAt).toBeTruthy();
    });
  }

  for (let i = 1; i <= 10; i++) {
    it(`list returns ${i} capabilities`, async () => {
      for (let j = 0; j < i; j++) { await cm.install('s1', `cap-${j}`, `L${j}`); }
      expect((await cm.list('s1'))).toHaveLength(i);
    });
  }

  for (let i = 1; i <= 10; i++) {
    it(`count returns ${i}`, async () => {
      for (let j = 0; j < i; j++) { await cm.install('s1', `cap-${j}`, `L${j}`); }
      expect(await cm.count('s1')).toBe(i);
    });
  }

  for (let i = 0; i < 10; i++) {
    it(`get returns capability variant ${i}`, async () => {
      const r = await cm.install('s1', `cap-${i}`, `L${i}`);
      const found = await cm.get('s1', r.id);
      expect(found).not.toBeNull();
      expect(found!.label).toBe(`L${i}`);
    });
  }

  it('get returns null for missing', async () => {
    expect(await cm.get('s1', 'nonexistent')).toBeNull();
  });

  it('get returns null for wrong session', async () => {
    const r = await cm.install('s1', 'cap-1', 'L1');
    expect(await cm.get('s2', r.id)).toBeNull();
  });

  for (let i = 0; i < 10; i++) {
    it(`remove capability variant ${i}`, async () => {
      const r = await cm.install('s1', `cap-${i}`, `L${i}`);
      await cm.remove('s1', r.id);
      expect(await cm.get('s1', r.id)).toBeNull();
    });
  }

  it('remove throws for missing', async () => {
    await expect(cm.remove('s1', 'nonexistent')).rejects.toThrow(CapabilityError);
  });

  it('remove throws for wrong session', async () => {
    const r = await cm.install('s1', 'cap-1', 'L1');
    await expect(cm.remove('s2', r.id)).rejects.toThrow(CapabilityError);
  });

  for (const limit of [1, 3, 5, 10]) {
    it(`respects capability limit of ${limit}`, async () => {
      const cfg: CapabilityManagerConfig = { maxManagedCapabilities: limit };
      const cm2 = new CapabilityManager(cfg);
      for (let j = 0; j < limit; j++) { await cm2.install('s1', `cap-${j}`, `L${j}`); }
      await expect(cm2.install('s1', 'overflow', 'OL')).rejects.toThrow(CapabilityError);
    });
  }

  it('CapabilityError has correct fields', () => {
    const e = new CapabilityError('cap-123', 'Not found');
    expect(e.code).toBe('CAPABILITY_ERROR');
    expect(e.capabilityId).toBe('cap-123');
    expect(e).toBeInstanceOf(CompanionError);
  });

  it('list filters by session', async () => {
    await cm.install('s1', 'cap-1', 'L1');
    await cm.install('s2', 'cap-2', 'L2');
    expect((await cm.list('s1'))).toHaveLength(1);
    expect((await cm.list('s2'))).toHaveLength(1);
  });

  it('null eventBus', () => {
    expect(new CapabilityManager(DefaultCompanionRuntimeConfig.capabilityManagerConfig, null)).toBeDefined();
  });
});

// ── KnowledgeCenter ─────────────────────────────────────────────────────
describe('KnowledgeCenter', () => {
  let kc: KnowledgeCenter;
  beforeEach(() => { kc = new KnowledgeCenter(DefaultCompanionRuntimeConfig.knowledgeCenterConfig); });

  for (const cat of knowledgeCategories) {
    for (let i = 0; i < 5; i++) {
      it(`adds entry category ${cat} variant ${i}`, async () => {
        const r = await kc.add('s1', cat, `Title ${i}`, `Content for ${cat} ${i}`);
        expect(r.category).toBe(cat);
        expect(r.title).toBe(`Title ${i}`);
        expect(r.createdAt).toBeTruthy();
      });
    }
  }

  for (let i = 0; i < 10; i++) {
    it(`get returns entry variant ${i}`, async () => {
      const r = await kc.add('s1', 'cat', `T${i}`, `C${i}`);
      const found = await kc.get('s1', r.id);
      expect(found).not.toBeNull();
      expect(found!.title).toBe(`T${i}`);
      expect(found!.content).toBe(`C${i}`);
    });
  }

  it('get returns null for missing', async () => {
    expect(await kc.get('s1', 'nonexistent')).toBeNull();
  });

  it('get returns null for wrong session', async () => {
    const r = await kc.add('s1', 'cat', 'T', 'C');
    expect(await kc.get('s2', r.id)).toBeNull();
  });

  for (const cat of knowledgeCategories) {
    it(`list by category ${cat}`, async () => {
      await kc.add('s1', cat, 'T1', 'C1');
      await kc.add('s1', cat, 'T2', 'C2');
      await kc.add('s1', 'other', 'T3', 'C3');
      const results = await kc.list('s1', cat);
      expect(results).toHaveLength(2);
      expect(results.every(r => r.category === cat)).toBe(true);
    });
  }

  for (let i = 1; i <= 10; i++) {
    it(`list returns ${i} entries`, async () => {
      for (let j = 0; j < i; j++) { await kc.add('s1', 'cat', `T${j}`, `C${j}`); }
      expect((await kc.list('s1'))).toHaveLength(i);
    });
  }

  for (let i = 1; i <= 10; i++) {
    it(`count returns ${i}`, async () => {
      for (let j = 0; j < i; j++) { await kc.add('s1', 'cat', `T${j}`, `C${j}`); }
      expect(await kc.count('s1')).toBe(i);
    });
  }

  for (let i = 0; i < 10; i++) {
    it(`search finds entry variant ${i}`, async () => {
      await kc.add('s1', 'cat', `Unique-${i}`, `Content-${i}`);
      const results = await kc.search('s1', `Unique-${i}`);
      expect(results).toHaveLength(1);
      expect(results[0].category).toBe('cat');
    });
  }

  it('search by content', async () => {
    await kc.add('s1', 'cat', 'Title', 'Special content here');
    const results = await kc.search('s1', 'Special content');
    expect(results).toHaveLength(1);
  });

  it('search returns empty for no match', async () => {
    await kc.add('s1', 'cat', 'T', 'C');
    expect((await kc.search('s1', 'nonexistent'))).toHaveLength(0);
  });

  for (let i = 0; i < 10; i++) {
    it(`remove entry variant ${i}`, async () => {
      const r = await kc.add('s1', 'cat', `T${i}`, `C${i}`);
      await kc.remove('s1', r.id);
      expect(await kc.get('s1', r.id)).toBeNull();
    });
  }

  it('remove throws for missing', async () => {
    await expect(kc.remove('s1', 'nonexistent')).rejects.toThrow(KnowledgeError);
  });

  it('remove throws for wrong session', async () => {
    const r = await kc.add('s1', 'cat', 'T', 'C');
    await expect(kc.remove('s2', r.id)).rejects.toThrow(KnowledgeError);
  });

  for (const limit of [1, 3, 5, 10]) {
    it(`respects knowledge limit of ${limit}`, async () => {
      const cfg: KnowledgeCenterConfig = { maxKnowledgeEntries: limit };
      const kc2 = new KnowledgeCenter(cfg);
      for (let j = 0; j < limit; j++) { await kc2.add('s1', 'cat', `T${j}`, `C${j}`); }
      await expect(kc2.add('s1', 'cat', 'overflow', 'oc')).rejects.toThrow(KnowledgeError);
    });
  }

  it('KnowledgeError has correct fields', () => {
    const e = new KnowledgeError('ke-123', 'Not found');
    expect(e.code).toBe('KNOWLEDGE_ERROR');
    expect(e.entryId).toBe('ke-123');
    expect(e).toBeInstanceOf(CompanionError);
  });

  it('list filters by session', async () => {
    await kc.add('s1', 'cat', 'T1', 'C1');
    await kc.add('s2', 'cat', 'T2', 'C2');
    expect((await kc.list('s1'))).toHaveLength(1);
  });

  it('search filters by session', async () => {
    await kc.add('s1', 'cat', 'Search Me', 'content');
    await kc.add('s2', 'cat', 'Search Me', 'other');
    expect((await kc.search('s1', 'Search Me'))).toHaveLength(1);
  });

  it('null eventBus', () => {
    expect(new KnowledgeCenter(DefaultCompanionRuntimeConfig.knowledgeCenterConfig, null)).toBeDefined();
  });
});
