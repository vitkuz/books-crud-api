# pi-review — prompt iteration roadmap

Small, one-at-a-time experiments to improve the `AI Code Review (pi)` workflow
without adding complexity. Each item is a 1–5 line change, landed as its own
commit so we can bisect if signal/noise regresses.

## Experiments (ordered smallest → biggest)

### 1. Load `CLAUDE.md` into the prompt
Pi agent doesn't pick up `CLAUDE.md` automatically. Inject it into the built
prompt so project conventions become review rules.

In `.github/workflows/pi-review.yml` → "Build prompt file" step, append:

```bash
if [ -f CLAUDE.md ]; then
  echo
  echo '## Project conventions (enforce these in the review):'
  cat CLAUDE.md
fi
```

**Why**: single biggest quality jump — all the "things to flag / not to flag"
rules from `CLAUDE.md` suddenly become actionable for the agent.

### 2. Feed the PR title + body
Pass intent alongside the diff. A lot of reviews are better with "what the
author is trying to do" than with the diff alone.

In "Get PR diff" step, also capture metadata:

```bash
gh pr view ${{ inputs.pr_number }} \
  --json title,body --jq '"# \(.title)\n\n\(.body // "_no description_")"' \
  > pr-meta.md
```

Then in "Build prompt file", cat `pr-meta.md` before the diff.

**Why**: distinguishes bugs from features. A "regression" in behavior may be
intentional — the PR body usually says so.

### 3. Unlock exploration in `instructions.md`
Agent already has `read,grep,find,ls` tools. Tell it to use them.

Add one line to `.github/pi-review/instructions.md`:

> You have `read`, `grep`, `find`, `ls` tools. Use them to open callers or
> neighboring files before flagging an issue in unfamiliar code.

**Why**: grounds claims. Prevents false positives based on diff-only context.

### 4. Severity tags on every bullet
Require `[CRIT]` / `[WARN]` / `[NIT]` prefix on each bullet under `## Issues`.

**Why**: eyeball-able triage. You can skim the comment and jump to the red
lines.

### 5. Hard output budget
Add to `instructions.md`:

> Max 12 bullets total. One line per bullet. No preamble, no closing remarks.

**Why**: forces the model to self-prune. Noise drops, signal concentrates.

### 6. Prompt-variant A/B
Add a `prompt_variant` workflow input (`default` | `strict`) and switch which
`instructions-<variant>.md` file the "Build prompt file" step cats.

**Why**: lets us compare two prompt styles on the same PR without editing
files between runs. Useful when picking the new baseline after a prompt
change.

## Operating principle

Ship experiments one at a time. Re-dispatch against the same PR (currently
#29). Keep whichever comment has the best signal/noise ratio as the new
baseline. Separate commits so a regression can be reverted without losing
unrelated wins.
