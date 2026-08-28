# Announcement Drafts

---

## Reddit Draft

**Title:** "How do you usually understand a large unfamiliar codebase?"

**Body:**

```
We've been building an experiment: an AI system that tries to understand software architecture, not just generate code.

The idea: instead of pasting files into a chat, you point AIS at a project directory. It scans the structure, builds an architecture model, and tries to answer questions grounded in actual source files.

What we've found so far:
- It works for dependency analysis and boundary questions
- It sometimes hallucinates (we caught it inventing a module that doesn't exist)
- The context retrieval quality was a hard problem — we had to exclude non-code directories from analysis

What we DON'T know:
- Whether this actually helps developers in practice
- What questions people naturally want to ask
- Whether the evidence model (showing source files) builds trust or just adds noise

We just opened a free MVP. No signup, no API key needed — just try the demo.

If you've ever struggled to understand an unfamiliar codebase, I'd genuinely like to hear what you'd ask a tool like this. Not to sell you anything — we're collecting evidence for what to build next.

Link: [MVP URL]
```

---

## Hacker News Draft

**Title:** "Show HN: An experiment in AI-assisted codebase understanding"

**Body:**

```
We built an AI system that tries to understand software project architecture.

How it works:
1. Point it at a project directory
2. Ask a question ("What depends on module X?", "What's the main architectural risk?")
3. It scans the codebase, builds an architecture graph, retrieves relevant context
4. Returns an answer with claims, each backed by source file references

What makes it different:
- Architecture-aware context (not just file content)
- Evidence chain: every claim links to actual source files
- Quality findings: the system self-reports when it might be hallucinating

Current limitations:
- Keyword-based retrieval (no embeddings/vector DB)
- Best with TypeScript/JavaScript
- Sometimes gets context wrong

We're not claiming this is production-ready. We're testing a hypothesis: can architecture-aware AI help developers understand codebases?

Free to try: [MVP URL]
Source: [GitHub URL]

I'd appreciate honest feedback, especially if it doesn't work well for your use case.
```

---

## LinkedIn Post 1

```
We built an AI system that tries to understand software architecture.

Not generate code. Understand it.

The difference matters.

Most AI coding tools focus on generation: "write a function that does X." AIS focuses on comprehension: "how does this system actually work?"

The approach:
- Scan a codebase → build an architecture model
- Answer questions grounded in actual source files
- Show evidence for every claim

We found that getting the context RIGHT was harder than building the AI pipeline. Our first quality gate caught a case where the system analyzed a landing page instead of the core architecture — because the word "evidence" matched a route name.

AIS is free while we learn how developers use it. Link in comments.
```

---

## LinkedIn Post 2 (ONLY after evidence collected)

```
[DRAFT — publish only after Batch 001 evidence]

The first 20 users asked us questions we didn't expect.

[Summary of top 3 unexpected findings]

[What we changed / what we're investigating]

The full discovery report: [link]
```
