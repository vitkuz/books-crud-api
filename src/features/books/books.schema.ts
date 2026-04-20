import { z } from 'zod';

export const createBookSchema = z.object({
  title: z.string().min(1),
  author: z.string().min(1),
  year: z.number().int().min(0).max(9999),
});

export const updateBookSchema = createBookSchema.partial().refine(
  (patch: Partial<{ title: string; author: string; year: number }>): boolean =>
    Object.keys(patch).length > 0,
  { message: 'At least one field must be provided' },
);

export const bookIdParamSchema = z.object({
  id: z.string().uuid(),
});
