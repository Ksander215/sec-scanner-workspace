#!/usr/bin/env python3
"""Fix template-generated test files with wrong imports, orphaned describe blocks, and wrong names."""
import re, os

BASE = "/home/z/my-project/src/__tests__/desktop"

FIXES = {
    "command-palette/command-palette.test.ts": {
        "import_line": "import { CommandPaletteRuntime } from '../../../desktop/command-palette/command-palette.js';",
        "correct_name": "CommandPaletteRuntime",
    },
    "crash-recovery/crash-recovery.test.ts": {
        "import_line": "import { CrashRecoveryRuntime } from '../../../desktop/crash-recovery-runtime/crash-recovery-runtime.js';",
        "correct_name": "CrashRecoveryRuntime",
    },
    "diagnostics/diagnostics.test.ts": {
        "import_line": "import { DiagnosticsRuntime } from '../../../desktop/diagnostics-runtime/diagnostics-runtime.js';",
        "correct_name": "DiagnosticsRuntime",
    },
    "local-storage/local-storage.test.ts": {
        "import_line": "import { LocalStorageRuntime } from '../../../desktop/local-storage-runtime/local-storage-runtime.js';",
        "correct_name": "LocalStorageRuntime",
    },
    "notification/notification.test.ts": {
        "import_line": "import { NotificationRuntime } from '../../../desktop/notification-runtime/notification-runtime.js';",
        "correct_name": "NotificationRuntime",
    },
    "search/search.test.ts": {
        "import_line": "import { SearchRuntime } from '../../../desktop/search-runtime/search-runtime.js';",
        "correct_name": "SearchRuntime",
    },
    "settings/settings.test.ts": {
        "import_line": "import { SettingsRuntime } from '../../../desktop/settings-runtime/settings-runtime.js';",
        "correct_name": "SettingsRuntime",
    },
    "startup/startup.test.ts": {
        "import_line": "import { StartupRuntime } from '../../../desktop/startup-runtime/startup-runtime.js';",
        "correct_name": "StartupRuntime",
    },
}

# Orphaned block pattern (line 2 after import line)
ORPHAN_PATTERN = r"  describe\('lifecycle', \(\) => \{\n.*?\n  \}\);\n"

for rel_path, fix in FIXES.items():
    filepath = os.path.join(BASE, rel_path)
    with open(filepath, 'r') as f:
        content = f.read()
    
    # Fix line 2: remove orphaned describe block and fix import
    # Line 1 is: import { describe, it, expect, beforeEach } from 'vitest';
    # Line 2 is: import { ... } from '...';  describe('lifecycle', () => { ... });
    lines = content.split('\n')
    
    # Reconstruct line 2: just the import, no orphaned block
    new_lines = [lines[0], fix["import_line"]]
    # Skip lines 2-9 (orphaned block + blank line)
    # Find where the real describe block starts
    skip_until_describe = True
    for i in range(2, len(lines)):
        if skip_until_describe:
            if lines[i].strip().startswith("describe('"):
                skip_until_describe = False
                new_lines.append(lines[i])
        else:
            new_lines.append(lines[i])
    
    new_content = '\n'.join(new_lines)
    
    # Fix wrong name 'LocalStorageRuntime' -> correct name
    new_content = new_content.replace(
        "expect(runtime.name).toBe('LocalStorageRuntime')",
        f"expect(runtime.name).toBe('{fix['correct_name']}')"
    )
    
    with open(filepath, 'w') as f:
        f.write(new_content)
    
    print(f"Fixed: {rel_path}")

print("\nAll 8 files fixed.")
