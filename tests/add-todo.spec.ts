import { test, expect } from '@playwright/test';
import { addTodo, storedTodos } from './helpers';

test.describe('Add todo', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/todomvc');
  });

  test('adds a todo and clears the input', async ({ page }) => {
    const input = page.getByPlaceholder('What needs to be done?');

    await addTodo(page, 'Buy milk');

    await expect(page.getByTestId('todo-title')).toHaveText(['Buy milk']);
    await expect(input).toBeEmpty();
    await expect(input).toBeFocused();
    await expect(page.getByTestId('todo-count')).toHaveText('1 item left');
  });

  test('appends new todos to the bottom of the list', async ({ page }) => {
    await addTodo(page, 'Buy milk');
    await addTodo(page, 'Walk the dog');

    await expect(page.getByTestId('todo-title')).toHaveText(['Buy milk', 'Walk the dog']);
    await expect(page.getByTestId('todo-count')).toHaveText('2 items left');
  });

  test('ignores whitespace-only input', async ({ page }) => {
    await addTodo(page, '   ');
    await addTodo(page, 'Buy milk');

    // Only the real todo should exist; the blank entry must not have been added.
    await expect(page.getByTestId('todo-title')).toHaveText(['Buy milk']);
    await expect.poll(() => storedTodos(page)).toHaveLength(1);
  });

  test('trims surrounding whitespace', async ({ page }) => {
    await addTodo(page, '  Trim me  ');

    await expect(page.getByTestId('todo-title')).toHaveText(['Trim me']);
    await expect.poll(async () => (await storedTodos(page))[0]?.title).toBe('Trim me');
  });

  test('shows main section and footer once a todo exists', async ({ page }) => {
    const toggleAll = page.getByLabel('Mark all as complete');
    const filters = page.getByRole('link', { name: /^(All|Active|Completed)$/ });

    await expect(toggleAll).toBeHidden();
    await expect(filters).toHaveCount(0);

    await addTodo(page, 'Buy milk');

    await expect(toggleAll).toBeVisible();
    await expect(filters).toHaveText(['All', 'Active', 'Completed']);
  });

  test('persists todos to localStorage and across reloads', async ({ page }) => {
    await addTodo(page, 'Buy milk');
    await addTodo(page, 'Walk the dog');
    await addTodo(page, 'Trim me');

    await expect.poll(() => storedTodos(page)).toEqual([
      { id: expect.any(String), title: 'Buy milk', completed: false },
      { id: expect.any(String), title: 'Walk the dog', completed: false },
      { id: expect.any(String), title: 'Trim me', completed: false },
    ]);

    await page.reload();

    await expect(page.getByTestId('todo-title')).toHaveText(['Buy milk', 'Walk the dog', 'Trim me']);
    await expect(page.getByTestId('todo-count')).toHaveText('3 items left');
  });
});
