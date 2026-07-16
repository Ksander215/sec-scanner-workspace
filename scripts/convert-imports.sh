#!/usr/bin/env bash
# Convert all .ts import extensions to .js in the src/ directory
# This handles: from './foo.ts' → from './foo.js'
# Also handles: from '../bar/index.ts' → from '../bar/index.js'

cd /home/z/my-project/sec-scanner-workspace

# Find all .ts files and replace .ts extensions in import paths
find src -name "*.ts" -not -name "*.test.ts" -not -name "*.d.ts" | while read -r file; do
  # Replace from 'xxx.ts' with from 'xxx.js' 
  # Also handle from "xxx.ts" with from "xxx.js"
  sed -i -E "s/(from ['\"])([^'\"]+)\.ts(['\"])/\1\2.js\3/g" "$file"
done

echo "Done converting .ts → .js in imports"
