export interface CliConfig {
  api: {
    url: string;
    timeout: number;
  };
  auth: {
    token?: string;
  };
  output: {
    format: OutputFormat;
    color: boolean;
  };
  persistence: {
    dataDir: string;
  };
}

export type OutputFormat = 'table' | 'json' | 'yaml' | 'csv' | 'jsonl' | 'markdown';

export const DEFAULT_CONFIG: CliConfig = {
  api: {
    url: 'http://localhost:8080',
    timeout: 30000,
  },
  auth: {
    token: undefined,
  },
  output: {
    format: 'table',
    color: true,
  },
  persistence: {
    dataDir: './data/si-platform',
  },
};
