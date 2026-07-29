/**
 * Knowledge Runtime — Error Hierarchy
 * TASK-AIS-003E.000 — Knowledge Runtime Foundation
 */

export class KnowledgeError extends Error {
  public readonly code: string;
  public readonly itemId?: string;

  constructor(message: string, code: string, itemId?: string) {
    super(message);
    this.name = 'KnowledgeError';
    this.code = code;
    this.itemId = itemId;
  }
}

export class KnowledgeItemNotFoundError extends KnowledgeError {
  constructor(itemId: string) {
    super(`Knowledge item not found: ${itemId}`, 'KNOWLEDGE_ITEM_NOT_FOUND', itemId);
    this.name = 'KnowledgeItemNotFoundError';
  }
}

export class KnowledgeNamespaceNotFoundError extends KnowledgeError {
  constructor(namespaceId: string) {
    super(`Knowledge namespace not found: ${namespaceId}`, 'KNOWLEDGE_NAMESPACE_NOT_FOUND', namespaceId);
    this.name = 'KnowledgeNamespaceNotFoundError';
  }
}

export class KnowledgeNamespaceAlreadyExistsError extends KnowledgeError {
  constructor(name: string) {
    super(`Knowledge namespace already exists: ${name}`, 'KNOWLEDGE_NAMESPACE_ALREADY_EXISTS');
    this.name = 'KnowledgeNamespaceAlreadyExistsError';
  }
}

export class KnowledgeDuplicateIdError extends KnowledgeError {
  constructor(itemId: string) {
    super(`Duplicate knowledge item ID: ${itemId}`, 'KNOWLEDGE_DUPLICATE_ID', itemId);
    this.name = 'KnowledgeDuplicateIdError';
  }
}

export class KnowledgeVersionNotFoundError extends KnowledgeError {
  constructor(versionId: string) {
    super(`Knowledge version not found: ${versionId}`, 'KNOWLEDGE_VERSION_NOT_FOUND', versionId);
    this.name = 'KnowledgeVersionNotFoundError';
  }
}

export class KnowledgeRelationError extends KnowledgeError {
  constructor(message: string, code: string = 'KNOWLEDGE_RELATION_ERROR') {
    super(message, code);
    this.name = 'KnowledgeRelationError';
  }
}

export class KnowledgeCyclicRelationError extends KnowledgeRelationError {
  constructor(sourceId: string, targetId: string) {
    super(
      `Cyclic relation detected: ${sourceId} → ${targetId}`,
      'KNOWLEDGE_CYCLIC_RELATION',
    );
    this.name = 'KnowledgeCyclicRelationError';
  }
}

export class KnowledgeBrokenReferenceError extends KnowledgeError {
  constructor(referencedItemId: string) {
    super(`Broken reference: target item ${referencedItemId} does not exist`, 'KNOWLEDGE_BROKEN_REFERENCE', referencedItemId);
    this.name = 'KnowledgeBrokenReferenceError';
  }
}

export class KnowledgeIsolationViolationError extends KnowledgeError {
  constructor(namespaceId: string, accessorNamespaceId: string) {
    super(
      `Namespace isolation violation: ${accessorNamespaceId} cannot access ${namespaceId}`,
      'KNOWLEDGE_ISOLATION_VIOLATION',
      namespaceId,
    );
    this.name = 'KnowledgeIsolationViolationError';
  }
}

export class KnowledgeStateError extends KnowledgeError {
  constructor(message: string, itemId?: string) {
    super(message, 'KNOWLEDGE_INVALID_STATE', itemId);
    this.name = 'KnowledgeStateError';
  }
}

export class KnowledgeValidationError extends KnowledgeError {
  constructor(message: string, itemId?: string) {
    super(message, 'KNOWLEDGE_VALIDATION_ERROR', itemId);
    this.name = 'KnowledgeValidationError';
  }
}

export class KnowledgeStorageError extends KnowledgeError {
  constructor(message: string) {
    super(message, 'KNOWLEDGE_STORAGE_ERROR');
    this.name = 'KnowledgeStorageError';
  }
}

export class KnowledgeIndexError extends KnowledgeError {
  constructor(message: string) {
    super(message, 'KNOWLEDGE_INDEX_ERROR');
    this.name = 'KnowledgeIndexError';
  }
}

export class KnowledgeCapacityError extends KnowledgeError {
  constructor(message: string) {
    super(message, 'KNOWLEDGE_CAPACITY_ERROR');
    this.name = 'KnowledgeCapacityError';
  }
}

export class KnowledgeGraphConsistencyError extends KnowledgeError {
  constructor(message: string) {
    super(message, 'KNOWLEDGE_GRAPH_INCONSISTENCY');
    this.name = 'KnowledgeGraphConsistencyError';
  }
}
