import { z } from 'zod';

export const createBookSchema = z.object({
  title: z.string().min(1),
  authorId: z.string().uuid(),
  year: z.number().int().min(0).max(9999),
});

export const updateBookSchema = createBookSchema.partial().refine(
  (patch: Partial<{ title: string; authorId: string; year: number }>): boolean =>
    Object.keys(patch).length > 0,
  { message: 'At least one field must be provided' },
);

export const bookIdParamSchema = z.object({
  id: z.string().uuid(),
});
