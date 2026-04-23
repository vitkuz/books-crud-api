import logger from '../../../shared/utils/logger';
import { findAuthorById } from '../../authors/authors.store';
import { findBookById, replaceBook } from '../books.store';
import { Book, BookPatch, UpdateBookPayload, UpdateBookResult } from '../books.types';
import { dedupeCategoryIds, findMissingCategoryIds } from '../books.utils';

export const updateBook = (id: string, payload: UpdateBookPayload): UpdateBookResult => {
  logger.debug('update-book.service start', { id, payload });
  if (!findBookById(id)) {
    logger.debug('update-book.service not-found', { id });
    return { ok: false, error: 'BOOK_NOT_FOUND' };
  }
  if (payload.authorId !== undefined && !findAuthorById(payload.authorId)) {
    logger.debug('update-book.service author-not-found', { authorId: payload.authorId });
    return { ok: false, error: 'AUTHOR_NOT_FOUND' };
  }
  let categoryIdsPatch: string[] | undefined;
  if (payload.categoryIds !== undefined) {
    categoryIdsPatch = dedupeCategoryIds(payload.categoryIds);
    const missingIds: string[] = findMissingCategoryIds(categoryIdsPatch);
    if (missingIds.length > 0) {
      logger.debug('update-book.service invalid-category-ids', { missingIds });
      return { ok: false, error: 'INVALID_CATEGORY_IDS', missingIds };
    }
  }
  const { categoryIds: _rawCategoryIds, ...rest } = payload;
  const patch: BookPatch = { ...rest };
  if (categoryIdsPatch !== undefined) patch.categoryIds = categoryIdsPatch;
  const updated: Book | undefined = replaceBook(id, patch);
  if (!updated) {
    return { ok: false, error: 'BOOK_NOT_FOUND' };
  }
  logger.debug('update-book.service success', { id });
  return { ok: true, book: updated };
};
