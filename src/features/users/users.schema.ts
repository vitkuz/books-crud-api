import { z } from 'zod';

export const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1).optional(),
});

export const updateUserSchema = createUserSchema.partial().refine(
  (patch: Partial<{ email: string; password: string; name: string }>): boolean =>
    Object.keys(patch).length > 0,
  { message: 'At least one field must be provided' },
);

export const userIdParamSchema = z.object({
  id: z.string().uuid(),
});
