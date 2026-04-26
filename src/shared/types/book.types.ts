import { Author } from './author.types';
import { Category } from './category.types';
import { Metadata } from './metadata.types';

export type Book = {
  id: string;
  title: string;
  authorId: string;
  categoryIds: string[];
  year: number;
  pdfKey?: string;
  coverKey?: string;
  metadata: Metadata;
};

export type BookResponse = {
  id: string;
  title: string;
  author: Author;
  categories: Category[];
  year: number;
  pdfKey?: string;
  coverKey?: string;
  metadata: Metadata;
};

export type BookPatch = Partial<Omit<Book, 'id' | 'metadata'>>;

export type CreateBookResult =
  | { ok: true; book: Book }
  | { ok: false; error: 'AUTHOR_NOT_FOUND' }
  | { ok: false; error: 'INVALID_CATEGORY_IDS'; missingIds: string[] };

export type UpdateBookResult =
  | { ok: true; book: Book }
  | { ok: false; error: 'BOOK_NOT_FOUND' }
  | { ok: false; error: 'AUTHOR_NOT_FOUND' }
  | { ok: false; error: 'INVALID_CATEGORY_IDS'; missingIds: string[] };
