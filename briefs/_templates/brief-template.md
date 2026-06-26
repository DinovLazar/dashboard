# <Bucket> — Brief <NN>: <Short Title>

> **For Claude Code** — Read CLAUDE.md (and AGENTS.md) first, then follow this brief exactly.

---

## What We're Building

*One paragraph. What does this brief produce, and why does it matter?*

Authoritative specs:
- `src/_project-state/dashboard-Plan.md` (the locked spec)
- `src/_project-state/dashboard-Phase-Plan.md` (this phase's entry)

## Pre-Existing State

*What's already in the codebase that this brief depends on or extends? Point to files/folders.*

- (file path) — description

## Build Approach

*Numbered, specific, ordered by dependency.*

1. Step 1 — what to create/modify first
2. Step 2 — what depends on step 1

## Files to Create or Modify

```
path/to/file.ts      — creates X
path/to/other.ts     — modifies Y
```

## Security Boundary (read for any write-path work)

*If this brief touches tokens, the per-tenant Sanity bridge, auth, or RLS: restate the relevant rule from `AGENTS.md` → Security boundary, and the cross-tenant isolation test that must cover it.*

## Tests

- test 1 — what it verifies
- test 2

## Gotchas

1. (pitfall) — (how to avoid)

## Commit Message

```
<bucket>: <title> — <scope>
```

## Completion Report

After committing, write a report to `src/_project-state/completions/Part-<Bucket>-Phase-<NN>-Completion.md` using the template already in that folder.

---

*<Bucket> Brief <NN> | dashboard | <DATE>*
