# AI Code Review Setup

Every non-trivial PR on `DinovLazar/dashboard` gets AI review before merge. This project uses two AI reviewers with different roles. **Both require a one-time, browser-based connect that the owner (Lazar) does — they cannot be set up from the terminal.**

> This repo is **public**, so CodeRabbit's open-source free tier applies.

## Reviewer 1: CodeRabbit (automatic, every PR)

Installs once per repo. After that, every opened PR gets an inline review within ~2 minutes.

### What it catches well

- Missing error handling, swallowed exceptions
- Missing input validation
- Test coverage gaps
- Dead code, unreachable branches
- Style drift from codebase conventions
- **Security: secret leaks, permissive CORS, bad auth checks** — especially load-bearing on this repo, which handles per-client tokens (see `AGENTS.md` → Security boundary)

### One-time setup (~3 minutes)

1. Go to https://coderabbit.ai
2. Click **Sign in with GitHub**
3. Authorise the CodeRabbit GitHub App for the `DinovLazar` account
4. On the app permissions screen, grant access to `DinovLazar/dashboard` (you can grant all repos or select this one)
5. Done. Open the next PR — CodeRabbit's review appears within ~2 minutes.

### Cost

Free tier for public/open-source repos.

## Reviewer 2: Codex (on-demand, architectural PRs)

OpenAI's coding agent. Deeper reasoning than CodeRabbit — it can clone the repo, run tests, and reason about what a PR does at a system level. Use on PRs that change **what the system does**, not just **how code looks**.

### When to use

- Anything touching the **security boundary** (token handling, the per-tenant Sanity bridge, the authorize-on-every-mutation check, RLS) — always
- Supabase migrations / registry schema changes
- Cross-module flows (anything touching 3+ modules in one PR)
- New external integrations (Supabase, Sanity, Resend)
- Anything you feel uncertain about

Skip for: pure style fixes, typo corrections, copy tweaks.

### One-time setup (~3 minutes)

1. In ChatGPT, open **Codex** (requires ChatGPT Plus, Pro, Team, or Enterprise)
2. Connect your GitHub account
3. Grant repo access to `DinovLazar/dashboard`

### Per-PR usage

1. Copy the PR URL from GitHub (e.g. `https://github.com/DinovLazar/dashboard/pull/42`)
2. In Codex, paste: `Review this PR: <url>`
3. Wait a few minutes; Codex posts inline comments on the PR.

### Cost

Included in ChatGPT Plus+ plans.

## Responding to AI review

1. Read every comment. Categorise:
   - **Must fix** — bug, security issue, missing guard. Address it.
   - **Nice to have** — cleanup suggestion. Your call.
   - **Noise** — speculative/stylistic suggestion that doesn't apply. Reply briefly and resolve.
2. To have Claude Code fix something: *"CodeRabbit flagged X on line Y of file Z. Please address and push to the same branch."* The push triggers a re-review.
3. Merge only when all must-fix items are resolved and conversations are resolved (the branch rule requires it).

## Common noise to dismiss

- Style nits that don't match codebase conventions (the AI doesn't read every existing file)
- "Consider using X library instead" — unless there's a real gain
- Occasional hallucinated concerns — verify before acting

## Do not run both CodeRabbit and GitHub Copilot code review

They overlap substantially. Pick one. CodeRabbit has the better signal-to-noise here.

---

*dashboard | AI Review Setup | 2026-06-26*
