import logger from '../../../shared/utils/logger';
import { findAllBooks } from '../../books/books.store';
import { findAuthorById, removeAuthor } from '../authors.store';
import { DeleteAuthorResult } from '../authors.types';

export const deleteAuthor = (id: string): DeleteAuthorResult => {
  logger.debug('delete-author.service start', { id });
  if (!findAuthorById(id)) {
    logger.debug('delete-author.service not-found', { id });
    return { ok: false, error: 'AUTHOR_NOT_FOUND' };
  }
  const hasBooks: boolean = findAllBooks().some((b: { authorId: string }): boolean => b.authorId === id);
  if (hasBooks) {
    logger.debug('delete-author.service has-books', { id });
    return { ok: false, error: 'AUTHOR_HAS_BOOKS' };
  }
  removeAuthor(id);
  logger.debug('delete-author.service success', { id });
  return { ok: true };
};
