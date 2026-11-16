import { test, expect, type Page } from '@playwright/test';
import { addTodos, storedTodos, todoItem } from './helpers';

const TODOS = ['Buy milk', 'Walk the dog', 'Pay rent'];

async function startEditing(page: Page, title: string) {
  const item = todoItem(page, title);
  await item.getByTestId('todo-title').dblclick();
  return { item, editBox: item.getByRole('textbox', { name: 'Edit' }) };
}

test.describe('Edit todo', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/todomvc');
    await addTodos(page, TODOS);
  });

  test('double-clicking a todo opens an edit box with its text', async ({ page }) => {
    const { item, editBox } = await startEditing(page, 'Walk the dog');

    await expect(editBox).toBeVisible();
    await expect(editBox).toBeFocused();
    await expect(editBox).toHaveValue('Walk the dog');
    await expect(item.getByRole('checkbox', { name: 'Toggle Todo' })).toBeHidden();
    await expect(item.getByTestId('todo-title')).toBeHidden();
  });

  test('Enter saves the edit', async ({ page }) => {
    const { editBox } = await startEditing(page, 'Walk the dog');

    await editBox.fill('Walk the cat');
    await editBox.press('Enter');

    await expect(editBox).toBeHidden();
    await expect(page.getByTestId('todo-title')).toHaveText(['Buy milk', 'Walk the cat', 'Pay rent']);
    await expect.poll(async () => (await storedTodos(page)).map(t => t.title)).toEqual(['Buy milk', 'Walk the cat', 'Pay rent']);
  });

  test('clicking away (blur) saves the edit', async ({ page }) => {
    const { editBox } = await startEditing(page, 'Buy milk');

    await editBox.fill('Buy oat milk');
    await editBox.blur();

    await expect(editBox).toBeHidden();
    await expect(page.getByTestId('todo-title')).toHaveText(['Buy oat milk', 'Walk the dog', 'Pay rent']);
  });

  test('Escape cancels the edit', async ({ page }) => {
    const { editBox } = await startEditing(page, 'Pay rent');

    await editBox.fill('Something else');
    await editBox.press('Escape');

    await expect(editBox).toBeHidden();
    await expect(page.getByTestId('todo-title')).toHaveText(TODOS);
    await expect.poll(async () => (await storedTodos(page)).map(t => t.title)).toEqual(TODOS);
  });

  test('trims surrounding whitespace from the edited text', async ({ page }) => {
    const { editBox } = await startEditing(page, 'Walk the dog');

    await editBox.fill('   Walk the cat   ');
    await editBox.press('Enter');

    await expect(page.getByTestId('todo-title')).toHaveText(['Buy milk', 'Walk the cat', 'Pay rent']);
    await expect.poll(async () => (await storedTodos(page))[1]?.title).toBe('Walk the cat');
  });

  test('saving empty text deletes the todo', async ({ page }) => {
    const { editBox } = await startEditing(page, 'Walk the dog');

    await editBox.fill('');
    await editBox.press('Enter');

    await expect(page.getByTestId('todo-title')).toHaveText(['Buy milk', 'Pay rent']);
    await expect(page.getByTestId('todo-count')).toHaveText('2 items left');
    await expect.poll(async () => (await storedTodos(page)).map(t => t.title)).toEqual(['Buy milk', 'Pay rent']);
  });

  test('editing keeps a todo\'s completed state', async ({ page }) => {
    await todoItem(page, 'Buy milk').getByRole('checkbox', { name: 'Toggle Todo' }).check();

    const { editBox } = await startEditing(page, 'Buy milk');
    await editBox.fill('Buy bread');
    await editBox.press('Enter');

    await expect(todoItem(page, 'Buy bread')).toHaveClass(/completed/);
    await expect(page.getByTestId('todo-count')).toHaveText('2 items left');
    await expect.poll(async () => (await storedTodos(page))[0]).toMatchObject({ title: 'Buy bread', completed: true });
  });

  test('edits persist across reloads', async ({ page }) => {
    const { editBox } = await startEditing(page, 'Pay rent');
    await editBox.fill('Pay electricity bill');
    await editBox.press('Enter');
    await expect.poll(async () => (await storedTodos(page))[2]?.title).toBe('Pay electricity bill');

    await page.reload();

    await expect(page.getByTestId('todo-title')).toHaveText(['Buy milk', 'Walk the dog', 'Pay electricity bill']);
  });
});
