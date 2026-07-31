#!/usr/bin/env python3
"""Fix unused imports in compliance module."""
import re, os

base = '/home/z/my-project/src/core/compliance'

# Files that have unused ComplianceRule import but DO use it via registerRules
# Check each file for actual usage
files_with_unused_compliance_rule = [
    'capability-validator.ts', 'constraint-validator.ts', 'documentation-validator.ts',
    'privacy-validator.ts', 'quality-validator.ts', 'security-validator.ts',
    'trace-validator.ts', 'value-validator.ts',
]

for fname in files_with_unused_compliance_rule:
    fpath = os.path.join(base, fname)
    with open(fpath, 'r') as f:
        content = f.read()
    
    # Check if ComplianceRule is actually used beyond the import
    # Count occurrences (import line + actual usages)
    uses = len(re.findall(r'ComplianceRule', content)) - len(re.findall(r'ComplianceRule', re.search(r'import[^;]*ComplianceRule[^;]*;', content).group() if re.search(r'import[^;]*ComplianceRule[^;]*;', content) else ''))
    
    if uses == 0:
        # Remove ComplianceRule from import
        content = re.sub(r',\s*ComplianceRule\s*', '', content)
        content = re.sub(r'ComplianceRule\s*,\s*', '', content)
        with open(fpath, 'w') as f:
            f.write(content)
        print(f'Fixed {fname}: removed unused ComplianceRule import')

# Fix architecture-validator.ts: remove unused RuleId
fpath = os.path.join(base, 'architecture-validator.ts')
with open(fpath, 'r') as f:
    content = f.read()
content = content.replace('  RuleId,\n', '')
with open(fpath, 'w') as f:
    f.write(content)
print('Fixed architecture-validator.ts: removed unused RuleId import')

# Fix runtime-validator.ts: remove unused RuleId, ComplianceRule
fpath = os.path.join(base, 'runtime-validator.ts')
with open(fpath, 'r') as f:
    content = f.read()
content = content.replace('  RuleId,\n', '')
# Check if ComplianceRule is used
if len(re.findall(r'ComplianceRule', content)) <= 1:  # only in import
    content = re.sub(r',\s*ComplianceRule\s*', '', content)
with open(fpath, 'w') as f:
    f.write(content)
print('Fixed runtime-validator.ts: removed unused imports')

# Fix eventBus unused in all validators - prefix with _ or use void
for fname in os.listdir(base):
    if not fname.endswith('-validator.ts'):
        continue
    fpath = os.path.join(base, fname)
    with open(fpath, 'r') as f:
        content = f.read()
    # Replace 'private readonly eventBus' with underscore prefix
    content = content.replace('private readonly eventBus:', 'private readonly _eventBus:')
    content = content.replace('this.eventBus', 'this._eventBus')
    with open(fpath, 'w') as f:
        f.write(content)
    print(f'Fixed {fname}: renamed eventBus to _eventBus')

print('Done')
