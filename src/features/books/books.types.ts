import { z } from 'zod';
import { Author } from '../authors/authors.types';
import { createBookSchema, updateBookSchema } from './books.schema';

export type Book = {
  id: string;
  title: string;
  authorId: string;
  year: number;
  createdAt: string;
  updatedAt: string;
};

export type BookResponse = {
  id: string;
  title: string;
  author: Author;
  year: number;
  createdAt: string;
  updatedAt: string;
};

export type CreateBookPayload = z.infer<typeof createBookSchema>;
export type UpdateBookPayload = z.infer<typeof updateBookSchema>;

export type CreateBookResult =
  | { ok: true; book: Book }
  | { ok: false; error: 'AUTHOR_NOT_FOUND' };

export type UpdateBookResult =
  | { ok: true; book: Book }
  | { ok: false; error: 'AUTHOR_NOT_FOUND' | 'BOOK_NOT_FOUND' };
