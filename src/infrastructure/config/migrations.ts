import type { ConfigMigration } from './types.js';

export const CONFIG_MIGRATIONS: ConfigMigration[] = [
  {
    fromVersion: 1,
    toVersion: 2,
    description: 'Migrate from flat config to layered config with new sections',
    migrate(config: Record<string, unknown>): Record<string, unknown> {
      const result = { ...config };
      // v1 had flat keys like 'port', 'host' → move to server.*
      if ('port' in result && !('server' in result)) {
        result.server = { ...(result.server as object || {}), port: result.port };
        delete result.port;
      }
      if ('host' in result && !('server' in result)) {
        result.server = { ...(result.server as object || {}), host: result.host };
        delete result.host;
      }
      // v1 had 'dbType' → persistence.backend
      if ('dbType' in result) {
        result.persistence = { ...(result.persistence as object || {}), backend: result.dbType };
        delete result.dbType;
      }
      // Ensure version is updated
      result.$meta = { ...(result.$meta as object || {}), version: 2 };
      return result;
    },
  },
];
