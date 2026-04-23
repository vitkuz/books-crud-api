import { Book, BookPatch } from './books.types';

const store: Map<string, Book> = new Map<string, Book>();

export const insertBook = (book: Book): Book => {
  store.set(book.id, book);
  return book;
};

export const findAllBooks = (): Book[] => Array.from(store.values());

export const findBookById = (id: string): Book | undefined => store.get(id);

export const replaceBook = (id: string, patch: BookPatch): Book | undefined => {
  const existing: Book | undefined = store.get(id);
  if (!existing) return undefined;
  const updated: Book = {
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

export const removeBook = (id: string): boolean => store.delete(id);
