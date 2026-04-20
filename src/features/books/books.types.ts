import { z } from 'zod';
import { createBookSchema, updateBookSchema } from './books.schema';

export type Book = {
  id: string;
  title: string;
  author: string;
  year: number;
  createdAt: string;
  updatedAt: string;
};

export type BookResponse = Book;

export type CreateBookPayload = z.infer<typeof createBookSchema>;
export type UpdateBookPayload = z.infer<typeof updateBookSchema>;
