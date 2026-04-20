import logger from '../../../shared/utils/logger';
import { removeBook } from '../books.store';

export const deleteBook = (id: string): boolean => {
  logger.debug('delete-book.service start', { id });
  const removed: boolean = removeBook(id);
  if (!removed) {
    logger.debug('delete-book.service not-found', { id });
    return false;
  }
  logger.debug('delete-book.service success', { id });
  return true;
};
