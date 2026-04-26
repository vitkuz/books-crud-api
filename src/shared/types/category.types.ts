import { Metadata } from './metadata.types';

export type Category = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  metadata: Metadata;
};

export type CategoryResponse = Category;

export type CategoryPatch = Partial<Omit<Category, 'id' | 'metadata' | 'createdAt' | 'updatedAt'>>;

export type DeleteCategoryResult =
  | { ok: true }
  | { ok: false; error: 'CATEGORY_NOT_FOUND' }
  | { ok: false; error: 'CATEGORY_HAS_BOOKS' };
