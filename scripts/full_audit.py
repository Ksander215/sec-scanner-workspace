#!/usr/bin/env python3
"""
OPS-002: Pre-Production Repository Audit & Release
Comprehensive audit of sec-scanner-workspace before first push.
"""

import os
import re
import sys
import json
import hashlib
from datetime import datetime
from pathlib import Path

BASE = "/home/z/my-project/sec-scanner-workspace"

# Audit results storage
audit_results = {
    "stage_1_integrity": {"pass": True, "details": []},
    "stage_2_documentation": {"pass": True, "details": []},
    "stage_3_security": {"pass": True, "details": []},
    "stage_4_markdown": {"pass": True, "details": []},
    "stage_5_health": {"pass": True, "details": []},
    "stage_6_release": {"pass": True, "details": []},
    "stage_7_quality_gate": {"pass": True, "details": []},
}

errors = []
warnings = []

def pass_fail(condition, stage, msg, is_error=True):
    """Record a check result."""
    status = "PASS" if condition else "FAIL"
    if not condition:
        audit_results[stage]["pass"] = False
        (errors if is_error else warnings).append(f"[{stage}] {msg}")
    audit_results[stage]["details"].append({"check": msg, "status": status})
    icon = "✓" if condition else ("✗" if is_error else "⚠")
    print(f"  {icon} {status}: {msg}")
    return condition

def get_all_files(repo_base, exclude_git=True):
    """Get all files in the repository."""
    files = []
    for root, dirs, filenames in os.walk(repo_base):
        if exclude_git and '.git' in root.split(os.sep):
            continue
        if exclude_git and '.git' in dirs:
            dirs.remove('.git')
        for f in filenames:
            files.append(os.path.join(root, f))
    return files

def read_file(path):
    """Read file content."""
    try:
        with open(path, 'r', encoding='utf-8', errors='replace') as f:
            return f.read()
    except Exception as e:
        return f"ERROR_READING: {e}"

def file_size(path):
    """Get file size in bytes."""
    return os.path.getsize(path)

# ═══════════════════════════════════════════════════════════════════════
# STAGE 1 — Repository Integrity Audit
# ═══════════════════════════════════════════════════════════════════════
print("\n" + "=" * 70)
print("STAGE 1 — Repository Integrity Audit")
print("=" * 70)

STAGE = "stage_1_integrity"

# 1.1 Directory structure
print("\n── 1.1 Directory Structure ──")
expected_dirs = [
    "docs",
    "docs/00_governance",
    "docs/assets",
    "docs/assets/pdf",
    "docs/assets/html",
    "docs/diagrams",
]
for d in expected_dirs:
    full = os.path.join(BASE, d)
    pass_fail(os.path.isdir(full), STAGE, f"Directory exists: {d}/")

# 1.2 No duplicates
print("\n── 1.2 Duplicate Detection ──")
all_files = get_all_files(BASE)
filenames = [os.path.basename(f) for f in all_files]
seen = {}
duplicates = []
for f, name in zip(all_files, filenames):
    if name in seen:
        duplicates.append((seen[name], f))
    else:
        seen[name] = f
pass_fail(len(duplicates) == 0, STAGE, f"No duplicate filenames ({len(duplicates)} found)")
if duplicates:
    for d1, d2 in duplicates:
        print(f"    DUP: {os.path.relpath(d1, BASE)} <-> {os.path.relpath(d2, BASE)}")

# 1.3 No orphaned documents
print("\n── 1.3 Orphan Detection ──")
# Files not referenced from any other document
md_files = [f for f in all_files if f.endswith('.md')]
non_root_files = [f for f in all_files if not os.path.basename(f).startswith('.')]

# Collect all references from markdown files
all_refs = set()
for md_file in md_files:
    content = read_file(md_file)
    # Markdown links
    refs = re.findall(r'\[([^\]]*)\]\(([^)]+)\)', content)
    for _, ref_path in refs:
        if not ref_path.startswith('http') and not ref_path.startswith('#'):
            all_refs.add(ref_path)

# Check each non-root file is referenced somewhere
orphaned = []
for f in non_root_files:
    rel = os.path.relpath(f, BASE)
    basename = os.path.basename(f)
    # Root files (README, INDEX, CHANGELOG) are never orphans
    if rel in ['README.md', 'INDEX.md', 'CHANGELOG.md']:
        continue
    # Check if filename or path appears in any reference
    found = False
    for ref in all_refs:
        if basename in ref or rel in ref:
            found = True
            break
    # Also check if referenced from INDEX.md
    index_content = read_file(os.path.join(BASE, "INDEX.md"))
    if basename in index_content:
        found = True
    if not found:
        orphaned.append(rel)

pass_fail(len(orphaned) == 0, STAGE, f"No orphaned files ({len(orphaned)} found)")
if orphaned:
    for o in orphaned:
        print(f"    ORPHAN: {o}")

# 1.4 Link correctness
print("\n── 1.4 Link Correctness ──")
broken_links = []
for md_file in md_files:
    rel_path = os.path.relpath(md_file, BASE)
    content = read_file(md_file)
    links = re.findall(r'\[([^\]]*)\]\(([^)]+)\)', content)
    for link_text, link_path in links:
        if link_path.startswith('http') or link_path.startswith('#') or link_path.startswith('mailto'):
            continue
        link_dir = os.path.dirname(md_file)
        resolved = os.path.normpath(os.path.join(link_dir, link_path))
        if not os.path.exists(resolved):
            broken_links.append(f"{rel_path}: [{link_text}]({link_path})")

pass_fail(len(broken_links) == 0, STAGE, f"No broken links ({len(broken_links)} found)")
if broken_links:
    for bl in broken_links:
        print(f"    BROKEN: {bl}")

# 1.5 Navigation consistency
print("\n── 1.5 Navigation Consistency ──")
readme_content = read_file(os.path.join(BASE, "README.md"))
index_content = read_file(os.path.join(BASE, "INDEX.md"))

nav_issues = []
governance_docs = ["PROJECT_HANDOFF.md", "AI_CONTEXT.md", "ENGINEERING_MEMORY.md", "CTO_DECISIONS.md", "VISION.md"]
for doc in governance_docs:
    if doc not in readme_content:
        nav_issues.append(f"README.md missing reference to {doc}")
    if doc not in index_content:
        nav_issues.append(f"INDEX.md missing reference to {doc}")

pass_fail(len(nav_issues) == 0, STAGE, f"Navigation consistent ({len(nav_issues)} issues)")

# ═══════════════════════════════════════════════════════════════════════
# STAGE 2 — Documentation Audit
# ═══════════════════════════════════════════════════════════════════════
print("\n" + "=" * 70)
print("STAGE 2 — Documentation Audit")
print("=" * 70)

STAGE = "stage_2_documentation"

# Define expected document metadata
doc_metadata = {
    "README.md": {
        "purpose": "Project overview and navigation hub",
        "owner": "Founder / Product Owner",
        "navigation_role": "Entry point",
    },
    "INDEX.md": {
        "purpose": "Complete document index",
        "owner": "Repository Maintainer",
        "navigation_role": "Document registry",
    },
    "CHANGELOG.md": {
        "purpose": "History of changes",
        "owner": "Repository Maintainer",
        "navigation_role": "Change tracking",
    },
    "PROJECT_HANDOFF.md": {
        "purpose": "Full project context transfer document",
        "owner": "Founder / Product Owner",
        "navigation_role": "Primary governance document",
    },
    "AI_CONTEXT.md": {
        "purpose": "Quick context for AI agents",
        "owner": "AI Staff Software Engineer",
        "navigation_role": "Quick reference",
    },
    "ENGINEERING_MEMORY.md": {
        "purpose": "Engineering decisions, conventions, lessons learned",
        "owner": "Staff Software Engineer",
        "navigation_role": "Technical reference",
    },
    "CTO_DECISIONS.md": {
        "purpose": "Registry of CTO decisions",
        "owner": "CTO",
        "navigation_role": "Decision authority",
    },
    "VISION.md": {
        "purpose": "Strategic product vision",
        "owner": "Founder / Product Owner",
        "navigation_role": "Strategic reference",
    },
}

print("\n── 2.1 Document Purpose & Completeness ──")
for doc_name, meta in doc_metadata.items():
    if doc_name in ["README.md", "INDEX.md", "CHANGELOG.md"]:
        doc_path = os.path.join(BASE, doc_name)
    else:
        doc_path = os.path.join(BASE, "docs/00_governance", doc_name)
    
    content = read_file(doc_path)
    
    # Check: file exists and is non-empty
    has_content = len(content) > 100
    pass_fail(has_content, STAGE, f"{doc_name}: has substantial content ({len(content)} chars)")
    
    # Check: has heading structure
    has_headings = bool(re.search(r'^#{1,3}\s+\S+', content, re.MULTILINE))
    pass_fail(has_headings, STAGE, f"{doc_name}: has heading structure")
    
    # Check: has links to related documents
    has_links = bool(re.search(r'\[.*?\]\(.*?\)', content))
    pass_fail(has_links or doc_name == "CHANGELOG.md", STAGE, f"{doc_name}: has cross-references")

print("\n── 2.2 Document Owner & Place in Navigation ──")
for doc_name, meta in doc_metadata.items():
    # Check INDEX.md contains this document
    if doc_name not in ["README.md", "INDEX.md", "CHANGELOG.md"]:
        in_index = doc_name in index_content
        pass_fail(in_index, STAGE, f"{doc_name}: listed in INDEX.md")
    
    # Check README.md references governance docs
    if doc_name in governance_docs:
        in_readme = doc_name in readme_content
        pass_fail(in_readme, STAGE, f"{doc_name}: referenced in README.md")

print("\n── 2.3 Content Depth Check ──")
# Each governance doc should have minimum 150 words (approx 900 chars)
for doc_name in governance_docs:
    doc_path = os.path.join(BASE, "docs/00_governance", doc_name)
    content = read_file(doc_path)
    # Remove markdown syntax for word count
    clean_text = re.sub(r'[#*`\[\]\(\)|\-]', ' ', content)
    word_count = len(clean_text.split())
    min_words = 150
    pass_fail(word_count >= min_words, STAGE, f"{doc_name}: content depth ({word_count} words, min {min_words})", is_error=True)

# ═══════════════════════════════════════════════════════════════════════
# STAGE 3 — Security Audit
# ═══════════════════════════════════════════════════════════════════════
print("\n" + "=" * 70)
print("STAGE 3 — Security Audit")
print("=" * 70)

STAGE = "stage_3_security"

# Patterns to detect
secret_patterns = {
    "SSH Private Key": r"-----BEGIN\s+(RSA|EC|DSA|OPENSSH)?\s*PRIVATE KEY-----",
    "PGP Private Key": r"-----BEGIN\s+PGP\s+PRIVATE KEY BLOCK-----",
    "GitHub PAT": r"ghp_[A-Za-z0-9]{36,}",
    "GitHub OAuth": r"gho_[A-Za-z0-9]{36,}",
    "GitHub App Token": r"ghs_[A-Za-z0-9]{36,}",
    "GitHub Refresh Token": r"ghr_[A-Za-z0-9]{36,}",
    "GitLab PAT": r"glpat-[A-Za-z0-9\-]{20,}",
    "AWS Access Key": r"AKIA[0-9A-Z]{16}",
    "AWS Secret Key": r"aws[A-Za-z0-9/+]{40}",
    "Generic API Key": r"(api[_-]?key|apikey|api[_-]?secret)\s*[=:]\s*['\"][A-Za-z0-9\-_]{16,}['\"]",
    "Generic Token": r"(token|auth[_-]?token|access[_-]?token)\s*[=:]\s*['\"][A-Za-z0-9\-_\.]{16,}['\"]",
    "Generic Password": r"(password|passwd|pwd)\s*[=:]\s*['\"][^\s'\"]{8,}['\"]",
    "Bearer Token": r"Bearer\s+[A-Za-z0-9\-_\.]+",
    "JWT": r"eyJ[A-Za-z0-9\-_]+\.eyJ[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+",
    "Slack Token": r"xox[baprs]-[0-9]{10,}-[A-Za-z0-9]+",
    "Heroku API Key": r"heroku.{0,20}[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}",
}

print("\n── 3.1 Secret & Credential Scan ──")
security_findings = []
for f in all_files:
    # Skip binary files (PDF, images)
    ext = os.path.splitext(f)[1].lower()
    if ext in ['.pdf', '.png', '.jpg', '.jpeg', '.gif', '.ico', '.woff', '.woff2', '.ttf', '.eot']:
        continue
    
    content = read_file(f)
    rel = os.path.relpath(f, BASE)
    
    for pattern_name, pattern in secret_patterns.items():
        # Skip private IP check for documentation that may reference them as examples
        if "Private IP" in pattern_name and "docs/" in rel:
            continue
        matches = re.findall(pattern, content)
        if matches:
            for match in matches:
                # Filter out obvious false positives (example values, documentation)
                match_str = str(match) if not isinstance(match, str) else match
                security_findings.append(f"{rel}: {pattern_name} detected")

# Deduplicate
security_findings = list(set(security_findings))
pass_fail(len(security_findings) == 0, STAGE, f"No secrets/credentials detected ({len(security_findings)} found)")
if security_findings:
    for sf in security_findings:
        print(f"    SECRET: {sf}")

print("\n── 3.2 Random/Temporary File Check ──")
temp_patterns = ['.tmp', '.bak', '.swp', '.swo', '~', '.DS_Store', 'Thumbs.db', '.env', '.env.local']
temp_files = []
for f in all_files:
    basename = os.path.basename(f)
    for pat in temp_patterns:
        if basename.endswith(pat) or basename == pat:
            temp_files.append(os.path.relpath(f, BASE))

pass_fail(len(temp_files) == 0, STAGE, f"No temporary/random files ({len(temp_files)} found)")

print("\n── 3.3 Binary File Audit ──")
allowed_binary_ext = ['.pdf', '.svg', '.html', '.css', '.js']
unexpected_binary = []
for f in all_files:
    ext = os.path.splitext(f)[1].lower()
    if ext in ['.png', '.jpg', '.jpeg', '.gif', '.ico', '.woff', '.woff2', '.ttf', '.eot', '.zip', '.tar', '.gz']:
        unexpected_binary.append(os.path.relpath(f, BASE))

pass_fail(len(unexpected_binary) == 0, STAGE, f"No unexpected binary files ({len(unexpected_binary)} found)")

# ═══════════════════════════════════════════════════════════════════════
# STAGE 4 — Markdown Audit
# ═══════════════════════════════════════════════════════════════════════
print("\n" + "=" * 70)
print("STAGE 4 — Markdown Audit")
print("=" * 70)

STAGE = "stage_4_markdown"

md_audit_issues = []

for md_file in md_files:
    rel_path = os.path.relpath(md_file, BASE)
    content = read_file(md_file)
    lines = content.split('\n')
    
    # 4.1 Heading structure
    headings = [(i+1, line) for i, line in enumerate(lines) if re.match(r'^#{1,6}\s+', line)]
    has_h1 = any(re.match(r'^#\s+', h[1]) for h in headings)
    if not has_h1:
        md_audit_issues.append(f"{rel_path}: missing H1 heading")
    
    # Check heading hierarchy (no skipping levels)
    heading_levels = []
    for line_num, line in headings:
        level = len(re.match(r'^(#+)', line).group(1))
        heading_levels.append((line_num, level, line.strip()))
    
    for i in range(1, len(heading_levels)):
        prev_level = heading_levels[i-1][1]
        curr_level = heading_levels[i][1]
        if curr_level > prev_level + 1:
            md_audit_issues.append(
                f"{rel_path}:{heading_levels[i][0]}: heading hierarchy skip "
                f"(H{prev_level} -> H{curr_level})"
            )
    
    # 4.2 Link syntax
    # Check for malformed links [text]( without closing )
    malformed = re.findall(r'\[[^\]]*\]\([^)]*$', content, re.MULTILINE)
    if malformed:
        md_audit_issues.append(f"{rel_path}: {len(malformed)} malformed links")
    
    # 4.3 Table syntax
    in_fenced = False
    for i, line in enumerate(lines, 1):
        stripped = line.strip()
        if stripped.startswith('```'):
            in_fenced = not in_fenced
            continue
        if in_fenced:
            continue
        
        # Table row consistency
        if stripped.startswith('|') and not stripped.endswith('|'):
            md_audit_issues.append(f"{rel_path}:{i}: unclosed table row")
        
        # Check table separator rows (|---|---|)
        if re.match(r'^\|[\s\-:|]+\|$', stripped):
            # Valid separator
            pass
    
    # 4.4 Mermaid syntax
    mermaid_blocks = re.findall(r'```mermaid\n(.*?)```', content, re.DOTALL)
    for idx, block in enumerate(mermaid_blocks):
        first_line = block.strip().split('\n')[0].strip()
        valid_starts = ['graph', 'flowchart', 'sequenceDiagram', 'classDiagram', 
                       'stateDiagram', 'erDiagram', 'gantt', 'pie', 'mindmap']
        if not any(first_line.startswith(vs) for vs in valid_starts):
            md_audit_issues.append(f"{rel_path} mermaid #{idx+1}: invalid start '{first_line}'")
    
    # 4.5 Fenced code block balance
    fence_count = sum(1 for line in lines if line.strip().startswith('```'))
    if fence_count % 2 != 0:
        md_audit_issues.append(f"{rel_path}: unclosed fenced code block ({fence_count} fences)")

print("\n── 4.1 Heading Structure ──")
heading_issues = [i for i in md_audit_issues if 'heading' in i.lower() or 'H1' in i]
pass_fail(len(heading_issues) == 0, STAGE, f"Heading structure valid ({len(heading_issues)} issues)")

print("\n── 4.2 Link Syntax ──")
link_issues = [i for i in md_audit_issues if 'malformed' in i.lower() or 'broken' in i.lower()]
pass_fail(len(link_issues) == 0, STAGE, f"Link syntax valid ({len(link_issues)} issues)")

print("\n── 4.3 Table Syntax ──")
table_issues = [i for i in md_audit_issues if 'table' in i.lower() or 'unclosed' in i.lower()]
pass_fail(len(table_issues) == 0, STAGE, f"Table syntax valid ({len(table_issues)} issues)")

print("\n── 4.4 Mermaid Syntax ──")
mermaid_issues = [i for i in md_audit_issues if 'mermaid' in i.lower()]
pass_fail(len(mermaid_issues) == 0, STAGE, f"Mermaid syntax valid ({len(mermaid_issues)} issues)")

print("\n── 4.5 Fenced Code Blocks ──")
fence_issues = [i for i in md_audit_issues if 'fenced' in i.lower() or 'unclosed' in i.lower()]
pass_fail(len(fence_issues) == 0, STAGE, f"Fenced code blocks balanced ({len(fence_issues)} issues)")

print("\n── 4.6 Cross-Document Navigation ──")
# Check that each governance doc links to at least one other governance doc
nav_issues = []
for doc_name in governance_docs:
    doc_path = os.path.join(BASE, "docs/00_governance", doc_name)
    content = read_file(doc_path)
    links_to_other = False
    for other_doc in governance_docs:
        if other_doc == doc_name:
            continue
        if other_doc in content:
            links_to_other = True
            break
    if not links_to_other:
        nav_issues.append(f"{doc_name}: no cross-references to other governance docs")

pass_fail(len(nav_issues) == 0, STAGE, f"Cross-document navigation ({len(nav_issues)} issues)")

# Print all markdown issues if any
if md_audit_issues:
    print("\n  All markdown issues:")
    for issue in md_audit_issues:
        print(f"    - {issue}")

# ═══════════════════════════════════════════════════════════════════════
# STAGE 5 — Repository Health
# ═══════════════════════════════════════════════════════════════════════
print("\n" + "=" * 70)
print("STAGE 5 — Repository Health")
print("=" * 70)

STAGE = "stage_5_health"

import subprocess

# 5.1 git status
print("\n── 5.1 Git Status ──")
result = subprocess.run(['git', 'status', '--porcelain'], capture_output=True, text=True, cwd=BASE)
uncommitted = [l for l in result.stdout.strip().split('\n') if l]
pass_fail(len(uncommitted) == 0, STAGE, f"Working tree clean ({len(uncommitted)} uncommitted changes)")
if uncommitted:
    for u in uncommitted:
        print(f"    UNCOMMITTED: {u}")

# 5.2 git log
print("\n── 5.2 Git Log ──")
result = subprocess.run(['git', 'log', '--oneline'], capture_output=True, text=True, cwd=BASE)
commits = result.stdout.strip().split('\n')
pass_fail(len(commits) > 0, STAGE, f"Git history exists ({len(commits)} commits)")
for c in commits[:5]:
    print(f"    {c}")

# 5.3 Repository size
print("\n── 5.3 Repository Size ──")
total_size = sum(file_size(f) for f in all_files)
total_mb = total_size / (1024 * 1024)
pass_fail(total_mb < 50, STAGE, f"Repository size reasonable ({total_mb:.2f} MB, max 50 MB)")

# 5.4 Large files
print("\n── 5.4 Large File Detection ──")
large_files = []
for f in all_files:
    sz = file_size(f)
    if sz > 5 * 1024 * 1024:  # > 5 MB
        large_files.append((os.path.relpath(f, BASE), sz / (1024 * 1024)))

pass_fail(len(large_files) == 0, STAGE, f"No excessively large files ({len(large_files)} > 5MB)")
if large_files:
    for lf, lsz in large_files:
        print(f"    LARGE: {lf} ({lsz:.2f} MB)")

# 5.5 .gitignore
print("\n── 5.5 .gitignore ──")
gitignore_path = os.path.join(BASE, ".gitignore")
has_gitignore = os.path.exists(gitignore_path)
pass_fail(has_gitignore, STAGE, ".gitignore exists", is_error=False)

# 5.6 Remote
print("\n── 5.6 Remote Configuration ──")
result = subprocess.run(['git', 'remote', '-v'], capture_output=True, text=True, cwd=BASE)
remotes = result.stdout.strip()
pass_fail('origin' in remotes, STAGE, f"Remote 'origin' configured")
print(f"    {remotes}")

# 5.7 Branch
print("\n── 5.7 Branch Check ──")
result = subprocess.run(['git', 'branch'], capture_output=True, text=True, cwd=BASE)
branches = result.stdout.strip()
pass_fail('main' in branches, STAGE, f"Default branch is 'main'")
print(f"    {branches}")

# ═══════════════════════════════════════════════════════════════════════
# STAGE 6 — Release Audit
# ═══════════════════════════════════════════════════════════════════════
print("\n" + "=" * 70)
print("STAGE 6 — Release Audit")
print("=" * 70)

STAGE = "stage_6_release"

# Count everything
md_count = len([f for f in all_files if f.endswith('.md')])
svg_count = len([f for f in all_files if f.endswith('.svg')])
pdf_count = len([f for f in all_files if f.endswith('.pdf')])
html_count = len([f for f in all_files if f.endswith('.html')])

governance_count = len([f for f in all_files if '00_governance' in f and f.endswith('.md')])

# Count ADRs
adr_count = 0
for f in all_files:
    if f.endswith('.md'):
        content = read_file(f)
        adr_count += len(re.findall(r'ADR-SIE-\d+', content))

# Count unique ADRs
unique_adrs = set()
for f in all_files:
    if f.endswith('.md'):
        content = read_file(f)
        for adr in re.findall(r'ADR-SIE-\d+', content):
            unique_adrs.add(adr)

# Architecture docs (docs with architecture diagrams or architecture in name)
arch_docs = 0
for f in all_files:
    if f.endswith('.md'):
        content = read_file(f)
        if re.search(r'архитектур|architecture|diagram|mermaid', content, re.IGNORECASE):
            arch_docs += 1

# Total word count
total_words = 0
for f in all_files:
    if f.endswith('.md'):
        content = read_file(f)
        clean = re.sub(r'[#*`\[\]\(\)|\-]', ' ', content)
        total_words += len(clean.split())

print("\n── Release Summary ──")
print(f"  Documents (Markdown):     {md_count}")
print(f"  Governance Documents:     {governance_count}")
print(f"  Architecture Docs:        {arch_docs}")
print(f"  ADR (unique references):  {len(unique_adrs)}")
print(f"  SVG Diagrams:             {svg_count}")
print(f"  PDF Files:                {pdf_count}")
print(f"  HTML Files:               {html_count}")
print(f"  Total Files:              {len(all_files)}")
print(f"  Total Word Count:         {total_words}")
print(f"  Repository Size:          {total_mb:.2f} MB")

pass_fail(md_count >= 8, STAGE, f"Sufficient markdown documents ({md_count})")
pass_fail(governance_count >= 5, STAGE, f"Sufficient governance documents ({governance_count})")
pass_fail(svg_count >= 3, STAGE, f"Sufficient SVG diagrams ({svg_count})")
pass_fail(len(unique_adrs) >= 6, STAGE, f"Sufficient ADR references ({len(unique_adrs)})")

# ═══════════════════════════════════════════════════════════════════════
# STAGE 7 — Quality Gate
# ═══════════════════════════════════════════════════════════════════════
print("\n" + "=" * 70)
print("STAGE 7 — Quality Gate")
print("=" * 70)

STAGE = "stage_7_quality_gate"

# Repository Standards
print("\n── 7.1 Repository Standards ──")
pass_fail(os.path.exists(os.path.join(BASE, "README.md")), STAGE, "README.md exists")
pass_fail(os.path.exists(os.path.join(BASE, "INDEX.md")), STAGE, "INDEX.md exists")
pass_fail(os.path.exists(os.path.join(BASE, "CHANGELOG.md")), STAGE, "CHANGELOG.md exists")
pass_fail(os.path.isdir(os.path.join(BASE, "docs")), STAGE, "docs/ directory exists")
pass_fail(os.path.isdir(os.path.join(BASE, "docs/00_governance")), STAGE, "docs/00_governance/ exists")

# Documentation Standards
print("\n── 7.2 Documentation Standards ──")
for doc_name in governance_docs:
    doc_path = os.path.join(BASE, "docs/00_governance", doc_name)
    content = read_file(doc_path)
    has_h1 = bool(re.search(r'^#\s+', content, re.MULTILINE))
    pass_fail(has_h1, STAGE, f"{doc_name}: has H1 title")

# Architecture Standards
print("\n── 7.3 Architecture Standards ──")
pass_fail(svg_count >= 3, STAGE, f"Architecture diagrams present ({svg_count})")
# Check PROJECT_HANDOFF contains architecture sections
handoff_content = read_file(os.path.join(BASE, "docs/00_governance/PROJECT_HANDOFF.md"))
pass_fail("Архитектур" in handoff_content, STAGE, "PROJECT_HANDOFF covers architecture")
pass_fail("Mermaid" in handoff_content or "mermaid" in handoff_content, STAGE, "PROJECT_HANDOFF contains Mermaid diagrams")

# Governance Standards
print("\n── 7.4 Governance Standards ──")
pass_fail(governance_count >= 5, STAGE, f"All governance documents present ({governance_count}/5)")
# Check CTO_DECISIONS has numbered decisions
cto_content = read_file(os.path.join(BASE, "docs/00_governance/CTO_DECISIONS.md"))
decisions_count = len(re.findall(r'Решение\s*#\d+', cto_content))
pass_fail(decisions_count >= 5, STAGE, f"CTO_DECISIONS has sufficient entries ({decisions_count})")

# SSOT Standards
print("\n── 7.5 SSOT Standards ──")
# Single Source of Truth: no conflicting information
# Check that all documents reference PROJECT_HANDOFF as primary source
ssot_refs = 0
for doc_name in governance_docs:
    if doc_name == "PROJECT_HANDOFF.md":
        continue
    doc_path = os.path.join(BASE, "docs/00_governance", doc_name)
    content = read_file(doc_path)
    if "PROJECT_HANDOFF" in content:
        ssot_refs += 1

pass_fail(ssot_refs >= 3, STAGE, f"Documents reference PROJECT_HANDOFF as SSOT ({ssot_refs}/4)")

# ═══════════════════════════════════════════════════════════════════════
# FINAL REPORT
# ═══════════════════════════════════════════════════════════════════════
print("\n" + "=" * 70)
print("PRE-PRODUCTION AUDIT REPORT")
print("=" * 70)

all_pass = all(v["pass"] for v in audit_results.values())

stage_names = {
    "stage_1_integrity": "Repository Integrity",
    "stage_2_documentation": "Documentation",
    "stage_3_security": "Security",
    "stage_4_markdown": "Markdown",
    "stage_5_health": "Repository Health",
    "stage_6_release": "Release",
    "stage_7_quality_gate": "Quality Gate",
}

for stage_key, stage_name in stage_names.items():
    status = "PASS" if audit_results[stage_key]["pass"] else "FAIL"
    print(f"  {stage_name:<30} {status}")

print()
print(f"  {'Navigation':<30} {'PASS' if audit_results['stage_1_integrity']['pass'] else 'FAIL'}")
print(f"  {'Architecture':<30} {'PASS' if audit_results['stage_7_quality_gate']['pass'] else 'FAIL'}")
print(f"  {'Governance':<30} {'PASS' if audit_results['stage_7_quality_gate']['pass'] else 'FAIL'}")
print(f"  {'Workspace':<30} {'PASS' if audit_results['stage_1_integrity']['pass'] else 'FAIL'}")
print()
print(f"  Ready for Push:               {'YES' if all_pass else 'NO'}")
print()
print(f"  Total Errors:                 {len(errors)}")
print(f"  Total Warnings:               {len(warnings)}")

if errors:
    print("\n  ERRORS:")
    for e in errors:
        print(f"    - {e}")

if warnings:
    print("\n  WARNINGS:")
    for w in warnings:
        print(f"    - {w}")

print("\n" + "=" * 70)

# Write results to JSON for release candidate generation
results_json = {
    "timestamp": datetime.now().isoformat(),
    "all_pass": all_pass,
    "errors": errors,
    "warnings": warnings,
    "stages": {k: v["pass"] for k, v in audit_results.items()},
    "statistics": {
        "md_count": md_count,
        "governance_count": governance_count,
        "arch_docs": arch_docs,
        "unique_adrs": list(unique_adrs),
        "adr_count": len(unique_adrs),
        "svg_count": svg_count,
        "pdf_count": pdf_count,
        "html_count": html_count,
        "total_files": len(all_files),
        "total_words": total_words,
        "total_size_mb": round(total_mb, 2),
    }
}

with open("/home/z/my-project/scripts/audit_results.json", 'w') as f:
    json.dump(results_json, f, indent=2, ensure_ascii=False)

print(f"\nAudit results saved to /home/z/my-project/scripts/audit_results.json")

sys.exit(0 if all_pass else 1)
