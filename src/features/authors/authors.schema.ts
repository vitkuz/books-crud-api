import { z } from 'zod';

export const createAuthorSchema = z.object({
  name: z.string().min(1),
});

export const updateAuthorSchema = createAuthorSchema.partial().refine(
  (patch: Partial<{ name: string }>): boolean => Object.keys(patch).length > 0,
  { message: 'At least one field must be provided' },
);

export const authorIdParamSchema = z.object({
  id: z.string().uuid(),
});
