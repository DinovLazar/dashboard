# Part X · Phase YY · <Role> — Completion Report

> **TEMPLATE.** Copy this file to `Part-<Bucket>-Phase-<NN>-Completion.md` (e.g. `Part-B-Phase-02-Completion.md`) and fill it in to close a phase. A phase is **not closed** until its report is filed and `current-state.md` is updated. Keep it factual and plain — no marketing language. Write so a non-technical owner understands it.

**Date:** YYYY-MM-DD · **Outcome (one line):** <what now exists that didn't>

---

## 1. What shipped (plain language)

2–3 sentences a non-technical owner can read. What is now possible that wasn't before.

## 2. Definition of Done

Restate each Definition-of-Done item from the phase prompt. Mark each ✅ done / ⚠️ partial / ❌ not done, with the **evidence** next to it (command output, file path, URL, screenshot reference). Do not write a checkmark from memory — verify against the actual result.

- ✅ <item> — evidence: <proof>
- ⚠️ <item> — done except <gap>, because <reason>
- ❌ <item> — not done, because <reason>

## 3. Decisions I made during this phase

Anything I chose that the phase prompt or spec did **not** spell out: an off-spec change, a small redesign, a library/version pick, a scope cut, a workaround. For each: what I decided · why · the alternative I rejected · does it need a `dashboard-Decisions.md` entry? If there were none, write "None." (Never leave this blank.)

## 4. Deviations from the brief / spec

Anything in the prompt I did not do, deferred, or changed — and why. "None" if none.

## 5. Changed files / deliverables

- Code: new / edited / deleted files (short list), and the commit / PR / branch.
- Design: the handover file path and what it contains.
- Ops / manual: what was created or configured, and **where** the artifacts live.
- **Never paste secrets, API keys, tokens, or passwords** — say where they were placed, never the value. (This repo may be public; every token is off-limits in this report.)

## 6. State updates done

Confirm the live state files now match reality: `current-state.md`, `file-map.md`, `00_stack-and-config.md`. (If not done, this phase is not closed.)

## 7. Risks, follow-ups, what the next phase needs to know

New blockers, things that surprised you, anything the next agent must be aware of. For this project, explicitly note anything touching the **security boundary** (token handling, the authorize-on-every-mutation check, cross-tenant isolation).

## 8. What's now possible that wasn't before

One forward-looking line.
