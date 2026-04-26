import { fetchJson } from '@/shared/lib/http/fetchJson';
import { fetchJsonAuthed } from '@/shared/lib/http/fetchJsonAuthed';
import { Category } from '@/shared/types/api.types';

export type CreateCategoryInput = { name: string };
export type UpdateCategoryInput = { name?: string };

export const categoriesApi = {
  list: (): Promise<Category[]> => fetchJson<Category[]>('/categories'),
  get: (id: string): Promise<Category> => fetchJson<Category>(`/categories/${id}`),
  create: (input: CreateCategoryInput): Promise<Category> =>
    fetchJsonAuthed<Category>('/categories', {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  update: (id: string, input: UpdateCategoryInput): Promise<Category> =>
    fetchJsonAuthed<Category>(`/categories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(input),
    }),
  delete: (id: string): Promise<void> =>
    fetchJsonAuthed<void>(`/categories/${id}`, { method: 'DELETE' }),
};
