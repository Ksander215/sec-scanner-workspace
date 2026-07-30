#!/bin/bash
cd /home/z/my-project

# Fix bootstrap-engine.test.ts - add setPlatformContext before bootstrap calls and fix bad char
python3 << 'PYEOF'
path = 'src/__tests__/platform/bootstrap-engine/bootstrap-engine.test.ts'
with open(path, 'rb') as f:
    content = f.read()
    # Fix the bad character
    content = content.replace('\xa0function', 'function')
    # Add setPlatformContext before each bootstrap call
    import re
    content = re.sub(
        r'(\n)\s+(const \w+ = await \w+\.bootstrap\(',
        r'\1.setPlatformContext({} as any);\n    \2.bootstrap(',
        content
    )
with open(path, 'w') as f:
    f.write(content)
print('Fixed bootstrap-engine.test.ts')

path = 'src/__tests__/platform/bootstrap-engine/bootstrap-engine-extended.test.ts'
with open(path, 'rb') as f:
    content = f.read()
    # Add setPlatformContext before each bootstrap call
    import re
    content = re.sub(
        r'(\n)\s+(const \w+ = await \w+\.bootstrap\(',
        r'\1.setPlatformContext({} as any);\n    \2.bootstrap(',
        content
    )
with open(path, 'w') as f:
    f.write(content)
print('Fixed bootstrap-engine-extended.test.ts')
PYEOF
echo Done
