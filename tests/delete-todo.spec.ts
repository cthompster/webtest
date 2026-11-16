import { test, expect } from '@playwright/test';
import { addTodos, storedTodos, todoItem } from './helpers';

const TODOS = ['Buy milk', 'Walk the dog', 'Pay rent'];

test.describe('Delete todo', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/todomvc');
    await addTodos(page, TODOS);
  });

  test('delete button only appears on hover', async ({ page }) => {
    const item = todoItem(page, 'Buy milk');
    const deleteButton = item.getByRole('button', { name: 'Delete' });

    await expect(deleteButton).toBeHidden();
    await item.hover();
    await expect(deleteButton).toBeVisible();
  });

  test('deletes a single todo', async ({ page }) => {
    const item = todoItem(page, 'Walk the dog');

    await item.hover();
    await item.getByRole('button', { name: 'Delete' }).click();

    await expect(page.getByTestId('todo-title')).toHaveText(['Buy milk', 'Pay rent']);
    await expect(page.getByTestId('todo-count')).toHaveText('2 items left');
    await expect.poll(async () => (await storedTodos(page)).map(t => t.title)).toEqual(['Buy milk', 'Pay rent']);
  });

  test('deleting a completed todo does not change the items-left count', async ({ page }) => {
    const item = todoItem(page, 'Buy milk');
    await item.getByRole('checkbox', { name: 'Toggle Todo' }).check();
    await expect(page.getByTestId('todo-count')).toHaveText('2 items left');

    await item.hover();
    await item.getByRole('button', { name: 'Delete' }).click();

    await expect(page.getByTestId('todo-title')).toHaveText(['Walk the dog', 'Pay rent']);
    await expect(page.getByTestId('todo-count')).toHaveText('2 items left');
  });

  test('deleting the last todo hides the main section and footer', async ({ page }) => {
    for (const title of TODOS) {
      const item = todoItem(page, title);
      await item.hover();
      await item.getByRole('button', { name: 'Delete' }).click();
    }

    await expect(page.getByTestId('todo-item')).toHaveCount(0);
    await expect(page.getByLabel('Mark all as complete')).toBeHidden();
    await expect(page.getByTestId('todo-count')).toBeHidden();
    await expect.poll(() => storedTodos(page)).toEqual([]);
  });

  test('deletion persists across reloads', async ({ page }) => {
    const item = todoItem(page, 'Pay rent');
    await item.hover();
    await item.getByRole('button', { name: 'Delete' }).click();
    await expect.poll(async () => (await storedTodos(page)).map(t => t.title)).toEqual(['Buy milk', 'Walk the dog']);

    await page.reload();

    await expect(page.getByTestId('todo-title')).toHaveText(['Buy milk', 'Walk the dog']);
  });
});
