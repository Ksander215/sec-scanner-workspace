import { describe, it, expect } from 'vitest';
import {
  KnowledgeError,
  KnowledgeItemNotFoundError,
  KnowledgeNamespaceNotFoundError,
  KnowledgeNamespaceAlreadyExistsError,
  KnowledgeDuplicateIdError,
  KnowledgeVersionNotFoundError,
  KnowledgeRelationError,
  KnowledgeCyclicRelationError,
  KnowledgeBrokenReferenceError,
  KnowledgeIsolationViolationError,
  KnowledgeStateError,
  KnowledgeValidationError,
  KnowledgeStorageError,
  KnowledgeIndexError,
  KnowledgeCapacityError,
  KnowledgeGraphConsistencyError,
} from '../../core/knowledge/errors.js';

// ─── KnowledgeError (base class) ──────────────────────────────────

describe('KnowledgeError', () => {
  it('has correct name', () => {
    const err = new KnowledgeError('something went wrong', 'TEST_CODE');
    expect(err.name).toBe('KnowledgeError');
  });

  it('has correct code', () => {
    const err = new KnowledgeError('msg', 'MY_CODE');
    expect(err.code).toBe('MY_CODE');
  });

  it('has correct message', () => {
    const err = new KnowledgeError('detailed error message', 'C');
    expect(err.message).toBe('detailed error message');
  });

  it('stores optional itemId', () => {
    const err = new KnowledgeError('msg', 'C', 'item-42');
    expect(err.itemId).toBe('item-42');
  });

  it('itemId is undefined when not provided', () => {
    const err = new KnowledgeError('msg', 'C');
    expect(err.itemId).toBeUndefined();
  });

  it('is an instance of Error', () => {
    const err = new KnowledgeError('msg', 'C');
    expect(err).toBeInstanceOf(Error);
  });

  it('is an instance of itself', () => {
    const err = new KnowledgeError('msg', 'C');
    expect(err).toBeInstanceOf(KnowledgeError);
  });

  it('has a stack trace', () => {
    const err = new KnowledgeError('msg', 'C');
    expect(err.stack).toBeDefined();
    expect(typeof err.stack).toBe('string');
  });
});

// ─── KnowledgeItemNotFoundError ───────────────────────────────────

describe('KnowledgeItemNotFoundError', () => {
  it('has correct name', () => {
    const err = new KnowledgeItemNotFoundError('item-001');
    expect(err.name).toBe('KnowledgeItemNotFoundError');
  });

  it('has correct code', () => {
    const err = new KnowledgeItemNotFoundError('item-001');
    expect(err.code).toBe('KNOWLEDGE_ITEM_NOT_FOUND');
  });

  it('includes itemId in message', () => {
    const err = new KnowledgeItemNotFoundError('abc-123');
    expect(err.message).toBe('Knowledge item not found: abc-123');
    expect(err.message).toContain('abc-123');
  });

  it('stores itemId property', () => {
    const err = new KnowledgeItemNotFoundError('xyz');
    expect(err.itemId).toBe('xyz');
  });

  it('is instance of KnowledgeError', () => {
    const err = new KnowledgeItemNotFoundError('x');
    expect(err).toBeInstanceOf(KnowledgeError);
  });

  it('is instance of Error', () => {
    const err = new KnowledgeItemNotFoundError('x');
    expect(err).toBeInstanceOf(Error);
  });
});

// ─── KnowledgeNamespaceNotFoundError ───────────────────────────────

describe('KnowledgeNamespaceNotFoundError', () => {
  it('has correct name and code', () => {
    const err = new KnowledgeNamespaceNotFoundError('ns-99');
    expect(err.name).toBe('KnowledgeNamespaceNotFoundError');
    expect(err.code).toBe('KNOWLEDGE_NAMESPACE_NOT_FOUND');
  });

  it('includes namespaceId in message', () => {
    const err = new KnowledgeNamespaceNotFoundError('ns-foo');
    expect(err.message).toContain('ns-foo');
  });

  it('stores namespaceId as itemId', () => {
    const err = new KnowledgeNamespaceNotFoundError('ns-bar');
    expect(err.itemId).toBe('ns-bar');
  });

  it('is instance of KnowledgeError and Error', () => {
    const err = new KnowledgeNamespaceNotFoundError('ns');
    expect(err).toBeInstanceOf(KnowledgeError);
    expect(err).toBeInstanceOf(Error);
  });
});

// ─── KnowledgeNamespaceAlreadyExistsError ────────────────────────

describe('KnowledgeNamespaceAlreadyExistsError', () => {
  it('has correct name and code', () => {
    const err = new KnowledgeNamespaceAlreadyExistsError('my-ns');
    expect(err.name).toBe('KnowledgeNamespaceAlreadyExistsError');
    expect(err.code).toBe('KNOWLEDGE_NAMESPACE_ALREADY_EXISTS');
  });

  it('includes name in message', () => {
    const err = new KnowledgeNamespaceAlreadyExistsError('duplicates-ns');
    expect(err.message).toContain('duplicates-ns');
  });

  it('is instance of KnowledgeError', () => {
    const err = new KnowledgeNamespaceAlreadyExistsError('ns');
    expect(err).toBeInstanceOf(KnowledgeError);
  });

  it('has no itemId since name is not an item', () => {
    const err = new KnowledgeNamespaceAlreadyExistsError('ns');
    expect(err.itemId).toBeUndefined();
  });
});

// ─── KnowledgeDuplicateIdError ───────────────────────────────────

describe('KnowledgeDuplicateIdError', () => {
  it('has correct name and code', () => {
    const err = new KnowledgeDuplicateIdError('dup-1');
    expect(err.name).toBe('KnowledgeDuplicateIdError');
    expect(err.code).toBe('KNOWLEDGE_DUPLICATE_ID');
  });

  it('includes itemId in message', () => {
    const err = new KnowledgeDuplicateIdError('dup-xyz');
    expect(err.message).toContain('dup-xyz');
  });

  it('stores itemId property', () => {
    const err = new KnowledgeDuplicateIdError('dup-xyz');
    expect(err.itemId).toBe('dup-xyz');
  });

  it('is instance of KnowledgeError', () => {
    const err = new KnowledgeDuplicateIdError('d');
    expect(err).toBeInstanceOf(KnowledgeError);
  });
});

// ─── KnowledgeVersionNotFoundError ───────────────────────────────

describe('KnowledgeVersionNotFoundError', () => {
  it('has correct name and code', () => {
    const err = new KnowledgeVersionNotFoundError('v-55');
    expect(err.name).toBe('KnowledgeVersionNotFoundError');
    expect(err.code).toBe('KNOWLEDGE_VERSION_NOT_FOUND');
  });

  it('includes versionId in message', () => {
    const err = new KnowledgeVersionNotFoundError('version-alpha');
    expect(err.message).toContain('version-alpha');
  });

  it('stores versionId as itemId', () => {
    const err = new KnowledgeVersionNotFoundError('v-1');
    expect(err.itemId).toBe('v-1');
  });

  it('is instance of KnowledgeError', () => {
    const err = new KnowledgeVersionNotFoundError('v');
    expect(err).toBeInstanceOf(KnowledgeError);
  });
});

// ─── KnowledgeRelationError ───────────────────────────────────

describe('KnowledgeRelationError', () => {
  it('has correct default code', () => {
    const err = new KnowledgeRelationError('bad relation');
    expect(err.code).toBe('KNOWLEDGE_RELATION_ERROR');
  });

  it('has correct name', () => {
    const err = new KnowledgeRelationError('bad relation');
    expect(err.name).toBe('KnowledgeRelationError');
  });

  it('accepts custom code', () => {
    const err = new KnowledgeRelationError('bad', 'CUSTOM_RELATION_CODE');
    expect(err.code).toBe('CUSTOM_RELATION_CODE');
  });

  it('is instance of KnowledgeError', () => {
    const err = new KnowledgeRelationError('msg');
    expect(err).toBeInstanceOf(KnowledgeError);
  });

  it('is instance of Error', () => {
    const err = new KnowledgeRelationError('msg');
    expect(err).toBeInstanceOf(Error);
  });
});

// ─── KnowledgeCyclicRelationError ────────────────────────────────

describe('KnowledgeCyclicRelationError', () => {
  it('has correct name and code', () => {
    const err = new KnowledgeCyclicRelationError('a', 'b');
    expect(err.name).toBe('KnowledgeCyclicRelationError');
    expect(err.code).toBe('KNOWLEDGE_CYCLIC_RELATION');
  });

  it('includes both IDs in message', () => {
    const err = new KnowledgeCyclicRelationError('src-1', 'tgt-2');
    expect(err.message).toContain('src-1');
    expect(err.message).toContain('tgt-2');
  });

  it('uses arrow notation in message', () => {
    const err = new KnowledgeCyclicRelationError('a', 'b');
    expect(err.message).toContain('\u2192');
  });

  it('is instance of KnowledgeRelationError (transitive)', () => {
    const err = new KnowledgeCyclicRelationError('a', 'b');
    expect(err).toBeInstanceOf(KnowledgeRelationError);
  });

  it('is instance of KnowledgeError', () => {
    const err = new KnowledgeCyclicRelationError('a', 'b');
    expect(err).toBeInstanceOf(KnowledgeError);
  });
});

// ─── KnowledgeBrokenReferenceError ───────────────────────────────

describe('KnowledgeBrokenReferenceError', () => {
  it('has correct name and code', () => {
    const err = new KnowledgeBrokenReferenceError('ref-1');
    expect(err.name).toBe('KnowledgeBrokenReferenceError');
    expect(err.code).toBe('KNOWLEDGE_BROKEN_REFERENCE');
  });

  it('includes referencedItemId in message', () => {
    const err = new KnowledgeBrokenReferenceError('missing-target');
    expect(err.message).toContain('missing-target');
  });

  it('stores referencedItemId as itemId', () => {
    const err = new KnowledgeBrokenReferenceError('ref-x');
    expect(err.itemId).toBe('ref-x');
  });

  it('is instance of KnowledgeError', () => {
    const err = new KnowledgeBrokenReferenceError('r');
    expect(err).toBeInstanceOf(KnowledgeError);
  });
});

// ─── KnowledgeIsolationViolationError ───────────────────────────────

describe('KnowledgeIsolationViolationError', () => {
  it('has correct name and code', () => {
    const err = new KnowledgeIsolationViolationError('ns-1', 'ns-2');
    expect(err.name).toBe('KnowledgeIsolationViolationError');
    expect(err.code).toBe('KNOWLEDGE_ISOLATION_VIOLATION');
  });

  it('includes both namespace IDs in message', () => {
    const err = new KnowledgeIsolationViolationError('owned-ns', 'rogue-ns');
    expect(err.message).toContain('owned-ns');
    expect(err.message).toContain('rogue-ns');
  });

  it('stores first namespaceId as itemId', () => {
    const err = new KnowledgeIsolationViolationError('ns-a', 'ns-b');
    expect(err.itemId).toBe('ns-a');
  });

  it('is instance of KnowledgeError', () => {
    const err = new KnowledgeIsolationViolationError('a', 'b');
    expect(err).toBeInstanceOf(KnowledgeError);
  });

  it('message describes violation direction', () => {
    const err = new KnowledgeIsolationViolationError('target-ns', 'accessor-ns');
    expect(err.message).toContain('cannot access');
  });
});

// ─── KnowledgeStateError ─────────────────────────────────────

describe('KnowledgeStateError', () => {
  it('has correct name and code', () => {
    const err = new KnowledgeStateError('invalid transition');
    expect(err.name).toBe('KnowledgeStateError');
    expect(err.code).toBe('KNOWLEDGE_INVALID_STATE');
  });

  it('accepts optional itemId', () => {
    const err = new KnowledgeStateError('bad state', 'item-5');
    expect(err.itemId).toBe('item-5');
  });

  it('itemId is undefined when omitted', () => {
    const err = new KnowledgeStateError('bad state');
    expect(err.itemId).toBeUndefined();
  });

  it('is instance of KnowledgeError', () => {
    const err = new KnowledgeStateError('msg');
    expect(err).toBeInstanceOf(KnowledgeError);
  });
});

// ─── KnowledgeValidationError ──────────────────────────────────

describe('KnowledgeValidationError', () => {
  it('has correct name and code', () => {
    const err = new KnowledgeValidationError('field missing');
    expect(err.name).toBe('KnowledgeValidationError');
    expect(err.code).toBe('KNOWLEDGE_VALIDATION_ERROR');
  });

  it('accepts optional itemId', () => {
    const err = new KnowledgeValidationError('invalid', 'item-v');
    expect(err.itemId).toBe('item-v');
  });

  it('itemId is undefined when omitted', () => {
    const err = new KnowledgeValidationError('invalid');
    expect(err.itemId).toBeUndefined();
  });

  it('is instance of KnowledgeError', () => {
    const err = new KnowledgeValidationError('msg');
    expect(err).toBeInstanceOf(KnowledgeError);
  });
});

// ─── KnowledgeStorageError ──────────────────────────────────

describe('KnowledgeStorageError', () => {
  it('has correct name and code', () => {
    const err = new KnowledgeStorageError('disk full');
    expect(err.name).toBe('KnowledgeStorageError');
    expect(err.code).toBe('KNOWLEDGE_STORAGE_ERROR');
  });

  it('passes through the message', () => {
    const err = new KnowledgeStorageError('write failed: EACCES');
    expect(err.message).toBe('write failed: EACCES');
  });

  it('is instance of KnowledgeError', () => {
    const err = new KnowledgeStorageError('msg');
    expect(err).toBeInstanceOf(KnowledgeError);
  });
});

// ─── KnowledgeIndexError ────────────────────────────────────

describe('KnowledgeIndexError', () => {
  it('has correct name and code', () => {
    const err = new KnowledgeIndexError('index corrupted');
    expect(err.name).toBe('KnowledgeIndexError');
    expect(err.code).toBe('KNOWLEDGE_INDEX_ERROR');
  });

  it('is instance of KnowledgeError', () => {
    const err = new KnowledgeIndexError('msg');
    expect(err).toBeInstanceOf(KnowledgeError);
  });
});

// ─── KnowledgeCapacityError ──────────────────────────────────

describe('KnowledgeCapacityError', () => {
  it('has correct name and code', () => {
    const err = new KnowledgeCapacityError('limit reached');
    expect(err.name).toBe('KnowledgeCapacityError');
    expect(err.code).toBe('KNOWLEDGE_CAPACITY_ERROR');
  });

  it('is instance of KnowledgeError', () => {
    const err = new KnowledgeCapacityError('msg');
    expect(err).toBeInstanceOf(KnowledgeError);
  });
});

// ─── KnowledgeGraphConsistencyError ──────────────────────────────

describe('KnowledgeGraphConsistencyError', () => {
  it('has correct name and code', () => {
    const err = new KnowledgeGraphConsistencyError('orphan nodes');
    expect(err.name).toBe('KnowledgeGraphConsistencyError');
    expect(err.code).toBe('KNOWLEDGE_GRAPH_INCONSISTENCY');
  });

  it('is instance of KnowledgeError', () => {
    const err = new KnowledgeGraphConsistencyError('msg');
    expect(err).toBeInstanceOf(KnowledgeError);
  });
});

// ─── Cross-cutting inheritance tests ──────────────────────────

describe('Inheritance chain', () => {
  const allErrors = [
    new KnowledgeError('m', 'C', 'id'),
    new KnowledgeItemNotFoundError('id'),
    new KnowledgeNamespaceNotFoundError('ns'),
    new KnowledgeNamespaceAlreadyExistsError('name'),
    new KnowledgeDuplicateIdError('id'),
    new KnowledgeVersionNotFoundError('v'),
    new KnowledgeRelationError('m'),
    new KnowledgeCyclicRelationError('a', 'b'),
    new KnowledgeBrokenReferenceError('ref'),
    new KnowledgeIsolationViolationError('a', 'b'),
    new KnowledgeStateError('m'),
    new KnowledgeValidationError('m'),
    new KnowledgeStorageError('m'),
    new KnowledgeIndexError('m'),
    new KnowledgeCapacityError('m'),
    new KnowledgeGraphConsistencyError('m'),
  ];

  it('every error extends Error', () => {
    for (const err of allErrors) {
      expect(err).toBeInstanceOf(Error);
    }
  });

  it('every error extends KnowledgeError', () => {
    for (const err of allErrors) {
      expect(err).toBeInstanceOf(KnowledgeError);
    }
  });

  it('every error has a code property', () => {
    for (const err of allErrors) {
      expect(err).toHaveProperty('code');
      expect(typeof err.code).toBe('string');
      expect(err.code.length).toBeGreaterThan(0);
    }
  });

  it('every error has a name property matching its class', () => {
    const expectedNames = [
      'KnowledgeError', 'KnowledgeItemNotFoundError', 'KnowledgeNamespaceNotFoundError',
      'KnowledgeNamespaceAlreadyExistsError', 'KnowledgeDuplicateIdError',
      'KnowledgeVersionNotFoundError', 'KnowledgeRelationError',
      'KnowledgeCyclicRelationError', 'KnowledgeBrokenReferenceError',
      'KnowledgeIsolationViolationError', 'KnowledgeStateError',
      'KnowledgeValidationError', 'KnowledgeStorageError',
      'KnowledgeIndexError', 'KnowledgeCapacityError', 'KnowledgeGraphConsistencyError',
    ];
    for (let i = 0; i < allErrors.length; i++) {
      expect(allErrors[i].name).toBe(expectedNames[i]);
    }
  });

  it('every error has a message property', () => {
    for (const err of allErrors) {
      expect(typeof err.message).toBe('string');
      expect(err.message.length).toBeGreaterThan(0);
    }
  });

  it('every error has a stack trace', () => {
    for (const err of allErrors) {
      expect(err.stack).toBeDefined();
      expect(typeof err.stack).toBe('string');
    }
  });
});

// ─── CyclicRelationError extends RelationError specifically ──────────────────

describe('KnowledgeCyclicRelationError extends KnowledgeRelationError', () => {
  it('is directly instance of KnowledgeRelationError', () => {
    const err = new KnowledgeCyclicRelationError('a', 'b');
    expect(err).toBeInstanceOf(KnowledgeRelationError);
  });

  it('overrides code from RelationError default', () => {
    const err = new KnowledgeCyclicRelationError('a', 'b');
    expect(err.code).not.toBe('KNOWLEDGE_RELATION_ERROR');
    expect(err.code).toBe('KNOWLEDGE_CYCLIC_RELATION');
  });
});
