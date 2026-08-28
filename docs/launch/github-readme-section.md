## What is AIS?

AIS (Architecture Intelligence System) is an experimental tool for understanding software project architecture through AI-powered questions and evidence-backed answers.

## What Problem?

Understanding an unfamiliar codebase is slow and error-prone. Developers spend significant time reading files, tracing imports, and building mental models. Existing AI tools focus on code generation, not code comprehension.

## How Does It Work?

1. Point AIS at a project directory
2. Ask a question about the architecture
3. AIS scans the codebase, builds an architecture graph, retrieves relevant context
4. Returns a structured answer with claims backed by source file references

## Try FREE MVP

[Link to deployed MVP or instructions for local setup]

## Known Limitations

- Keyword-based retrieval (no embeddings or vector DB)
- Best with TypeScript/JavaScript projects
- Answers may contain inaccuracies — always verify against source
- Context quality depends on project structure
- Large monorepos (>10k files) may be slow

## Validation

AIS is being validated through real user evidence collection:
- Quality Gate: CONDITION (5/5 gates PASS after discovery fix)
- Real E2E inference: confirmed (GLM-4 Plus via z-ai proxy)
- Evidence Loop: operational, captures claims and sources
- User Discovery: in progress (Batch 001)

## What We're Learning from Users

[This section will be updated with evidence from Batch 001]

Status: Collecting first 20 meaningful user sessions.
