import { z } from 'zod';
import { Author } from '../authors/authors.types';
import { Category } from '../categories/categories.types';
import { Tag } from '../tags/tags.types';
import { createBookSchema, updateBookSchema } from './books.schema';

export type Book = {
  id: string;
  title: string;
  authorId: string;
  categoryIds: string[];
  tagIds: string[];
  year: number;
  createdAt: string;
  updatedAt: string;
};

export type BookResponse = {
  id: string;
  title: string;
  author: Author;
  categories: Category[];
  tags: Tag[];
  year: number;
  createdAt: string;
  updatedAt: string;
};

export type CreateBookPayload = z.infer<typeof createBookSchema>;
export type UpdateBookPayload = z.infer<typeof updateBookSchema>;

export type CreateBookResult =
  | { ok: true; book: Book }
  | { ok: false; error: 'AUTHOR_NOT_FOUND' }
  | { ok: false; error: 'INVALID_CATEGORY_IDS'; missingIds: string[] }
  | { ok: false; error: 'INVALID_TAG_IDS'; missingIds: string[] };

export type UpdateBookResult =
  | { ok: true; book: Book }
  | { ok: false; error: 'BOOK_NOT_FOUND' }
  | { ok: false; error: 'AUTHOR_NOT_FOUND' }
  | { ok: false; error: 'INVALID_CATEGORY_IDS'; missingIds: string[] }
  | { ok: false; error: 'INVALID_TAG_IDS'; missingIds: string[] };
