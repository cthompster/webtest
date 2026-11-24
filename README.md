# webtest

End-to-end tests for the [TodoMVC demo](https://demo.playwright.dev/todomvc), written with
[Playwright Test](https://playwright.dev) in TypeScript. 47 tests run in Chromium, Firefox and WebKit.

[![Playwright tests](https://github.com/cthompster/webtest/actions/workflows/playwright.yml/badge.svg)](https://github.com/cthompster/webtest/actions/workflows/playwright.yml)

> The tests run against a **live, third-party site**. They need internet access, and a change or
> outage on the demo site can fail them even when nothing here has changed.

## What's covered

| File | Covers |
|---|---|
| `tests/add-todo.spec.ts` | Adding todos, trimming whitespace, ignoring blank input |
| `tests/complete-todo.spec.ts` | Completing and un-completing todos, "Mark all as complete" |
| `tests/edit-todo.spec.ts` | Double-click to edit; Enter, Escape and blur; editing to empty deletes |
| `tests/delete-todo.spec.ts` | The delete button, deleting todos, the empty state |
| `tests/filters.spec.ts` | All / Active / Completed links, `#/` routes, back and forward |
| `tests/counter-and-clear.spec.ts` | The "N items left" counter, "Clear completed" |

Tests that change todos check both the page and the todos saved in `localStorage`, and several
reload the page to check that changes persist.

## Getting started

You need Node.js (an LTS version).

```bash
npm ci                      # install dependencies
npx playwright install      # download Chromium, Firefox and WebKit
npm test                    # run everything
```

## Running tests

| Goal | Command |
|---|---|
| All tests, all browsers | `npm test` |
| One browser | `npx playwright test --project=firefox` |
| One file | `npx playwright test tests/filters.spec.ts` |
| Tests whose name matches | `npx playwright test -g "deletes a single todo"` |
| Watch in a visible browser | `npx playwright test --headed` |
| Interactive UI mode | `npx playwright test --ui` |
| Step through in the Inspector | `npx playwright test -g "<name>" --project=chromium --debug` |
| Open the last HTML report | `npx playwright show-report` |

Reports are written to `playwright-report/`, and failure details (screenshots, traces) to
`test-results/`. Both are git-ignored.

**Debugging tip:** in `--debug` mode, `expect.poll` keeps its 5-second limit while the Inspector is
paused. When you reach a line that uses `expect.poll`, click **Resume** (F8) rather than stepping
through it, or it times out.

## Project layout

```
.github/workflows/playwright.yml   CI: one job per browser
playwright.config.ts               base URL, browsers, retries, reporters
tests/
  helpers.ts                       shared actions: addTodo, addTodos, storedTodos, todoItem
  *.spec.ts                        one file per feature
```

## Writing a new test

1. Put it in the spec file for that feature, or add a new `tests/<feature>.spec.ts`.
2. Follow the existing shape: a `test.describe` block whose `beforeEach` opens `/todomvc` and adds
   the starting todos with `addTodos`, then small, focused tests.
3. Find elements by test ID, role or label (`getByTestId('todo-item')`,
   `getByRole('button', { name: 'Delete' })`), not by CSS selectors.
4. Check saved data with `expect.poll(() => storedTodos(page))`, never a single read, and wait for
   the save before calling `page.reload()`. The app updates the page before it writes to storage.
5. Run it in all three browsers before you push.

## Continuous integration

GitHub Actions runs the suite on every push to `main`, on pull requests, daily at 06:00 UTC, and on
demand. Each browser runs as its own job. On CI, failed tests are retried up to twice, and each job
uploads its HTML report (plus traces when something fails) as an artifact for 14 days.
