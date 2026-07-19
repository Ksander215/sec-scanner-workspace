#!/usr/bin/env python3
"""
OPS-003 Final Audit — Architecture Baseline v1.1
Checks: broken links, structure, secrets, temp files, README/INDEX/CHANGELOG freshness
"""

import os
import re
import sys

REPO_ROOT = '/home/z/my-project/sec-scanner-workspace'

errors = []
warnings = []

# ─── 1. Broken Links Check ───
print("=" * 60)
print("1. BROKEN LINKS CHECK")
print("=" * 60)

md_files = []
for root, dirs, files in os.walk(REPO_ROOT):
    # Skip .git
    dirs[:] = [d for d in dirs if d != '.git']
    for f in files:
        if f.endswith('.md'):
            md_files.append(os.path.join(root, f))

link_pattern = re.compile(r'\[([^\]]*)\]\(([^)]+)\)')
broken_links = []

for md_file in md_files:
    rel_path = os.path.relpath(md_file, REPO_ROOT)
    with open(md_file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    links = link_pattern.findall(content)
    for text, href in links:
        # Skip external URLs and anchors
        if href.startswith('http') or href.startswith('#') or href.startswith('mailto'):
            continue
        
        # Resolve relative path
        file_dir = os.path.dirname(md_file)
        target = os.path.normpath(os.path.join(file_dir, href))
        
        if not os.path.exists(target):
            broken_links.append(f"  BROKEN: {rel_path} -> {href}")

if broken_links:
    for bl in broken_links:
        print(bl)
        errors.append(f"Broken link: {bl}")
else:
    print("  PASS: No broken links found")

# ─── 2. Structure Check ───
print("\n" + "=" * 60)
print("2. STRUCTURE CHECK")
print("=" * 60)

required_dirs = [
    'docs',
    'docs/00_governance',
    'docs/01_architecture',
    'docs/assets',
    'docs/assets/pdf',
    'docs/assets/html',
    'docs/diagrams',
]

for d in required_dirs:
    full = os.path.join(REPO_ROOT, d)
    if os.path.isdir(full):
        print(f"  PASS: {d}/")
    else:
        print(f"  FAIL: {d}/ missing")
        errors.append(f"Missing directory: {d}/")

required_files = [
    'README.md',
    'INDEX.md',
    'CHANGELOG.md',
    '.gitignore',
    'docs/00_governance/PROJECT_HANDOFF.md',
    'docs/00_governance/AI_CONTEXT.md',
    'docs/00_governance/ENGINEERING_MEMORY.md',
    'docs/00_governance/CTO_DECISIONS.md',
    'docs/00_governance/VISION.md',
    'docs/01_architecture/RFC-001_SECURITY_INTELLIGENCE_ENGINE.md',
    'docs/01_architecture/RFC_REVIEW_REPORT.md',
    'docs/01_architecture/KG-001_KNOWLEDGE_GRAPH_ARCHITECTURE.md',
    'docs/01_architecture/KG_ARCHITECTURE_REVIEW_REPORT.md',
]

for f in required_files:
    full = os.path.join(REPO_ROOT, f)
    if os.path.isfile(full):
        size = os.path.getsize(full)
        print(f"  PASS: {f} ({size} bytes)")
    else:
        print(f"  FAIL: {f} missing")
        errors.append(f"Missing file: {f}")

# ─── 3. Secrets Check ───
print("\n" + "=" * 60)
print("3. SECRETS CHECK")
print("=" * 60)

secret_patterns = [
    (r'AKIA[0-9A-Z]{16}', 'AWS Access Key'),
    (r'aws[A-Za-z0-9/+]{40}', 'AWS Secret Key'),
    (r'ghp_[A-Za-z0-9]{36}', 'GitHub PAT'),
    (r'gho_[A-Za-z0-9]{36}', 'GitHub OAuth'),
    (r'ghs_[A-Za-z0-9]{36}', 'GitHub App Token'),
    (r'sk-[A-Za-z0-9]{20,}', 'OpenAI API Key'),
    (r'xox[bpas]-[A-Za-z0-9-]+', 'Slack Token'),
    (r'-----BEGIN (?:RSA |EC )?PRIVATE KEY-----', 'Private Key'),
]

secrets_found = []

for root, dirs, files in os.walk(REPO_ROOT):
    dirs[:] = [d for d in dirs if d != '.git']
    for fname in files:
        fpath = os.path.join(root, fname)
        # Skip binary files
        try:
            with open(fpath, 'r', encoding='utf-8') as f:
                content = f.read()
        except (UnicodeDecodeError, PermissionError):
            continue
        
        rel = os.path.relpath(fpath, REPO_ROOT)
        for pattern, name in secret_patterns:
            matches = re.findall(pattern, content)
            if matches:
                secrets_found.append(f"  SECRET: {rel} — {name} ({len(matches)} occurrence(s))")

if secrets_found:
    for s in secrets_found:
        print(s)
        errors.append(s)
else:
    print("  PASS: No secrets detected")

# ─── 4. Temp Files Check ───
print("\n" + "=" * 60)
print("4. TEMP FILES CHECK")
print("=" * 60)

temp_patterns = ['*.tmp', '*.bak', '*.swp', '*.swo', '*~', '.DS_Store', 'Thumbs.db', '*.pyc', '__pycache__']
temp_found = []

for root, dirs, files in os.walk(REPO_ROOT):
    dirs[:] = [d for d in dirs if d != '.git']
    for fname in files:
        for pat in temp_patterns:
            if pat.startswith('*'):
                if fname.endswith(pat[1:]):
                    temp_found.append(os.path.relpath(os.path.join(root, fname), REPO_ROOT))
            elif fname == pat:
                temp_found.append(os.path.relpath(os.path.join(root, fname), REPO_ROOT))

if temp_found:
    for t in temp_found:
        print(f"  TEMP: {t}")
        warnings.append(f"Temp file: {t}")
else:
    print("  PASS: No temporary files found")

# ─── 5. README.md Freshness ───
print("\n" + "=" * 60)
print("5. README.md FRESHNESS")
print("=" * 60)

readme_path = os.path.join(REPO_ROOT, 'README.md')
with open(readme_path, 'r') as f:
    readme = f.read()

checks = [
    ('KG-001', 'KG-001 reference in README'),
    ('RFC-001', 'RFC-001 reference in README'),
    ('Architecture', 'Architecture section in README'),
    ('Governance', 'Governance section in README'),
]

for keyword, desc in checks:
    if keyword in readme:
        print(f"  PASS: {desc}")
    else:
        print(f"  WARN: {desc} — not found")
        warnings.append(f"README missing: {desc}")

# ─── 6. INDEX.md Freshness ───
print("\n" + "=" * 60)
print("6. INDEX.md FRESHNESS")
print("=" * 60)

index_path = os.path.join(REPO_ROOT, 'INDEX.md')
with open(index_path, 'r') as f:
    index = f.read()

index_checks = [
    ('KG-001', 'KG-001 in INDEX'),
    ('RFC-001', 'RFC-001 in INDEX'),
    ('KG_ARCHITECTURE_REVIEW', 'KG Review in INDEX'),
    ('RFC_REVIEW_REPORT', 'RFC Review in INDEX'),
]

for keyword, desc in index_checks:
    if keyword in index:
        print(f"  PASS: {desc}")
    else:
        print(f"  FAIL: {desc} — not found")
        errors.append(f"INDEX missing: {desc}")

# ─── 7. CHANGELOG.md Freshness ───
print("\n" + "=" * 60)
print("7. CHANGELOG.md FRESHNESS")
print("=" * 60)

changelog_path = os.path.join(REPO_ROOT, 'CHANGELOG.md')
with open(changelog_path, 'r') as f:
    changelog = f.read()

cl_checks = [
    ('0.3.0', 'Version 0.3.0 entry'),
    ('KG-001', 'KG-001 entry'),
    ('0.2.0', 'Version 0.2.0 entry'),
    ('RFC-001', 'RFC-001 entry'),
    ('0.1.0', 'Version 0.1.0 entry'),
]

for keyword, desc in cl_checks:
    if keyword in changelog:
        print(f"  PASS: {desc}")
    else:
        print(f"  FAIL: {desc} — not found")
        errors.append(f"CHANGELOG missing: {desc}")

# ─── Summary ───
print("\n" + "=" * 60)
print("AUDIT SUMMARY")
print("=" * 60)
print(f"  Errors:   {len(errors)}")
print(f"  Warnings: {len(warnings)}")

if errors:
    print("\n  ERRORS:")
    for e in errors:
        print(f"    - {e}")

if warnings:
    print("\n  WARNINGS:")
    for w in warnings:
        print(f"    - {w}")

if not errors:
    print("\n  ✅ AUDIT PASSED — Ready for Architecture Baseline v1.1")
    sys.exit(0)
else:
    print("\n  ❌ AUDIT FAILED — Fix errors before proceeding")
    sys.exit(1)
