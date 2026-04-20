import logger from '../../../shared/utils/logger';
import { findBookById } from '../books.store';
import { Book } from '../books.types';

export const getBook = (id: string): Book | undefined => {
  logger.debug('get-book.service start', { id });
  const book: Book | undefined = findBookById(id);
  if (!book) {
    logger.debug('get-book.service not-found', { id });
    return undefined;
  }
  logger.debug('get-book.service success', { id });
  return book;
};
