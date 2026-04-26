export const qk = {
  auth: {
    me: ['auth', 'me'] as const,
  },
  books: {
    all: ['books'] as const,
    list: (filters?: { authorIds?: string[]; categoryIds?: string[] }) =>
      ['books', 'list', filters ?? {}] as const,
    detail: (id: string) => ['books', 'detail', id] as const,
    count: () => ['books', 'count'] as const,
  },
  authors: {
    all: ['authors'] as const,
    list: () => ['authors', 'list'] as const,
    detail: (id: string) => ['authors', 'detail', id] as const,
  },
  categories: {
    all: ['categories'] as const,
    list: () => ['categories', 'list'] as const,
    detail: (id: string) => ['categories', 'detail', id] as const,
  },
  files: {
    readUrl: (key: string) => ['files', 'readUrl', key] as const,
  },
};
