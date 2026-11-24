# CLAUDE.md

Playwright Test (TypeScript) end-to-end suite for the live TodoMVC demo at
`https://demo.playwright.dev/todomvc`. There is no application code here, only tests. See
`README.md` for the human-facing overview.

## Commands

- Run everything: `PLAYWRIGHT_HTML_OPEN=never npx playwright test`
  (without `PLAYWRIGHT_HTML_OPEN=never`, a failure opens a report server that blocks the shell).
- Narrow it down: `--project=chromium|firefox|webkit`, a file path, or `-g "<test name>"`.
- Readable output: add `--reporter=line` or `--reporter=dot`. Note this replaces the HTML
  reporter, so `playwright-report/` is not updated.
- Check for flakiness: `npx playwright test --repeat-each=5 --retries=0`.
- `npx playwright show-report` and `--debug` / `--ui` are interactive and long-running: run them in
  the background, and stop them when done.

## Layout

- `playwright.config.ts`: `baseURL`, the three browser projects, and CI-only settings (`retries: 2`,
  `forbidOnly`, GitHub + HTML reporters), all keyed off `process.env.CI`.
- `tests/helpers.ts`: shared helpers. Use these rather than re-implementing them.
  - `addTodo` / `addTodos`: type into "What needs to be done?" and press Enter.
  - `storedTodos`: read the `react-todos` key from `localStorage`.
  - `todoItem(page, title)`: the `todo-item` row containing that text.
- `tests/<feature>.spec.ts`: one file per feature. Small file-local helpers (`toggle`,
  `filterLink`, `startEditing`, `clearCompletedButton`) live at the top of the file that uses them.
- `.github/workflows/playwright.yml`: one job per browser, `npx playwright test --project=<browser>`.
- `.claude/skills/playwright-cli/`: the playwright-cli skill, for exploring the site or debugging a
  test interactively.

## Conventions

- Each `test.describe` has a `beforeEach` that opens `/todomvc` and seeds todos with `addTodos`.
  Tests are independent: each gets a fresh browser context with empty storage.
- Locate by test ID, role or label (`getByTestId`, `getByRole`, `getByLabel`). CSS classes are only
  used to assert state (`completed`, `selected`).
- Filter links are found with `exact: true`. Role names match substrings by default, so this is a
  precaution: no other link on the page currently contains "All", "Active" or "Completed".
- Tests that change todos check the result on the page **and** in `localStorage`. The filter tests
  only check the page, since filtering doesn't change saved data.
- Tests must pass in all three browsers.

## Gotchas (each one has bitten this suite before)

- **Storage lags the UI.** The app renders before it writes `localStorage`. Always assert storage
  with `expect.poll(...)`, and wait for storage to match before `page.reload()`. A single read or
  an immediate reload caused an intermittent failure.
- **`check()` / `uncheck()` hang when the row leaves the view.** On the Active or Completed filter,
  toggling a todo removes it, and `check()` waits forever to see it checked. Use `click()` there and
  assert the result separately (see the comment in `tests/filters.spec.ts`).
- **`--debug` and `expect.poll`.** Debug mode removes the test timeout but not the 5 s `expect`
  timeout, and the Inspector pauses inside the poll's `page.evaluate`, so stepping through an
  `expect.poll` line times out. This is expected; the user chose not to change the config for it.
- **Live site.** Network blips show up as failures that pass on retry. Locally there are no
  retries, so investigate before assuming the app is broken.

## Workflow

- Commit to `main` and push; the push triggers CI. Check it with `gh run list` / `gh run watch`.
- Keep `README.md` (the "What's covered" table and test count) in step when adding or removing tests.
