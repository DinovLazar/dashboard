# briefs/ — Paste-Ready Claude Code Prompts

This folder holds the phase prompts that Claude Code executes to build things. Each brief is a self-contained markdown file pasted into a Claude Code session. For **dashboard**, the authoritative build sequence is [`src/_project-state/dashboard-Phase-Plan.md`](../src/_project-state/dashboard-Phase-Plan.md) (Buckets B / M / P).

## Organisation

Group briefs by bucket/phase. Name each `brief-<phase>-<short-slug>.md`.

```
briefs/
├── _templates/
│   └── brief-template.md
├── part-b/
│   └── brief-b01-project-setup.md
└── part-m/
    └── ...
```

## What makes a good brief

Self-contained — Claude Code should execute it end-to-end with only the codebase + the brief. Include: what we're building, pre-existing state, build approach, acceptance criteria, gotchas, the commit message, and tests. Use `_templates/brief-template.md`.

## The workflow

1. Draft a brief.
2. Paste it into Claude Code on a feature branch.
3. Claude Code builds, tests, commits, files a completion report in `src/_project-state/completions/`, pushes, opens a PR.
4. Merge after AI review + your own look-through.

## What does NOT go here

- Completion reports → `src/_project-state/completions/`
- Long-lived architecture docs → `docs/architecture/`

---

*Part of the dashboard repo | See the top-level README.md for the full folder map*
