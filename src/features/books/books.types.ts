import { z } from 'zod';
import { Metadata } from '../../shared/types/metadata.types';
import { Author } from '../authors/authors.types';
import { Category } from '../categories/categories.types';
import { createBookSchema, updateBookSchema } from './books.schema';

export type Book = {
  id: string;
  title: string;
  authorId: string;
  categoryIds: string[];
  year: number;
  metadata: Metadata;
};

export type BookResponse = {
  id: string;
  title: string;
  author: Author;
  categories: Category[];
  year: number;
  metadata: Metadata;
};

export type BookPatch = Partial<Omit<Book, 'id' | 'metadata'>>;

export type CreateBookPayload = z.infer<typeof createBookSchema>;
export type UpdateBookPayload = z.infer<typeof updateBookSchema>;

export type CreateBookResult =
  | { ok: true; book: Book }
  | { ok: false; error: 'AUTHOR_NOT_FOUND' }
  | { ok: false; error: 'INVALID_CATEGORY_IDS'; missingIds: string[] };

export type UpdateBookResult =
  | { ok: true; book: Book }
  | { ok: false; error: 'BOOK_NOT_FOUND' }
  | { ok: false; error: 'AUTHOR_NOT_FOUND' }
  | { ok: false; error: 'INVALID_CATEGORY_IDS'; missingIds: string[] };
