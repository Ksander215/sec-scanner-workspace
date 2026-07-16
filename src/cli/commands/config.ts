import type { Command } from 'commander';
import { ConfigManager } from '../config/manager.js';

export function registerConfigCommand(program: Command, configManager: ConfigManager): void {
  const config = program.command('config').description('Configuration management');

  config
    .command('init')
    .description('Initialize configuration')
    .action(async () => {
      await configManager.save();
      console.log('Configuration initialized at ~/.si/config.json');
    });

  config
    .command('set <key> <value>')
    .description('Set a configuration value')
    .action(async (key: string, value: string) => {
      configManager.set(key, value);
      await configManager.save();
      console.log(`Set ${key} = ${value}`);
    });

  config
    .command('show')
    .description('Show current configuration')
    .action(async () => {
      const cfg = configManager.get();
      console.log(JSON.stringify(cfg, null, 2));
    });
}
