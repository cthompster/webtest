import { test, expect } from '@playwright/test';
import { addTodos, storedTodos, todoItem } from './helpers';

const TODOS = ['Buy milk', 'Walk the dog', 'Pay rent'];

test.describe('Complete todo', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/todomvc');
    await addTodos(page, TODOS);
  });

  test('marks a single todo as completed', async ({ page }) => {
    const item = todoItem(page, 'Walk the dog');

    await item.getByRole('checkbox', { name: 'Toggle Todo' }).check();

    await expect(item).toHaveClass(/completed/);
    await expect(todoItem(page, 'Buy milk')).not.toHaveClass(/completed/);
    await expect(todoItem(page, 'Pay rent')).not.toHaveClass(/completed/);
    await expect(page.getByTestId('todo-count')).toHaveText('2 items left');
    await expect.poll(async () => (await storedTodos(page)).map(t => t.completed)).toEqual([false, true, false]);
  });

  test('un-completes a completed todo', async ({ page }) => {
    const item = todoItem(page, 'Buy milk');
    const toggle = item.getByRole('checkbox', { name: 'Toggle Todo' });

    await toggle.check();
    await expect(item).toHaveClass(/completed/);

    await toggle.uncheck();

    await expect(item).not.toHaveClass(/completed/);
    await expect(page.getByTestId('todo-count')).toHaveText('3 items left');
    await expect.poll(async () => (await storedTodos(page)).every(t => !t.completed)).toBe(true);
  });

  test('"Mark all as complete" completes and un-completes every todo', async ({ page }) => {
    const toggleAll = page.getByLabel('Mark all as complete');
    const items = page.getByTestId('todo-item');

    await toggleAll.check();

    for (const item of await items.all()) await expect(item).toHaveClass(/completed/);
    await expect(page.getByTestId('todo-count')).toHaveText('0 items left');

    await toggleAll.uncheck();

    for (const item of await items.all()) await expect(item).not.toHaveClass(/completed/);
    await expect(page.getByTestId('todo-count')).toHaveText('3 items left');
  });

  test('"Mark all as complete" checks itself when every todo is completed by hand', async ({ page }) => {
    const toggleAll = page.getByLabel('Mark all as complete');

    for (const title of TODOS) {
      await expect(toggleAll).not.toBeChecked();
      await todoItem(page, title).getByRole('checkbox', { name: 'Toggle Todo' }).check();
    }

    await expect(toggleAll).toBeChecked();
  });

  test('completed state persists across reloads', async ({ page }) => {
    await todoItem(page, 'Pay rent').getByRole('checkbox', { name: 'Toggle Todo' }).check();
    await expect.poll(async () => (await storedTodos(page)).map(t => t.completed)).toEqual([false, false, true]);

    await page.reload();

    await expect(todoItem(page, 'Pay rent')).toHaveClass(/completed/);
    await expect(todoItem(page, 'Pay rent').getByRole('checkbox', { name: 'Toggle Todo' })).toBeChecked();
    await expect(page.getByTestId('todo-count')).toHaveText('2 items left');
  });
});
