import { v4 as uuidv4 } from 'uuid';
import { dynamoDb } from '../clients/dynamo-db/instance';
import { DynamoItem, DynamoKey } from '../clients/dynamo-db/types';
import { Book } from '../types/book.types';
import logger from '../utils/logger';

const SK_VALUE = 'BOOK';

const bookPk = (id: string): string => `BOOK#${id}`;

type BookItem = DynamoItem & Book & {
  createdAt: string;
  updatedAt: string;
};

const toItem = (book: Book): BookItem => ({
  pk: bookPk(book.id),
  sk: SK_VALUE,
  id: book.id,
  title: book.title,
  authorId: book.authorId,
  categoryIds: book.categoryIds,
  year: book.year,
  pdfKey: book.pdfKey,
  coverKey: book.coverKey,
  metadata: book.metadata,
  createdAt: book.metadata.createdAt,
  updatedAt: book.metadata.updatedAt,
});

const fromItem = (item: DynamoItem): Book => {
  const b: BookItem = item as BookItem;
  return {
    id: b.id,
    title: b.title,
    authorId: b.authorId,
    categoryIds: b.categoryIds,
    year: b.year,
    pdfKey: b.pdfKey,
    coverKey: b.coverKey,
    createdAt: b.createdAt,
    updatedAt: b.updatedAt,
    metadata: b.metadata,
  };
};

export type CreateBookInput = {
  title: string;
  authorId: string;
  categoryIds: string[];
  year: number;
  pdfKey?: string;
  coverKey?: string;
};

export type UpdateBookInput = {
  title?: string;
  authorId?: string;
  categoryIds?: string[];
  year?: number;
  pdfKey?: string;
  coverKey?: string;
};

export type BookFilters = {
  authorIds?: string[];
  categoryIds?: string[];
};

export type BooksService = {
  create: (input: CreateBookInput) => Promise<Book>;
  findById: (id: string) => Promise<Book | undefined>;
  findManyByIds: (ids: string[]) => Promise<Book[]>;
  findAll: () => Promise<Book[]>;
  findManyByFilters: (filters: BookFilters) => Promise<Book[]>;
  findByAuthorId: (authorId: string) => Promise<Book[]>;
  findByCategoryId: (categoryId: string) => Promise<Book[]>;
  update: (id: string, patch: UpdateBookInput) => Promise<Book | undefined>;
  delete: (id: string) => Promise<boolean>;
  count: () => Promise<number>;
};

export const booksService: BooksService = {
  create: async (input) => {
    const now = new Date().toISOString();
    const book: Book = {
      id: uuidv4(),
      title: input.title,
      authorId: input.authorId,
      categoryIds: input.categoryIds,
      year: input.year,
      pdfKey: input.pdfKey,
      coverKey: input.coverKey,
      createdAt: now,
      updatedAt: now,
      metadata: { createdAt: now, updatedAt: now },
    };
    logger.debug('books.service.create start', { id: book.id });
    await dynamoDb.createOne(toItem(book));
    logger.debug('books.service.create success', { id: book.id });
    return book;
  },

  findById: async (id) => {
    logger.debug('books.service.findById start', { id });
    const item: DynamoItem | undefined = await dynamoDb.getOneById({
      pk: bookPk(id),
      sk: SK_VALUE,
    });
    if (!item) {
      logger.debug('books.service.findById not-found', { id });
      return undefined;
    }
    logger.debug('books.service.findById success', { id });
    return fromItem(item);
  },

  findManyByIds: async (ids) => {
    logger.debug('books.service.findManyByIds start', { count: ids.length });
    const uniqueIds: string[] = Array.from(new Set(ids));
    if (uniqueIds.length === 0) return [];
    const keys: DynamoKey[] = uniqueIds.map((id: string): DynamoKey => ({
      pk: bookPk(id),
      sk: SK_VALUE,
    }));
    const items: DynamoItem[] = await dynamoDb.getManyByIds(keys);
    logger.debug('books.service.findManyByIds success', { found: items.length });
    return items.map(fromItem);
  },

  findAll: async () => {
    logger.debug('books.service.findAll start');
    const items: DynamoItem[] = await dynamoDb.listAll(SK_VALUE);
    logger.debug('books.service.findAll success', { count: items.length });
    return items.map(fromItem);
  },

  findManyByFilters: async (filters: BookFilters): Promise<Book[]> => {
    logger.debug('books.service.findManyByFilters start', {
      authorIds: filters.authorIds?.length ?? 0,
      categoryIds: filters.categoryIds?.length ?? 0,
    });
    const all: Book[] = await booksService.findAll();
    const authorSet: Set<string> | undefined =
      filters.authorIds && filters.authorIds.length > 0
        ? new Set(filters.authorIds)
        : undefined;
    const categorySet: Set<string> | undefined =
      filters.categoryIds && filters.categoryIds.length > 0
        ? new Set(filters.categoryIds)
        : undefined;
    const matched: Book[] = all.filter((b: Book): boolean => {
      if (authorSet && !authorSet.has(b.authorId)) return false;
      if (categorySet && !b.categoryIds.some((cid: string): boolean => categorySet.has(cid))) {
        return false;
      }
      return true;
    });
    logger.debug('books.service.findManyByFilters success', { count: matched.length });
    return matched;
  },

  findByAuthorId: async (authorId) => {
    logger.debug('books.service.findByAuthorId start', { authorId });
    const all: Book[] = await booksService.findAll();
    const matched: Book[] = all.filter(
      (b: Book): boolean => b.authorId === authorId,
    );
    logger.debug('books.service.findByAuthorId success', {
      authorId,
      count: matched.length,
    });
    return matched;
  },

  findByCategoryId: async (categoryId) => {
    logger.debug('books.service.findByCategoryId start', { categoryId });
    const all: Book[] = await booksService.findAll();
    const matched: Book[] = all.filter((b: Book): boolean =>
      b.categoryIds.includes(categoryId),
    );
    logger.debug('books.service.findByCategoryId success', {
      categoryId,
      count: matched.length,
    });
    return matched;
  },

  update: async (id, patch) => {
    logger.debug('books.service.update start', { id });
    const existing: Book | undefined = await booksService.findById(id);
    if (!existing) {
      logger.debug('books.service.update not-found', { id });
      return undefined;
    }
    const now = new Date().toISOString();
    const next: Book = {
      id: existing.id,
      title: patch.title !== undefined ? patch.title : existing.title,
      authorId: patch.authorId !== undefined ? patch.authorId : existing.authorId,
      categoryIds:
        patch.categoryIds !== undefined ? patch.categoryIds : existing.categoryIds,
      year: patch.year !== undefined ? patch.year : existing.year,
      pdfKey: patch.pdfKey !== undefined ? patch.pdfKey : existing.pdfKey,
      coverKey: patch.coverKey !== undefined ? patch.coverKey : existing.coverKey,
      createdAt: existing.createdAt,
      updatedAt: now,
      metadata: {
        createdAt: existing.metadata.createdAt,
        updatedAt: now,
      },
    };
    const updated: DynamoItem = await dynamoDb.patchOneById(
      { pk: bookPk(id), sk: SK_VALUE },
      {
        title: next.title,
        authorId: next.authorId,
        categoryIds: next.categoryIds,
        year: next.year,
        pdfKey: next.pdfKey,
        coverKey: next.coverKey,
        metadata: next.metadata,
        updatedAt: now,
      },
    );
    logger.debug('books.service.update success', { id });
    return fromItem(updated);
  },

  delete: async (id) => {
    logger.debug('books.service.delete start', { id });
    const existing: Book | undefined = await booksService.findById(id);
    if (!existing) {
      logger.debug('books.service.delete not-found', { id });
      return false;
    }
    await dynamoDb.deleteOneById({ pk: bookPk(id), sk: SK_VALUE });
    logger.debug('books.service.delete success', { id });
    return true;
  },

  count: async () => {
    logger.debug('books.service.count start');
    const all: Book[] = await booksService.findAll();
    logger.debug('books.service.count success', { count: all.length });
    return all.length;
  },
};
