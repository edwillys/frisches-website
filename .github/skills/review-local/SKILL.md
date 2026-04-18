---
name: review-local
description: Review local staged, unstaged, or combined git changes in this repository for correctness, dead code, conciseness, tidiness, scalability, portability, maintainability, test coverage, and mobile or desktop usage risks. Use this when asked to review local changes or run a local review with optional tests.
---

# Review Local Changes

Use this skill when the user asks to review local repository changes that are not yet committed, especially when they mention staged changes, unstaged changes, or both.

## Scope selection

- Use the user's requested scope if they specified one: `staged`, `unstaged`, or `both`.
- If the user did not specify a scope, review both staged and unstaged changes.
- Do not review committed history unless the user explicitly asks for it.

## Review priorities

Focus the review on the changed code and the behaviors those changes affect.

Always check for:

- correctness issues and behavioral regressions
- dead code or newly orphaned logic
- avoidable complexity, duplication, or poor conciseness
- tidiness issues that make the changed area harder to follow
- scalability risks such as brittle branching, hard-coded limits, or tight coupling
- portability risks such as OS-specific paths, shell assumptions, browser-specific behavior, or environment-specific logic
- maintainability risks such as unclear ownership, weak abstractions, or hidden cross-component dependencies
- missing, outdated, or insufficient unit tests when behavior changed
- mobile usage risks when UI, layout, gestures, or responsive behavior changed
- desktop usage risks when keyboard, hover, focus, pointer, or large-screen layout behavior changed
- what was done well in the changed code, especially decisions that reduced risk or improved clarity
- what you would have done differently, but only when the alternative is concrete and materially better

## Execution rules

Follow this process:

1. Inspect the local diff for the requested scope.
2. Understand the changed behavior before judging code style.
3. Prefer root-cause findings over cosmetic nits.
4. Call out brittle assumptions, regression risk, and coupling that will make later changes harder.
5. Flag missing validation when the change clearly affects behavior but no relevant tests were updated.
6. Note strong implementation choices so the user can keep the parts that are working well.
7. If you suggest a different approach, explain the tradeoff and why it would be better.

## Optional tests

- Run tests only if the user explicitly asks for tests to be run.
- If tests are requested, choose the narrowest relevant test command first.
- Report which tests were run, which were not run, and the outcome.
- If tests cannot be run, say why briefly.

## Response format

- Present findings first, ordered by severity.
- For each finding, include the impacted file and the concrete risk.
- If there are no findings, say that explicitly.
- After findings, include a short section on what was done well.
- Include what you would have done differently only when it adds clear engineering value.
- After findings, include open questions or assumptions only if needed.
- Keep any summary brief and secondary.

## Example invocations

- Review local changes.
- Review staged changes only.
- Review unstaged changes and run unit tests.
