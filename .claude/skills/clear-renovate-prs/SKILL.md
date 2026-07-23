---
name: clear-renovate-prs
description: Process one open Renovate dependency-update PR toward merge — auto-merge it if it's already green, otherwise attempt one fix and hand it back for review. Use when asked to clear, process, or merge Renovate PRs.
---

Process exactly **one** PR per invocation. Run this skill again to work through the next one.

1. **List candidates.**
   ```
   gh pr list --author "app/renovate" --state open --json number,title,createdAt,labels,statusCheckRollup
   ```
   Drop any PR that already carries the `renovate-skill-attempted` label — those were already attempted and are waiting on a human to remove the label before being reconsidered.

2. **No candidates left?** Report how many open Renovate PRs exist in total and how many are excluded by the label (so the user knows to remove a label if they want one reconsidered), then stop. Do nothing further.

3. **Pick the PR.** Sort remaining candidates by `createdAt` ascending (oldest first — deterministic, not a priority judgment). Walk the sorted list and select the first one whose checks have all finished (every `statusCheckRollup` entry has `status: COMPLETED`) — if the oldest is still mid-check, skip past it to the next-oldest that's ready. If every candidate is still mid-check, report that and stop.

4. **Evaluate mergeable state.** The PR is green only if **every** entry in `statusCheckRollup` has `conclusion: SUCCESS` — this includes both the GitHub Actions build check and the Cloudflare Pages deploy check, not just one of them.

5. **Already green, no fix needed → merge immediately:**
   ```
   gh pr merge <number> --squash
   ```
   Report the merge and stop. Do not touch any code on this path.

6. **Not green → diagnose and attempt exactly one fix:**
   - `gh pr checkout <number>`
   - Inspect the failing check(s) — `gh run view --log-failed` for a failing GitHub Actions run, and the Cloudflare Pages check's details URL if that one's failing — to understand what broke.
   - Make the smallest change that addresses the failure (typically adapting code to a breaking change in the bumped dependency). Don't touch files unrelated to the failure.
   - Validate locally with `pnpm run build` before pushing anything. Treat this as one attempt: iterate on the fix locally until the build passes or you conclude it can't be resolved without a larger change, then move on — don't restart the diagnosis from scratch as a second attempt.
   - If the local build passes, commit and push the fix to the PR branch.

7. **Never merge a PR that went through step 6** — regardless of whether the fix worked or checks eventually go green on the pushed commit. Instead:
   - Ensure the tracking label exists (`gh label list` — if `renovate-skill-attempted` isn't there, create it: `gh label create renovate-skill-attempted --description "Already had one automated fix attempt from clear-renovate-prs" --color ededed`).
   - Post a PR comment summarizing what was broken, what you diagnosed as the cause, and what you changed — or, if no fix was found, say so plainly and explain what you tried:
     ```
     gh pr comment <number> --body "..."
     ```
   - Apply the label: `gh pr edit <number> --add-label "renovate-skill-attempted"`.

8. **Report the outcome**: which PR was processed, whether it was merged or flagged for review, and why.
