import { z } from 'zod';
import { Metadata } from '../../shared/types/metadata.types';
import { createAuthorSchema, updateAuthorSchema } from './authors.schema';

export type Author = {
  id: string;
  name: string;
  metadata: Metadata;
};

export type AuthorResponse = Author;

export type CreateAuthorPayload = z.infer<typeof createAuthorSchema>;
export type UpdateAuthorPayload = z.infer<typeof updateAuthorSchema>;

export type DeleteAuthorResult =
  | { ok: true }
  | { ok: false; error: 'AUTHOR_NOT_FOUND' | 'AUTHOR_HAS_BOOKS' };
