import { z } from 'zod';

export const createBookSchema = z.object({
  title: z.string().min(1),
  authorId: z.string().uuid(),
  categoryIds: z.array(z.string().uuid()).default([]),
  year: z.number().int().min(0).max(9999),
  pdfKey: z.string().min(1).optional(),
  coverKey: z.string().min(1).optional(),
});

export const updateBookSchema = createBookSchema
  .partial()
  .refine((patch): boolean => Object.keys(patch).length > 0, {
    message: 'At least one field must be provided',
  });

export const bookIdParamSchema = z.object({
  id: z.string().uuid(),
});

export const batchBooksSchema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(100),
});

const csvUuidArray = z
  .string()
  .min(1)
  .transform((s): string[] => s.split(',').map((token: string): string => token.trim()))
  .pipe(z.array(z.string().uuid()).min(1).max(100));

export const bookFiltersQuerySchema = z.object({
  authorIds: csvUuidArray.optional(),
  categoryIds: csvUuidArray.optional(),
});
