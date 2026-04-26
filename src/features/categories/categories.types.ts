import { z } from 'zod';
import { createCategorySchema, updateCategorySchema } from './categories.schema';

export type CreateCategoryPayload = z.infer<typeof createCategorySchema>;
export type UpdateCategoryPayload = z.infer<typeof updateCategorySchema>;
