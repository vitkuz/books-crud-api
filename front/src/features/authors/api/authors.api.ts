import { fetchJson } from '@/shared/lib/http/fetchJson';
import { fetchJsonAuthed } from '@/shared/lib/http/fetchJsonAuthed';
import {
  Author,
  ImageContentType,
  PresignedUploadUrlResponse,
} from '@/shared/types/api.types';

export type CreateAuthorInput = { name: string };
export type UpdateAuthorInput = { name?: string };

export const authorsApi = {
  list: (): Promise<Author[]> => fetchJson<Author[]>('/authors'),
  get: (id: string): Promise<Author> => fetchJson<Author>(`/authors/${id}`),
  create: (input: CreateAuthorInput): Promise<Author> =>
    fetchJsonAuthed<Author>('/authors', {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  update: (id: string, input: UpdateAuthorInput): Promise<Author> =>
    fetchJsonAuthed<Author>(`/authors/${id}`, {
      method: 'PUT',
      body: JSON.stringify(input),
    }),
  delete: (id: string): Promise<void> =>
    fetchJsonAuthed<void>(`/authors/${id}`, { method: 'DELETE' }),
  mintPortraitUploadUrl: (id: string, contentType: ImageContentType): Promise<PresignedUploadUrlResponse> =>
    fetchJsonAuthed<PresignedUploadUrlResponse>(`/authors/${id}/portrait/presigned-url`, {
      method: 'POST',
      body: JSON.stringify({ contentType }),
    }),
};
