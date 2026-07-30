import os

BASE = '/home/z/my-project/src/__tests__/platform/service-container'

with open(os.path.join(BASE, 'service-container/service-container-bulk.test.ts'), 'w') as f:
    f.write('import { describe, it, expect, beforeEach } from \'vitest";\nimport { ServiceContainerImpl } from \'../../../platform/service-container/service-container.js\n\n\ndescribe('ServiceContainer Bulk', () => {\n  let c: ServiceContainerImpl;\n  beforeEach(() => { c = new ServiceContainerImpl(); });\n')
