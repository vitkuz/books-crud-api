import logger from '../../../shared/utils/logger';
import { findAuthorById } from '../../authors/authors.store';
import { findBookById, replaceBook } from '../books.store';
import { Book, UpdateBookPayload, UpdateBookResult } from '../books.types';

export const updateBook = (id: string, payload: UpdateBookPayload): UpdateBookResult => {
  logger.debug('update-book.service start', { id, payload });
  if (!findBookById(id)) {
    logger.debug('update-book.service not-found', { id });
    return { ok: false, error: 'BOOK_NOT_FOUND' };
  }
  if (payload.authorId && !findAuthorById(payload.authorId)) {
    logger.debug('update-book.service author-not-found', { authorId: payload.authorId });
    return { ok: false, error: 'AUTHOR_NOT_FOUND' };
  }
  const now: string = new Date().toISOString();
  const updated: Book | undefined = replaceBook(id, { ...payload, updatedAt: now });
  if (!updated) {
    // Race: book existed on check, now gone. Treat as not-found.
    return { ok: false, error: 'BOOK_NOT_FOUND' };
  }
  logger.debug('update-book.service success', { id });
  return { ok: true, book: updated };
};
