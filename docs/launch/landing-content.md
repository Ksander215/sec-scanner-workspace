# AIS Landing Page — Content Specification

## Hero Section
- Headline: "Understand your codebase."
- Subheadline: "Ask questions about a software project and get architecture-aware answers grounded in the project structure and available evidence."
- CTA 1: [ Try Demo ] — links to demo
- CTA 2: [ Analyze My Project ] — links to custom path input

## What AIS Does

Four-step flow:
1. Ask — Type a question about your project
2. Analyze — AIS scans the codebase and builds an architecture model
3. Explain — Get a structured answer with claims
4. Show evidence — Every claim is backed by source file references

## Why We’re Building It

"AIS is currently free while we learn how developers actually want to use it. We’re not claiming to have solved code understanding — we’re testing whether this approach helps."

## Known Limitations

- AIS uses keyword-based retrieval, not semantic search — unusual phrasing may produce suboptimal results
- Answers may contain inaccuracies — always verify against source code
- Works best with TypeScript/JavaScript projects
- Currently analyzes local directories only
- Large monorepos (>10k files) may have slow discovery

## Footer

- GitHub Repository
- Documentation (link)
- Known Limitations (anchor)
