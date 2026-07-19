#!/bin/bash
# INT-000: Full Repository Restructuring
# This script restructures the SIP repository to production-ready state

set -e
cd /home/z/my-project

echo "=== INT-000: Repository Restructuring ==="
echo ""

# ============================================
# STEP 1: Move sip-server → backend/
# ============================================
echo "Step 1: Moving sip-server → backend/"
if [ -d "sec-scanner-landing/sip-server" ]; then
    # Remove old backend if exists
    rm -rf backend
    mv sec-scanner-landing/sip-server backend
    echo "  ✓ sip-server moved to backend/"
fi

# ============================================
# STEP 2: Rename sec-scanner-landing → landing/
# ============================================
echo "Step 2: Renaming sec-scanner-landing → landing/"
if [ -d "sec-scanner-landing" ]; then
    rm -rf landing
    mv sec-scanner-landing landing
    echo "  ✓ Renamed to landing/"
fi

# ============================================
# STEP 3: Update landing configs
# ============================================
echo "Step 3: Updating landing configs..."

# Update package.json name
if [ -f "landing/package.json" ]; then
    sed -i 's/"name": "sec-scanner-landing"/"name": "sip-landing"/' landing/package.json
    echo "  ✓ Updated landing/package.json name"
fi

# Update tsconfig.json — remove sip-server from exclude
if [ -f "landing/tsconfig.json" ]; then
    sed -i 's/"sip-server"//' landing/tsconfig.json
    sed -i 's/,\s*}/}/' landing/tsconfig.json
    echo "  ✓ Updated landing/tsconfig.json"
fi

# Remove turbopack root from next.config.ts (no longer needed)
cat > landing/next.config.ts << 'NEXTCONFIG'
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
NEXTCONFIG
echo "  ✓ Updated landing/next.config.ts"

# ============================================
# STEP 4: Create directory structure
# ============================================
echo "Step 4: Creating directory structure..."

# plugins/ — each with manifest.json, README.md, icon.svg
mkdir -p plugins/nmap plugins/nuclei plugins/zap plugins/semgrep plugins/trivy plugins/nikto

# packages/ — shared libraries
mkdir -p packages/types/src packages/sdk/src packages/ui/src packages/shared/src

# scripts/
mkdir -p scripts

# docker/
mkdir -p docker

# docs/
mkdir -p docs

# .github/workflows/
mkdir -p .github/workflows

echo "  ✓ Directory structure created"

# ============================================
# STEP 5: Clean up root-level junk files
# ============================================
echo "Step 5: Cleaning up root-level junk..."

# Remove root package.json (just had pagedjs)
rm -f package.json package-lock.json bun.lock

# Remove stale worklog
# Keep it for now — it has useful history

# Remove junk .md files from landing/ (they belong in docs/)
# Move useful ones to docs/
if [ -f "landing/DESIGN_REVIEW.md" ]; then
    mv landing/DESIGN_REVIEW.md docs/design-review.md
fi
if [ -f "landing/INFORMATION_ARCHITECTURE.md" ]; then
    mv landing/INFORMATION_ARCHITECTURE.md docs/information-architecture.md
fi
if [ -f "landing/INVESTOR_DEMO.md" ]; then
    mv landing/INVESTOR_DEMO.md docs/investor-demo.md
fi
if [ -f "landing/PRODUCT_BUGS.md" ]; then
    mv landing/PRODUCT_BUGS.md docs/product-bugs.md
fi
if [ -f "landing/PRODUCT_REVIEW.md" ]; then
    mv landing/PRODUCT_REVIEW.md docs/product-review.md
fi
if [ -f "landing/QA_CHECKLIST.md" ]; then
    mv landing/QA_CHECKLIST.md docs/qa-checklist.md
fi
if [ -f "landing/RELEASE_NOTES_INT023G1.md" ]; then
    mv landing/RELEASE_NOTES_INT023G1.md docs/release-notes-int023g1.md
fi
if [ -f "landing/USER_FLOWS.md" ]; then
    mv landing/USER_FLOWS.md docs/user-flows.md
fi
if [ -f "landing/VISUAL_ACCEPTANCE_REPORT.md" ]; then
    mv landing/VISUAL_ACCEPTANCE_REPORT.md docs/visual-acceptance-report.md
fi

# Remove boilerplate README from landing
rm -f landing/README.md landing/AGENTS.md landing/CLAUDE.md

# Remove screenshots (build artifacts)
rm -rf landing/screenshots

# Move brand/ to docs/brand
if [ -d "landing/brand" ]; then
    mv landing/brand docs/brand
fi

# Remove build output from landing
rm -rf landing/out landing/.next

echo "  ✓ Cleaned up junk files"

# ============================================
# STEP 6: Update .gitignore
# ============================================
echo "Step 6: Updating .gitignore..."

cat > .gitignore << 'GITIGNORE'
# Dependencies
node_modules/

# Build outputs
.next/
out/
dist/
landing/out/
landing/.next/
backend/dist/

# Environment
.env
.env.*
.env.local
!.env.example

# Secrets
id_ed25519*
*.pem
*.key

# Deploy artifacts
deploy.tar.gz
deploy.tar

# Images (managed separately)
*.png
!landing/public/**/*.png
!docs/brand/**/*.png

# Temp files
tool-results/
agent-ctx/
download/
upload/
tmp/
.cache/
logs/
*.log
*.tmp

# IDE
.vscode/
.idea/
.DS_Store
Thumbs.db

# Coverage
coverage/

# Misc
sip-repo/
pylib/
scripts/deploy_fast.py
sec-scanner-current.json
sec-scanner-new.json
*.cache
GITIGNORE

echo "  ✓ .gitignore updated"

echo ""
echo "=== Restructuring complete ==="
echo ""
echo "New structure:"
find . -maxdepth 2 -not -path './node_modules/*' -not -path './.git/*' -not -path './landing/node_modules/*' -not -path './.next/*' -not -path './tool-results/*' -not -path './download/*' -not -path './skills/*' -not -path './agent-ctx/*' -not -path './upload/*' -not -path './pylib/*' | sort
