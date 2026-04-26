import { z } from 'zod';
import { createBookSchema, updateBookSchema } from './books.schema';

export type CreateBookPayload = z.infer<typeof createBookSchema>;
export type UpdateBookPayload = z.infer<typeof updateBookSchema>;
