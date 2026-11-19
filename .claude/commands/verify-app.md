---
description: Run the full test suite to verify the API after a significant change, fixing failures until everything passes
allowed-tools: Bash(npm test:*), Bash(npx jest:*), Bash(git status:*), Bash(git diff:*), Read, Grep, Glob, Edit
---

Verify that the Taskr API works end to end. Run this after any significant change.

## How verification works

The test suite in `tests/*.test.js` uses Jest and supertest to send real HTTP requests to every API endpoint through the Express app (`src/app.js`), against an in-memory SQLite database. No running server, seeded `taskr.db` or environment variables are needed. **If every test passes, the server and all endpoints are working correctly.**

## Steps

1. Run the full suite serially:

   ```bash
   npm test -- --runInBand
   ```

   `--runInBand` runs the test files one after another in a single process, so they don't compete for the shared in-memory database.

2. **If every test passes**, go to step 4.

3. **If any test fails**, fix it and repeat until the whole suite passes:
   - Read the failure output: the test name, the expected and received values, and the stack trace.
   - Find the cause in the implementation under `src/`. Follow the layers (route → service → db/queries) and the rules in `CLAUDE.md` and `.claude/contexts/api-conventions.md`.
   - **Fix the implementation, not the test.** Treat the tests as the specification of correct behaviour. Change a test only if it is clearly wrong (for example, it contradicts the documented API behaviour), and say so explicitly in the report.
   - To iterate quickly, re-run just the failing file, e.g. `npx jest tests/tasks.test.js --runInBand`.
   - Then run the **full** suite again with `npm test -- --runInBand`, because a fix in one place can break another.
   - If the same failure survives three fix attempts, or the fix would need a large redesign or a schema change, stop and report it instead of continuing.

4. Report the result clearly, in one of these two forms:

   - **All passing:** "✅ All N tests passing across M suites — all endpoints verified." List any implementation fixes you made (file and a one-line description of each), or say that no changes were needed.
   - **Failures remain:** "❌ X of N tests failing." For each failure give the test file, the test name, the endpoint it exercises, the error (expected vs. received), and the likely cause in the implementation. Also list any fixes you already made and what still needs addressing.

$ARGUMENTS
