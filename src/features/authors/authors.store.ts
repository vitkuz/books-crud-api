import { Author } from './authors.types';

const store: Map<string, Author> = new Map<string, Author>();

export const insertAuthor = (author: Author): Author => {
  store.set(author.id, author);
  return author;
};

export const findAllAuthors = (): Author[] => Array.from(store.values());

export const findAuthorById = (id: string): Author | undefined => store.get(id);

export const replaceAuthor = (id: string, patch: Partial<Author>): Author | undefined => {
  const existing: Author | undefined = store.get(id);
  if (!existing) return undefined;
  const updated: Author = {
    ...existing,
    ...patch,
    id: existing.id,
    createdAt: existing.createdAt,
  };
  store.set(id, updated);
  return updated;
};

export const removeAuthor = (id: string): boolean => store.delete(id);
