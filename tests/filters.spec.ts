import { test, expect, type Page } from '@playwright/test';
import { addTodo, addTodos, todoItem } from './helpers';

const TODOS = ['Buy milk', 'Walk the dog', 'Pay rent'];

const filterLink = (page: Page, name: 'All' | 'Active' | 'Completed') =>
  page.getByRole('link', { name, exact: true });

const toggle = (page: Page, title: string) =>
  todoItem(page, title).getByRole('checkbox', { name: 'Toggle Todo' });

test.describe('Filters and routing', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/todomvc');
    await addTodos(page, TODOS);
    await toggle(page, 'Walk the dog').check();
  });

  test('"All" is selected by default', async ({ page }) => {
    await expect(page).toHaveURL(/#\/$/);
    await expect(filterLink(page, 'All')).toHaveClass(/selected/);
    await expect(filterLink(page, 'Active')).not.toHaveClass(/selected/);
    await expect(filterLink(page, 'Completed')).not.toHaveClass(/selected/);
    await expect(page.getByTestId('todo-title')).toHaveText(TODOS);
  });

  for (const { name, hash, expected } of [
    { name: 'Active', hash: '#/active', expected: ['Buy milk', 'Pay rent'] },
    { name: 'Completed', hash: '#/completed', expected: ['Walk the dog'] },
    { name: 'All', hash: '#/', expected: TODOS },
  ] as const) {
    test(`clicking "${name}" updates the URL, highlight and list`, async ({ page }) => {
      // Start somewhere other than the target so the click is a real change.
      await filterLink(page, name === 'Completed' ? 'Active' : 'Completed').click();

      await filterLink(page, name).click();

      await expect(page).toHaveURL(new RegExp(`${hash}$`));
      await expect(filterLink(page, name)).toHaveClass(/selected/);
      await expect(page.locator('.filters a.selected')).toHaveCount(1);
      await expect(page.getByTestId('todo-title')).toHaveText([...expected]);
    });
  }

  test('loading a filter URL directly applies that filter', async ({ page }) => {
    await page.goto('/todomvc/#/completed');
    await expect(filterLink(page, 'Completed')).toHaveClass(/selected/);
    await expect(page.getByTestId('todo-title')).toHaveText(['Walk the dog']);

    await page.goto('/todomvc/#/active');
    await expect(filterLink(page, 'Active')).toHaveClass(/selected/);
    await expect(page.getByTestId('todo-title')).toHaveText(['Buy milk', 'Pay rent']);
  });

  test('a filter survives a page reload', async ({ page }) => {
    await filterLink(page, 'Active').click();

    await page.reload();

    await expect(filterLink(page, 'Active')).toHaveClass(/selected/);
    await expect(page.getByTestId('todo-title')).toHaveText(['Buy milk', 'Pay rent']);
  });

  test('browser back and forward move between filters', async ({ page }) => {
    await filterLink(page, 'Active').click();
    await filterLink(page, 'Completed').click();

    await page.goBack();
    await expect(page).toHaveURL(/#\/active$/);
    await expect(filterLink(page, 'Active')).toHaveClass(/selected/);
    await expect(page.getByTestId('todo-title')).toHaveText(['Buy milk', 'Pay rent']);

    await page.goBack();
    await expect(page).toHaveURL(/#\/$/);
    await expect(filterLink(page, 'All')).toHaveClass(/selected/);
    await expect(page.getByTestId('todo-title')).toHaveText(TODOS);

    await page.goForward();
    await expect(page).toHaveURL(/#\/active$/);
    await expect(page.getByTestId('todo-title')).toHaveText(['Buy milk', 'Pay rent']);
  });

  test('completing a todo while on "Active" removes it from the view', async ({ page }) => {
    await filterLink(page, 'Active').click();

    // click() rather than check(): the todo leaves the view as soon as it's
    // completed, so check() would wait forever to see it checked.
    await toggle(page, 'Buy milk').click();

    await expect(page.getByTestId('todo-title')).toHaveText(['Pay rent']);
    await expect(page.getByTestId('todo-count')).toHaveText('1 item left');
  });

  test('un-completing a todo while on "Completed" removes it from the view', async ({ page }) => {
    await filterLink(page, 'Completed').click();

    await toggle(page, 'Walk the dog').click(); // see note above about check()

    await expect(page.getByTestId('todo-item')).toHaveCount(0);
    // The footer stays because todos still exist, just not in this view.
    await expect(page.getByTestId('todo-count')).toHaveText('3 items left');
  });

  test('a new todo added while on "Completed" is hidden until you switch filters', async ({ page }) => {
    await filterLink(page, 'Completed').click();

    await addTodo(page, 'Water plants');

    await expect(page.getByTestId('todo-title')).toHaveText(['Walk the dog']);
    await expect(page.getByTestId('todo-count')).toHaveText('3 items left');

    await filterLink(page, 'Active').click();
    await expect(page.getByTestId('todo-title')).toHaveText(['Buy milk', 'Pay rent', 'Water plants']);
  });

  test('the items-left count ignores the current filter', async ({ page }) => {
    for (const name of ['All', 'Active', 'Completed'] as const) {
      await filterLink(page, name).click();
      await expect(page.getByTestId('todo-count')).toHaveText('2 items left');
    }
  });
});
