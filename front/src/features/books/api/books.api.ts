import { fetchJson } from '@/shared/lib/http/fetchJson';
import { fetchJsonAuthed } from '@/shared/lib/http/fetchJsonAuthed';
import { BookResponse } from '@/shared/types/api.types';

export type CreateBookInput = {
  title: string;
  authorId: string;
  categoryIds: string[];
  year: number;
  pdfKey?: string;
  coverKey?: string;
};

export type UpdateBookInput = {
  title?: string;
  authorId?: string;
  categoryIds?: string[];
  year?: number;
  pdfKey?: string;
  coverKey?: string;
};

export type BooksFilter = {
  authorIds?: string[];
  categoryIds?: string[];
};

const buildBooksQueryString = (filters?: BooksFilter): string => {
  const parts: string[] = [];
  if (filters?.authorIds && filters.authorIds.length > 0) {
    parts.push(`authorIds=${encodeURIComponent(filters.authorIds.join(','))}`);
  }
  if (filters?.categoryIds && filters.categoryIds.length > 0) {
    parts.push(`categoryIds=${encodeURIComponent(filters.categoryIds.join(','))}`);
  }
  return parts.length === 0 ? '' : `?${parts.join('&')}`;
};

export const booksApi = {
  list: (filters?: BooksFilter): Promise<BookResponse[]> =>
    fetchJson<BookResponse[]>(`/books${buildBooksQueryString(filters)}`),
  count: (): Promise<{ count: number }> => fetchJson<{ count: number }>('/books/count'),
  get: (id: string): Promise<BookResponse> => fetchJson<BookResponse>(`/books/${id}`),
  create: (input: CreateBookInput): Promise<BookResponse> =>
    fetchJsonAuthed<BookResponse>('/books', {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  update: (id: string, input: UpdateBookInput): Promise<BookResponse> =>
    fetchJsonAuthed<BookResponse>(`/books/${id}`, {
      method: 'PUT',
      body: JSON.stringify(input),
    }),
  delete: (id: string): Promise<void> =>
    fetchJsonAuthed<void>(`/books/${id}`, { method: 'DELETE' }),
};
