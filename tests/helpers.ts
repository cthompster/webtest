import type { Page } from '@playwright/test';

export type StoredTodo = { id: string; title: string; completed: boolean };

export async function addTodo(page: Page, text: string) {
  const input = page.getByPlaceholder('What needs to be done?');
  await input.fill(text);
  await input.press('Enter');
}

export async function addTodos(page: Page, texts: string[]) {
  for (const text of texts) await addTodo(page, text);
}

export async function storedTodos(page: Page): Promise<StoredTodo[]> {
  return page.evaluate(() => JSON.parse(localStorage.getItem('react-todos') ?? '[]'));
}

export function todoItem(page: Page, title: string) {
  return page.getByTestId('todo-item').filter({ hasText: title });
}
