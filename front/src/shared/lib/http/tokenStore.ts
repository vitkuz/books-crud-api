/*
 * Module-singleton token store. The AuthProvider keeps localStorage
 * and this in-memory mirror in sync; module-level helpers (fetchJsonAuthed)
 * read from here instead of pulling React context.
 */

const STORAGE_KEY = 'books-api/token';

let inMemory: string | undefined =
  typeof window !== 'undefined'
    ? (window.localStorage.getItem(STORAGE_KEY) ?? undefined)
    : undefined;

export const getStoredToken = (): string | undefined => inMemory;

export const setStoredToken = (token: string | undefined): void => {
  inMemory = token;
  if (typeof window === 'undefined') return;
  if (token === undefined) {
    window.localStorage.removeItem(STORAGE_KEY);
  } else {
    window.localStorage.setItem(STORAGE_KEY, token);
  }
};
