#!/usr/bin/env python3
"""Remove unused _eventBus field from all validators."""
import os, re

base = '/home/z/my-project/src/core/compliance'

for fname in os.listdir(base):
    if not fname.endswith('-validator.ts'):
        continue
    fpath = os.path.join(base, fname)
    with open(fpath, 'r') as f:
        content = f.read()
    
    # Remove the field declaration line
    content = re.sub(r'  private readonly _eventBus: InProcessEventBus \| null;\n', '', content)
    
    # Remove the assignment in constructor
    content = re.sub(r"    this\._eventBus = eventBus \?\? null;\n", '', content)
    
    with open(fpath, 'w') as f:
        f.write(content)
    print(f'Fixed {fname}: removed _eventBus field')

print('Done')
