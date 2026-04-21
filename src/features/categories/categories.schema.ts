import { z } from 'zod';

export const createCategorySchema = z.object({
  name: z.string().min(1),
});

export const updateCategorySchema = createCategorySchema.partial().refine(
  (patch: Partial<{ name: string }>): boolean => Object.keys(patch).length > 0,
  { message: 'At least one field must be provided' },
);

export const categoryIdParamSchema = z.object({
  id: z.string().uuid(),
});

export const batchCategoriesSchema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(100),
});
