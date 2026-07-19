#!/usr/bin/env python3
"""Validate the sec-scanner-workspace before commit.

Checks:
1. Broken links
2. Workspace structure
3. Markdown syntax
4. Mermaid syntax
5. Navigation consistency
6. INDEX.md completeness
7. CHANGELOG.md completeness
"""

import os
import re
import sys

BASE = "/home/z/my-project/sec-scanner-workspace"
errors = []
warnings = []

def check(condition, msg, is_error=True):
    if not condition:
        (errors if is_error else warnings).append(msg)
        print(f"  FAIL: {msg}")
        return False
    print(f"  OK: {msg}")
    return True

# ═══════════════════════════════════════════════════════════════
# 1. Broken links
# ═══════════════════════════════════════════════════════════════
print("\n═══ CHECK 1: Broken Links ═══")
all_md_files = []
for root, dirs, files in os.walk(BASE):
    # Skip .git directory
    if '.git' in root:
        continue
    for f in files:
        if f.endswith('.md'):
            all_md_files.append(os.path.join(root, f))

broken_links = []
for md_file in all_md_files:
    rel_path = os.path.relpath(md_file, BASE)
    with open(md_file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Find all markdown links [text](path)
    links = re.findall(r'\[([^\]]+)\]\(([^)]+)\)', content)
    for link_text, link_path in links:
        # Skip external URLs and anchors
        if link_path.startswith('http') or link_path.startswith('#') or link_path.startswith('mailto'):
            continue
        
        # Resolve relative path
        link_dir = os.path.dirname(md_file)
        resolved = os.path.normpath(os.path.join(link_dir, link_path))
        
        if not os.path.exists(resolved):
            broken_links.append(f"{rel_path}: [{link_text}]({link_path})")

check(len(broken_links) == 0, f"No broken links ({len(broken_links)} found)")
if broken_links:
    for bl in broken_links:
        print(f"    BROKEN: {bl}")

# ═══════════════════════════════════════════════════════════════
# 2. Workspace structure
# ═══════════════════════════════════════════════════════════════
print("\n═══ CHECK 2: Workspace Structure ═══")
required_paths = [
    "docs/00_governance/PROJECT_HANDOFF.md",
    "docs/00_governance/AI_CONTEXT.md",
    "docs/00_governance/ENGINEERING_MEMORY.md",
    "docs/00_governance/CTO_DECISIONS.md",
    "docs/00_governance/VISION.md",
    "docs/assets/pdf/PROJECT_HANDOFF.pdf",
    "docs/assets/html/PROJECT_HANDOFF.html",
    "docs/diagrams/handoff_platform_architecture.svg",
    "docs/diagrams/intelligence_engine.svg",
    "docs/diagrams/roadmap.svg",
    "README.md",
    "INDEX.md",
    "CHANGELOG.md",
]

missing = []
for rp in required_paths:
    full = os.path.join(BASE, rp)
    if not os.path.exists(full):
        missing.append(rp)

check(len(missing) == 0, f"All required files present ({len(missing)} missing)")
if missing:
    for m in missing:
        print(f"    MISSING: {m}")

# ═══════════════════════════════════════════════════════════════
# 3. Markdown syntax
# ═══════════════════════════════════════════════════════════════
print("\n═══ CHECK 3: Markdown Syntax ═══")
md_errors = []
for md_file in all_md_files:
    rel_path = os.path.relpath(md_file, BASE)
    with open(md_file, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    in_fenced_block = False
    for i, line in enumerate(lines, 1):
        stripped = line.strip()
        
        # Track fenced code blocks (``` ... ```)
        if stripped.startswith('```'):
            in_fenced_block = not in_fenced_block
            continue
        
        # Skip validation inside fenced blocks
        if in_fenced_block:
            continue
        
        # Check for unclosed inline code (only single backticks, not triple)
        # Remove any triple-backtick artifacts, then count single backticks
        clean = line.replace('```', '')
        single_backtick_count = clean.count('`')
        if single_backtick_count % 2 != 0:
            md_errors.append(f"{rel_path}:{i} — unclosed inline code backtick")
        
        # Check for malformed table rows (| at start but not at end)
        if stripped.startswith('|') and not stripped.endswith('|'):
            md_errors.append(f"{rel_path}:{i} — unclosed table row")

check(len(md_errors) == 0, f"Markdown syntax valid ({len(md_errors)} errors)")
if md_errors:
    for e in md_errors[:10]:
        print(f"    ERROR: {e}")

# ═══════════════════════════════════════════════════════════════
# 4. Mermaid syntax
# ═══════════════════════════════════════════════════════════════
print("\n═══ CHECK 4: Mermaid Syntax ═══")
mermaid_errors = []
for md_file in all_md_files:
    rel_path = os.path.relpath(md_file, BASE)
    with open(md_file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Extract mermaid blocks
    mermaid_blocks = re.findall(r'```mermaid\n(.*?)```', content, re.DOTALL)
    for idx, block in enumerate(mermaid_blocks):
        # Basic validation: must start with graph/flowchart/sequenceDiagram etc.
        first_line = block.strip().split('\n')[0].strip()
        valid_starts = ['graph', 'flowchart', 'sequenceDiagram', 'classDiagram', 'stateDiagram', 'erDiagram', 'gantt', 'pie', 'mindmap']
        if not any(first_line.startswith(vs) for vs in valid_starts):
            mermaid_errors.append(f"{rel_path} mermaid block {idx+1}: invalid start '{first_line}'")

check(len(mermaid_errors) == 0, f"Mermaid syntax valid ({len(mermaid_errors)} errors)")
if mermaid_errors:
    for e in mermaid_errors:
        print(f"    ERROR: {e}")

# ═══════════════════════════════════════════════════════════════
# 5. Navigation consistency
# ═══════════════════════════════════════════════════════════════
print("\n═══ CHECK 5: Navigation Consistency ═══")
nav_errors = []

# Check README.md references all governance docs
readme_path = os.path.join(BASE, "README.md")
if os.path.exists(readme_path):
    with open(readme_path, 'r', encoding='utf-8') as f:
        readme_content = f.read()
    
    required_refs = [
        "PROJECT_HANDOFF.md",
        "AI_CONTEXT.md",
        "ENGINEERING_MEMORY.md",
        "CTO_DECISIONS.md",
        "VISION.md",
    ]
    for ref in required_refs:
        if ref not in readme_content:
            nav_errors.append(f"README.md missing reference to {ref}")

check(len(nav_errors) == 0, f"Navigation consistent ({len(nav_errors)} errors)")
if nav_errors:
    for e in nav_errors:
        print(f"    ERROR: {e}")

# ═══════════════════════════════════════════════════════════════
# 6. INDEX.md completeness
# ═══════════════════════════════════════════════════════════════
print("\n═══ CHECK 6: INDEX.md Completeness ═══")
index_errors = []
index_path = os.path.join(BASE, "INDEX.md")
if os.path.exists(index_path):
    with open(index_path, 'r', encoding='utf-8') as f:
        index_content = f.read()
    
    for rp in required_paths:
        # Check that the filename appears in INDEX
        filename = os.path.basename(rp)
        if filename not in index_content:
            index_errors.append(f"INDEX.md missing entry for {filename}")

check(len(index_errors) == 0, f"INDEX.md complete ({len(index_errors)} missing)")
if index_errors:
    for e in index_errors:
        print(f"    ERROR: {e}")

# ═══════════════════════════════════════════════════════════════
# 7. CHANGELOG.md completeness
# ═══════════════════════════════════════════════════════════════
print("\n═══ CHECK 7: CHANGELOG.md Completeness ═══")
changelog_errors = []
changelog_path = os.path.join(BASE, "CHANGELOG.md")
if os.path.exists(changelog_path):
    with open(changelog_path, 'r', encoding='utf-8') as f:
        changelog_content = f.read()
    
    # Must have a version header
    check_version = bool(re.search(r'\[0\.\d+\.\d+\]', changelog_content))
    if not check_version:
        changelog_errors.append("No version header found")
    
    # Must have a date
    check_date = bool(re.search(r'\d{4}-\d{2}-\d{2}', changelog_content))
    if not check_date:
        changelog_errors.append("No date found")
    
    # Must reference added documents
    required_changelog_refs = [
        "PROJECT_HANDOFF",
        "AI_CONTEXT",
        "ENGINEERING_MEMORY",
        "CTO_DECISIONS",
        "VISION",
    ]
    for ref in required_changelog_refs:
        if ref not in changelog_content:
            changelog_errors.append(f"CHANGELOG.md missing reference to {ref}")

check(len(changelog_errors) == 0, f"CHANGELOG.md complete ({len(changelog_errors)} errors)")
if changelog_errors:
    for e in changelog_errors:
        print(f"    ERROR: {e}")

# ═══════════════════════════════════════════════════════════════
# Summary
# ═══════════════════════════════════════════════════════════════
print("\n" + "=" * 50)
if errors:
    print(f"VALIDATION FAILED: {len(errors)} errors, {len(warnings)} warnings")
    sys.exit(1)
else:
    print(f"VALIDATION PASSED: 0 errors, {len(warnings)} warnings")
    sys.exit(0)
