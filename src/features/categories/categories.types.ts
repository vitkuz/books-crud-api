import { z } from 'zod';
import { Metadata } from '../../shared/types/metadata.types';
import { createCategorySchema, updateCategorySchema } from './categories.schema';

export type Category = {
  id: string;
  name: string;
  metadata: Metadata;
};

export type CategoryResponse = Category;

export type CategoryPatch = Partial<Omit<Category, 'id' | 'metadata'>>;

export type CreateCategoryPayload = z.infer<typeof createCategorySchema>;
export type UpdateCategoryPayload = z.infer<typeof updateCategorySchema>;

export type DeleteCategoryResult =
  | { ok: true }
  | { ok: false; error: 'CATEGORY_NOT_FOUND' | 'CATEGORY_HAS_BOOKS' };
