---
description: Commit staged changes, push the current branch, and open a pull request
allowed-tools: Bash(git status:*), Bash(git diff:*), Bash(git commit:*), Bash(git push:*), Bash(git branch:*), Bash(gh pr create:*)
---

Commit all staged changes, push them to the current branch, and open a pull request.

Follow these steps in order:

1. Run `git status` to show what will be committed.
2. Run `git diff --staged` to review the staged changes.
   - If nothing is staged, stop and tell me. Do not stage files yourself.
3. Write a commit message in Conventional Commits format based only on what is staged:
   - `<type>(<optional scope>): <short summary>` — types: feat, fix, docs, style, refactor, perf, test, build, ci, chore
   - Summary in the imperative mood, lowercase, no trailing period, under ~72 characters
   - Add a body after a blank line if the change needs explaining (what and why)
4. Run `git commit` with that message.
5. Get the current branch name with `git branch --show-current`, then run `git push origin <branch>` (add `-u` if the branch has no upstream yet).
   - If the current branch is `main` or `master`, stop and ask before pushing.
6. Run `gh pr create --fill` to open a pull request. `--fill` uses the commit message as the PR title and body.
7. Report the commit hash, the branch, and the PR URL.

$ARGUMENTS
