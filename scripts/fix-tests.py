import os, re
TEST_DIR = 'src/__tests__/personal-intelligence'
files_to_fix = ['events.test.ts', 'errors-deep.test.ts', 'onboarding.test.ts']
for fn in files_to_fix:
    fp = os.path.join(TEST_DIR, fn)
    with open(fp, 'r') as f:
        content = f.read()
        # Fix: replace all } with } in test content
        # (Python f-strings closing braces interfere with JS syntax)
        content = content.replace('})', '}', 1)
    with open(fp, 'w') as f2:
        f2.write(content)
    print(f'Fixed {fn}')
