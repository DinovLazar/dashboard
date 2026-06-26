# docs/ — Living Knowledge Base

Long-lived documentation for **dashboard** (the Vertex Consulting client blog portal). Note: the project's primary, canonical state lives in [`src/_project-state/`](../src/_project-state/) (snapshot, file map, decisions, completion reports). This `docs/` tree holds the standard Vertex repo knowledge base.

## Folder Guide

| Folder | Put files here if they describe… |
|--------|-----------------------------------|
| `architecture/` | How the system is built — components, data models, key decisions, ADRs |
| `workflows/` | End-to-end processes — how a client writes/publishes a post, how onboarding works |
| `runbooks/` | How to do things — setup, deploy, rollback, troubleshoot (e.g. `ai-review-setup.md`) |
| `integrations/` | External systems we talk to — Supabase, Sanity, Resend, Vercel |

## Conventions

- Every doc has a title and a short "what this is for" opening paragraph.
- Cross-link between docs rather than duplicating content.
- When a PR changes how something works, update the relevant doc *in the same PR*.
- Markdown only. Diffs matter.

## What does NOT go here

- Source code (belongs in `src/`)
- Project snapshot / file map / decisions / completion reports (belong in `src/_project-state/`)

---

*Part of the dashboard repo | See the top-level README.md for the full folder map*
