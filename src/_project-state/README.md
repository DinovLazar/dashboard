# Dashboard — Project State Documentation

This folder is the project's **persistent memory** (mirroring the Vertex marketing site's `src/_project-state/`). It exists so every new Claude Code session can understand the full state of the project before changing anything. Trust the documentation over assumptions; keep it factual — document what **is**, not what should be.

## What's in here

| File / folder | Purpose |
|---|---|
| `current-state.md` | The full project snapshot — what is actually live vs. planned. **Read this first every session.** |
| `file-map.md` | Where things live — the real file tree, updated as files land. |
| `00_stack-and-config.md` | Pinned versions, config files, env-var inventory, brand tokens. |
| `dashboard-Project-Instructions.md` | Orientation / the "why" (read first of the planning docs). |
| `dashboard-Plan.md` | The locked specification (v1). |
| `dashboard-Phase-Plan.md` | The build sequence — Buckets B (build) / M (make-it-work) / P (publish). |
| `dashboard-Decisions.md` | Append-only log of locked decisions. Don't re-litigate; supersede with a new dated entry. |
| `dashboard-Notion-Checklist.md` | Copy-into-Notion checklist mirroring the phase plan. |
| `completions/` | One completion report per phase: `Part-<Bucket>-Phase-<NN>-Completion.md`. Copy the template in that folder. |

## Rules for every session

**Before starting any work:** read `current-state.md`, then the relevant entry in `dashboard-Phase-Plan.md`, then `file-map.md` / `00_stack-and-config.md` as needed, and skim `dashboard-Decisions.md`.

**After finishing any work:** update `current-state.md` to match reality, file a completion report in `completions/`, update `file-map.md` (and `00_stack-and-config.md` if the stack changed), and add a `dashboard-Decisions.md` entry for any unspecified choice. A phase is **not closed** until its report is filed and the snapshot matches reality.

> The security boundary (server-only per-client tokens, authenticate-then-authorize on every mutation, least-privilege Editor tokens, the cross-tenant isolation test, zero secrets in a public repo) is the load-bearing rule of this project. See `../../AGENTS.md` and `dashboard-Project-Instructions.md` §5.
