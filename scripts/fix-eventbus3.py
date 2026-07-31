#!/usr/bin/env python3
"""Remove InProcessEventBus import and eventBus param from all validators."""
import os, re

base = '/home/z/my-project/src/core/compliance'

for fname in os.listdir(base):
    if not fname.endswith('-validator.ts'):
        continue
    fpath = os.path.join(base, fname)
    with open(fpath, 'r') as f:
        content = f.read()
    
    # Remove the import line for InProcessEventBus
    content = re.sub(r"import type \{ InProcessEventBus \} from '\.\./events/event-bus\.js';\n", '', content)
    
    # Remove the eventBus constructor parameter (with optional type annotation)
    # Pattern: , eventBus?: InProcessEventBus | null
    content = re.sub(r", eventBus\?: InProcessEventBus \| null", '', content)
    # Also try without space after comma
    content = re.sub(r",eventBus\?: InProcessEventBus \| null", '', content)
    
    with open(fpath, 'w') as f:
        f.write(content)
    print(f'Fixed {fname}')

print('Done')
