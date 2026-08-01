import re
with open('src/core/personal-intelligence/decision-advisor.ts','r') as f:
    content = f.read()
    content = re.sub(r'as string\[', r'as const [', content)
    open('src/core/personal-intelligence/decision-advisor.ts','w') as f2:
        f2.write(content)
