# reports/ — Completion Reports

> **For this project, the canonical home for per-phase completion reports is [`src/_project-state/completions/`](../src/_project-state/completions/)**, not this folder. That is the rule in `AGENTS.md` ("A phase is not closed until its report is filed at `src/_project-state/completions/`"). This `reports/` folder exists for parity with the standard Vertex repo layout and holds the generic completion-report template for reference.

If you are closing a phase: copy `src/_project-state/completions/Part-X-Phase-YY-Completion.md`, fill it in, and commit it under `src/_project-state/completions/`.

## What goes in a completion report

- Date, branch, commits, PR link
- What shipped (plain language)
- Definition-of-Done checklist with evidence
- Decisions made that the brief didn't spell out
- Deviations from the brief
- Changed files / deliverables (never secrets — say *where* a secret lives, never its value)
- State updates done
- Risks / follow-ups / what the next phase needs to know (esp. the security boundary)

## Write-once discipline

Reports are historical. Once committed, they are not edited to "improve" the narrative (typo fixes excepted). If a later phase changes the situation, write a new report.

---

*Part of the dashboard repo | See the top-level README.md for the full folder map*
