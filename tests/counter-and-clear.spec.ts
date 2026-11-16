import { test, expect, type Page } from '@playwright/test';
import { addTodo, addTodos, storedTodos, todoItem } from './helpers';

const TODOS = ['Buy milk', 'Walk the dog', 'Pay rent'];

const toggle = (page: Page, title: string) =>
  todoItem(page, title).getByRole('checkbox', { name: 'Toggle Todo' });

const clearCompletedButton = (page: Page) =>
  page.getByRole('button', { name: 'Clear completed' });

test.describe('Items-left counter', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/todomvc');
  });

  test('is hidden when there are no todos', async ({ page }) => {
    await expect(page.getByTestId('todo-count')).toBeHidden();
  });

  test('uses singular and plural wording correctly', async ({ page }) => {
    const counter = page.getByTestId('todo-count');

    await addTodo(page, 'Buy milk');
    await expect(counter).toHaveText('1 item left');

    await addTodo(page, 'Walk the dog');
    await expect(counter).toHaveText('2 items left');

    await page.getByLabel('Mark all as complete').check();
    await expect(counter).toHaveText('0 items left');
  });

  test('shows the number in bold', async ({ page }) => {
    await addTodos(page, TODOS);

    await expect(page.getByTestId('todo-count').locator('strong')).toHaveText('3');
  });

  test('goes up and down as todos are added, completed and un-completed', async ({ page }) => {
    const counter = page.getByTestId('todo-count');
    await addTodos(page, TODOS);
    await expect(counter).toHaveText('3 items left');

    await toggle(page, 'Buy milk').check();
    await expect(counter).toHaveText('2 items left');

    await toggle(page, 'Walk the dog').check();
    await expect(counter).toHaveText('1 item left');

    await toggle(page, 'Buy milk').uncheck();
    await expect(counter).toHaveText('2 items left');

    await addTodo(page, 'Water plants');
    await expect(counter).toHaveText('3 items left');
  });

  test('drops when an active todo is deleted or edited to empty', async ({ page }) => {
    const counter = page.getByTestId('todo-count');
    await addTodos(page, TODOS);

    const item = todoItem(page, 'Buy milk');
    await item.hover();
    await item.getByRole('button', { name: 'Delete' }).click();
    await expect(counter).toHaveText('2 items left');

    await todoItem(page, 'Pay rent').getByTestId('todo-title').dblclick();
    const editBox = todoItem(page, 'Pay rent').getByRole('textbox', { name: 'Edit' });
    await editBox.fill('');
    await editBox.press('Enter');
    await expect(counter).toHaveText('1 item left');
  });

  test('is correct after a reload', async ({ page }) => {
    await addTodos(page, TODOS);
    await toggle(page, 'Pay rent').check();
    await expect.poll(async () => (await storedTodos(page)).map(t => t.completed)).toEqual([false, false, true]);

    await page.reload();

    await expect(page.getByTestId('todo-count')).toHaveText('2 items left');
  });
});

test.describe('Clear completed', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/todomvc');
    await addTodos(page, TODOS);
  });

  test('is hidden until a todo is completed, and hides again when none are', async ({ page }) => {
    const button = clearCompletedButton(page);
    await expect(button).toBeHidden();

    await toggle(page, 'Buy milk').check();
    await expect(button).toBeVisible();

    await toggle(page, 'Buy milk').uncheck();
    await expect(button).toBeHidden();
  });

  test('removes only completed todos and leaves the counter unchanged', async ({ page }) => {
    await toggle(page, 'Buy milk').check();
    await toggle(page, 'Pay rent').check();
    await expect(page.getByTestId('todo-count')).toHaveText('1 item left');

    await clearCompletedButton(page).click();

    await expect(page.getByTestId('todo-title')).toHaveText(['Walk the dog']);
    await expect(page.getByTestId('todo-count')).toHaveText('1 item left');
    await expect(clearCompletedButton(page)).toBeHidden();
    await expect.poll(() => storedTodos(page)).toEqual([
      { id: expect.any(String), title: 'Walk the dog', completed: false },
    ]);
  });

  test('when every todo is completed, clears them all and hides the list and footer', async ({ page }) => {
    await page.getByLabel('Mark all as complete').check();

    await clearCompletedButton(page).click();

    await expect(page.getByTestId('todo-item')).toHaveCount(0);
    await expect(page.getByLabel('Mark all as complete')).toBeHidden();
    await expect(page.getByTestId('todo-count')).toBeHidden();
    await expect.poll(() => storedTodos(page)).toEqual([]);
  });

  test('works from the "Completed" filter and leaves that view empty', async ({ page }) => {
    await toggle(page, 'Walk the dog').check();
    await page.getByRole('link', { name: 'Completed', exact: true }).click();
    await expect(page.getByTestId('todo-title')).toHaveText(['Walk the dog']);

    await clearCompletedButton(page).click();

    await expect(page).toHaveURL(/#\/completed$/);
    await expect(page.getByTestId('todo-item')).toHaveCount(0);
    await expect(page.getByTestId('todo-count')).toHaveText('2 items left');

    await page.getByRole('link', { name: 'All', exact: true }).click();
    await expect(page.getByTestId('todo-title')).toHaveText(['Buy milk', 'Pay rent']);
  });

  test('works from the "Active" filter without changing that view', async ({ page }) => {
    await toggle(page, 'Walk the dog').check();
    await page.getByRole('link', { name: 'Active', exact: true }).click();

    await clearCompletedButton(page).click();

    await expect(page.getByTestId('todo-title')).toHaveText(['Buy milk', 'Pay rent']);
    await expect.poll(async () => (await storedTodos(page)).map(t => t.title)).toEqual(['Buy milk', 'Pay rent']);
  });

  test('cleared todos stay gone after a reload', async ({ page }) => {
    await toggle(page, 'Buy milk').check();
    await clearCompletedButton(page).click();
    await expect.poll(async () => (await storedTodos(page)).map(t => t.title)).toEqual(['Walk the dog', 'Pay rent']);

    await page.reload();

    await expect(page.getByTestId('todo-title')).toHaveText(['Walk the dog', 'Pay rent']);
    await expect(clearCompletedButton(page)).toBeHidden();
  });
});
