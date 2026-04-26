import { z } from 'zod';

export const createBookSchema = z.object({
  title: z.string().min(1),
  authorId: z.string().uuid(),
  categoryIds: z.array(z.string().uuid()).default([]),
  year: z.number().int().min(0).max(9999),
  pdfKey: z.string().min(1).optional(),
  coverKey: z.string().min(1).optional(),
});

export const updateBookSchema = createBookSchema.partial().refine(
  (patch: Partial<{
    title: string;
    authorId: string;
    categoryIds: string[];
    year: number;
    pdfKey: string;
    coverKey: string;
  }>): boolean => Object.keys(patch).length > 0,
  { message: 'At least one field must be provided' },
);

export const bookIdParamSchema = z.object({
  id: z.string().uuid(),
});

export const batchBooksSchema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(100),
});
