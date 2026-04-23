import { v4 as uuidv4 } from 'uuid';
import logger from '../../../shared/utils/logger';
import { findAuthorById } from '../../authors/authors.store';
import { insertBook } from '../books.store';
import { Book, CreateBookPayload, CreateBookResult } from '../books.types';
import { dedupeCategoryIds, findMissingCategoryIds } from '../books.utils';

export const createBook = (payload: CreateBookPayload): CreateBookResult => {
  logger.debug('create-book.service start', { payload });
  if (!findAuthorById(payload.authorId)) {
    logger.debug('create-book.service author-not-found', { authorId: payload.authorId });
    return { ok: false, error: 'AUTHOR_NOT_FOUND' };
  }
  const categoryIds: string[] = dedupeCategoryIds(payload.categoryIds);
  const missingIds: string[] = findMissingCategoryIds(categoryIds);
  if (missingIds.length > 0) {
    logger.debug('create-book.service invalid-category-ids', { missingIds });
    return { ok: false, error: 'INVALID_CATEGORY_IDS', missingIds };
  }
  const now: string = new Date().toISOString();
  const book: Book = {
    id: uuidv4(),
    title: payload.title,
    authorId: payload.authorId,
    categoryIds,
    year: payload.year,
    metadata: { createdAt: now, updatedAt: now },
  };
  const inserted: Book = insertBook(book);
  logger.debug('create-book.service success', { id: inserted.id });
  return { ok: true, book: inserted };
};
