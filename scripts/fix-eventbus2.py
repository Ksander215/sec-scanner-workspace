#!/usr/bin/env python3
"""Prefix unused eventBus constructor param with _."""
import os, re

base = '/home/z/my-project/src/core/compliance'

for fname in os.listdir(base):
    if not fname.endswith('-validator.ts'):
        continue
    fpath = os.path.join(base, fname)
    with open(fpath, 'r') as f:
        content = f.read()
    
    # Replace constructor param: (eventBus?: InProcessEventBus | null) → (_eventBus?: InProcessEventBus | null)
    content = content.replace(
        '(eventBus?: InProcessEventBus | null)',
        '(_eventBus?: InProcessEventBus | null)'
    )
    
    with open(fpath, 'w') as f:
        f.write(content)
    print(f'Fixed {fname}')

print('Done')
