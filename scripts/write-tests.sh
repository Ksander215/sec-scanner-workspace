#!/bin/bash
OUT=/home/z/my-project/ais-platform/src/__tests__/companion

# Count existing tests first
echo "Existing companion tests:"
npx vitest run src/__tests__/companion/ --reporter=verbose 2>&1 | grep -c 'PASS\|✓'
