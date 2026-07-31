import os, re
TEST_DIR = 'src/__tests__/personal-intelligence'
for fn in ['types-errors.test.ts']:
    fp = os.path.join(TEST_DIR, fn)
    with open(fp, 'r') as f:
        content = f.read()
        lines = content.split('\n')
        new_lines = []
        for line in lines:
            new_line = line.replace('})', '}', 1)
            new_lines.append(new_line)
    with open(fp, 'w') as f2:
        f2.write('\n'.join(new_lines))
    print('Done')
