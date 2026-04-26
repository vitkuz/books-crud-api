import { fetchJson } from '@/shared/lib/http/fetchJson';
import { fetchJsonAuthed } from '@/shared/lib/http/fetchJsonAuthed';
import {
  BookResponse,
  ImageContentType,
  PresignedUploadUrlResponse,
} from '@/shared/types/api.types';

export type CreateBookInput = {
  title: string;
  authorId: string;
  categoryIds: string[];
  year: number;
};

export type UpdateBookInput = {
  title?: string;
  authorId?: string;
  categoryIds?: string[];
  year?: number;
};

export const booksApi = {
  list: (): Promise<BookResponse[]> => fetchJson<BookResponse[]>('/books'),
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
  mintCoverUploadUrl: (id: string, contentType: ImageContentType): Promise<PresignedUploadUrlResponse> =>
    fetchJsonAuthed<PresignedUploadUrlResponse>(`/books/${id}/cover/presigned-url`, {
      method: 'POST',
      body: JSON.stringify({ contentType }),
    }),
  mintPdfUploadUrl: (id: string): Promise<PresignedUploadUrlResponse> =>
    fetchJsonAuthed<PresignedUploadUrlResponse>(`/books/${id}/pdf/presigned-url`, {
      method: 'POST',
      body: JSON.stringify({}),
    }),
};
