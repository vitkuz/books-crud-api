import { Category } from './categories.types';

const store: Map<string, Category> = new Map<string, Category>();

export type CategoryPatch = Partial<Omit<Category, 'id' | 'metadata'>>;

export const insertCategory = (category: Category): Category => {
  store.set(category.id, category);
  return category;
};

export const findAllCategories = (): Category[] => Array.from(store.values());

export const findCategoryById = (id: string): Category | undefined => store.get(id);

export const replaceCategory = (
  id: string,
  patch: CategoryPatch,
): Category | undefined => {
  const existing: Category | undefined = store.get(id);
  if (!existing) return undefined;
  const updated: Category = {
    ...existing,
    ...patch,
    id: existing.id,
    metadata: {
      createdAt: existing.metadata.createdAt,
      updatedAt: new Date().toISOString(),
    },
  };
  store.set(id, updated);
  return updated;
};

export const removeCategory = (id: string): boolean => store.delete(id);
