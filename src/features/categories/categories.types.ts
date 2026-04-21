import { z } from 'zod';
import { createCategorySchema, updateCategorySchema } from './categories.schema';

export type Category = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
};

export type CategoryResponse = Category;

export type CreateCategoryPayload = z.infer<typeof createCategorySchema>;
export type UpdateCategoryPayload = z.infer<typeof updateCategorySchema>;

export type DeleteCategoryResult =
  | { ok: true }
  | { ok: false; error: 'CATEGORY_NOT_FOUND' | 'CATEGORY_HAS_BOOKS' };
