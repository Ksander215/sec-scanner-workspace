# Система плагинов SIP

## Обзор

Система плагинов — ключевая архитектурная особенность SIP, обеспечивающая расширяемость платформы без модификации ядра. Плагины позволяют добавлять новые типы сканеров, парсеры отчётов, генераторы отчётов, интеграции с внешними сервисами и кастомные визуализации. Каждый плагин выполняется в изолированной среде (sandbox) с явно декларированными правами доступа, что гарантирует безопасность и стабильность основной системы даже при наличии ошибок или злонамеренного кода в сторонних расширениях. Жизненный цикл плагина полностью управляется через PluginRegistry — от установки и активации до обновления и удаления.

---

## Формат манифеста

Каждый плагин обязан содержать файл `sip.plugin.json` в корне директории. Манифест описывает метаданные плагина, его точки расширения, требования к окружению и запрашиваемые права. Пример полного манифеста:

```json
{
  "name": "sip-k8s-scanner",
  "version": "1.2.0",
  "description": "Сканер безопасности Kubernetes-кластеров с поддержкой CIS Benchmarks",
  "author": "SIP Community",
  "license": "MIT",
  "homepage": "https://github.com/sip-plugins/k8s-scanner",
  "minSipVersion": "0.3.0",
  "maxSipVersion": "0.x",
  "category": "scanner",
  "permissions": [
    "network:scan",
    "filesystem:read:/tmp",
    "api:findings:write"
  ],
  "extensionPoints": {
    "scanner": {
      "id": "k8s-scanner",
      "label": "Kubernetes Security Audit",
      "icon": "kubernetes",
      "configSchema": {
        "context": { "type": "string", "label": "Kubeconfig context", "required": true },
        "namespaces": { "type": "string[]", "label": "Target namespaces", "default": ["default"] },
        "benchmarks": { "type": "string[]", "label": "CIS Benchmarks", "default": ["cis-1.8"], "enum": ["cis-1.8", "nist-800-190"] },
        "timeout": { "type": "number", "label": "Timeout (seconds)", "default": 300 }
      }
    }
  },
  "hooks": ["beforeScan", "afterScan", "onFinding"],
  "dependencies": {
    "sip-sdk": "^0.3.0"
  },
  "entry": "./dist/index.js"
}
```

### Обязательные поля

- **name** — уникальный идентификатор плагина (kebab-case, префикс `sip-` для официальных плагинов).
- **version** — семантическая версия (SemVer).
- **category** — категория: `scanner`, `parser`, `report`, `integration`, `visualization`.
- **permissions** — список запрашиваемых прав в формате `ресурс:действие:объект`. Пользователь подтверждает права при установке.
- **entry** — точка входа — путь к скомпилированному JavaScript-файлу.

---

## Как создать плагин

### Шаг 1: Инициализация

Используйте CLI-утилиту SIP для создания шаблона плагина:

```bash
npx sip-plugin create my-scanner
cd my-scanner
```

Команда создаст структуру директорий, манифест `sip.plugin.json` и файл точки входа `src/index.ts`.

### Шаг 2: Структура проекта

```
my-scanner/
├── sip.plugin.json       # Манифест плагина
├── src/
│   ├── index.ts          # Точка входа, регистрация расширений
│   ├── scanner.ts        # Логика сканирования
│   └── types.ts          # TypeScript-типы
├── dist/                 # Скомпилированный JavaScript (git-ignored)
├── tests/
│   └── scanner.test.ts   # Модульные тесты
├── package.json
└── tsconfig.json
```

### Шаг 3: Реализация

Каждый тип расширения реализует соответствующий интерфейс SDK. Пример для сканер-плагина:

```typescript
import { SipPlugin, ScannerExtension, ScanContext, ScanResult } from 'sip-sdk';

export default class K8sScannerPlugin extends SipPlugin {
  onRegister(registry: PluginRegistry): void {
    registry.registerScanner({
      id: 'k8s-scanner',
      label: 'Kubernetes Security Audit',
      execute: async (context: ScanContext, config: any): Promise<ScanResult> => {
        const findings = await this.scanCluster(config.context, config.namespaces);
        return {
          findings: findings.map(f => this.normalizeFinding(f)),
          stats: { scanned: findings.length, duration: Date.now() - context.startTime }
        };
      }
    });
  }

  private async scanCluster(kubeContext: string, namespaces: string[]): Promise<RawFinding[]> {
    // Реализация сканирования Kubernetes-кластера
    // Использование kubectl, kube-bench и кастомных проверок
  }
}
```

### Шаг 4: Хуки

Плагины могут подписываться на события ядра через систему хуков:

- **beforeScan** — вызывается перед запуском сканирования, позволяет модифицировать конфигурацию или отменить сканирование.
- **afterScan** — вызывается после завершения сканирования, позволяет обогатить результаты дополнительными данными.
- **onFinding** — вызывается при обнаружении каждой новой уязвимости, позволяет добавить контекст, изменить критичность или создать связанный тикет в Jira.
- **onReport** — вызывается при генерации отчёта, позволяет добавить кастомные разделы или модифицировать существующие.

```typescript
onRegister(registry: PluginRegistry): void {
  registry.hook('onFinding', async (finding: Finding, context: HookContext) => {
    // Автоматически создавать Jira-тикет для критических находок
    if (finding.severity === 'critical') {
      await jiraClient.createIssue({
        summary: `[SIP] ${finding.title} on ${finding.asset}`,
        priority: 'Highest',
        labels: ['security', 'sip-auto']
      });
    }
  });
}
```

### Шаг 5: Тестирование

SIP SDK предоставляет утилиты для тестирования плагинов:

```typescript
import { createTestRegistry, mockScanContext } from 'sip-sdk/testing';

describe('K8s Scanner', () => {
  it('should detect privileged containers', async () => {
    const registry = createTestRegistry();
    const plugin = new K8sScannerPlugin();
    plugin.onRegister(registry);

    const scanner = registry.getScanner('k8s-scanner');
    const result = await scanner.execute(mockScanContext(), { context: 'test', namespaces: ['default'] });

    expect(result.findings).toContainEqual(
      expect.objectContaining({ type: 'privileged-container', severity: 'high' })
    );
  });
});
```

### Шаг 6: Сборка и публикация

```bash
npm run build                    # Сборка TypeScript → JavaScript
npx sip-plugin validate          # Валидация манифеста и структуры
npx sip-plugin pack              # Упаковка в .sip-plugin.tar.gz
npx sip-plugin publish           # Публикация в Marketplace
```

---

## Среда выполнения (Runtime)

Плагины загружаются в изолированную среду на базе `isolated-vm`. Каждому плагину выделяется отдельный контекст с ограниченной памятью (по умолчанию 128 МБ) и таймаутом выполнения (30 секунд для хуков, настраиваемый для сканеров). Доступ к API ядра осуществляется через прокси-объекты, обеспечивающие контроль за каждым вызовом и логирование. Плагин не имеет прямого доступа к файловой системе, сети или переменным окружения — все действия выполняются через санкционированные SDK-методы.

Хотрелоад позволяет обновлять плагины без перезапуска сервера: PluginRegistry деактивирует старую версию, загружает новую и перенаправляет хуки. Активные сканирования завершаются на старой версии, новые запускаются на обновлённой. Это обеспечивает бесшовные обновления в production-окружении.
