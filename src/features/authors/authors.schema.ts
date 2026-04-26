import { z } from 'zod';

export const createAuthorSchema = z.object({
  name: z.string().min(1),
  portraitKey: z.string().min(1).optional(),
});

export const updateAuthorSchema = createAuthorSchema
  .partial()
  .refine((patch): boolean => Object.keys(patch).length > 0, {
    message: 'At least one field must be provided',
  });

export const authorIdParamSchema = z.object({
  id: z.string().uuid(),
});

export const batchAuthorsSchema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(100),
});
