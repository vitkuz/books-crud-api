import logger from '../../../shared/utils/logger';
import { findAuthorById } from '../../authors/authors.store';
import { findBookById, replaceBook } from '../books.store';
import { Book, UpdateBookPayload, UpdateBookResult } from '../books.types';
import {
  dedupeCategoryIds,
  dedupeTagIds,
  findMissingCategoryIds,
  findMissingTagIds,
} from '../books.utils';

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
    const missingCategoryIds: string[] = findMissingCategoryIds(categoryIdsPatch);
    if (missingCategoryIds.length > 0) {
      logger.debug('update-book.service invalid-category-ids', { missingCategoryIds });
      return { ok: false, error: 'INVALID_CATEGORY_IDS', missingIds: missingCategoryIds };
    }
  }
  let tagIdsPatch: string[] | undefined;
  if (payload.tagIds !== undefined) {
    tagIdsPatch = dedupeTagIds(payload.tagIds);
    const missingTagIds: string[] = findMissingTagIds(tagIdsPatch);
    if (missingTagIds.length > 0) {
      logger.debug('update-book.service invalid-tag-ids', { missingTagIds });
      return { ok: false, error: 'INVALID_TAG_IDS', missingIds: missingTagIds };
    }
  }
  const now = new Date().toISOString();
  const { categoryIds: _rawCategoryIds, tagIds: _rawTagIds, ...rest } = payload;
  const patch: Partial<Book> = { ...rest, updatedAt: now };
  if (categoryIdsPatch !== undefined) patch.categoryIds = categoryIdsPatch;
  if (tagIdsPatch !== undefined) patch.tagIds = tagIdsPatch;
  const updated: Book | undefined = replaceBook(id, patch);
  if (!updated) {
    return { ok: false, error: 'BOOK_NOT_FOUND' };
  }
  logger.debug('update-book.service success', { id });
  return { ok: true, book: updated };
};
