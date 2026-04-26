import { Metadata } from './metadata.types';

export type Author = {
  id: string;
  name: string;
  portraitKey?: string;
  createdAt: string;
  updatedAt: string;
  metadata: Metadata;
};

export type AuthorResponse = Author;

export type AuthorPatch = Partial<Omit<Author, 'id' | 'metadata' | 'createdAt' | 'updatedAt'>>;

export type DeleteAuthorResult =
  | { ok: true }
  | { ok: false; error: 'AUTHOR_NOT_FOUND' }
  | { ok: false; error: 'AUTHOR_HAS_BOOKS' };
