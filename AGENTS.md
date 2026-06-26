<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Dashboard — Agent Rules

This is the **Vertex Consulting client blog portal** — a standalone, Vertex-branded web app where Vertex's clients log in and manage the blog on their own website. It is a separate repo from the Vertex marketing site and deploys to its own subdomain. Full context is in `src/_project-state/dashboard-Project-Instructions.md`.

## Before starting ANY work

This repo's `src/_project-state/` is the project's persistent memory (mirroring the Vertex marketing site). Every session reads it before touching anything:

1. Read `src/_project-state/current-state.md` first — the full project snapshot (what is actually live vs. planned).
2. Read `src/_project-state/dashboard-Phase-Plan.md` and the entry for the phase you're about to work on.
3. Read `src/_project-state/file-map.md` to find a specific file.
4. Read `src/_project-state/00_stack-and-config.md` for tech-stack and config details.
5. Skim `src/_project-state/dashboard-Decisions.md` — the append-only log of locked decisions. Do not re-litigate a decision already recorded there; if you must reverse one, add a new dated entry that supersedes it.

## After finishing ANY work

1. Update `src/_project-state/current-state.md` to match reality.
2. File a completion report at `src/_project-state/completions/Part-X-Phase-YY-Completion.md` (copy the template already in that folder). A phase is **not closed** until its report is filed.
3. Update `src/_project-state/file-map.md` with any new files, and `src/_project-state/00_stack-and-config.md` if the stack or config changed.
4. Add a `src/_project-state/dashboard-Decisions.md` entry for any choice you made that the phase prompt did not spell out.

Keep all docs factual, not aspirational — document what IS, not what SHOULD BE. Trust the documentation over assumptions.

## Security boundary (the one that matters most here)

- **Per-client Sanity write tokens are secrets.** They live server-side only — never in a `NEXT_PUBLIC_*` variable, never sent to the browser, never logged, never committed. On a public repo, treat every token and key as off-limits in code, comments, and completion reports — say *where* a secret lives, never its value.
- **Every mutating request is authenticated AND authorized on the server.** The logged-in user's record determines which client (and therefore which Sanity project + token) the request may touch. A user must never be able to act on a project that is not theirs. This check is mandatory and must be covered by a test before any editor write ships.
- Each client's token has **least privilege** (Editor on that one client's Sanity project — not admin, not cross-project).
- Image uploads and all writes go through the server-side per-tenant client, never directly from the browser.

## Conventions

- Mobile-first, responsive-prefixed styling so one surface change never silently regresses another breakpoint.
- Brand tokens are copied from the Vertex marketing site so the portal reads as Vertex — do not invent a new palette.
- Frequent, small, single-purpose commits. One phase = one completion report = the commits that close it.
