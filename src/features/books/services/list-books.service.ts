import logger from '../../../shared/utils/logger';
import { findAllBooks } from '../books.store';
import { Book } from '../books.types';

export const listBooks = (): Book[] => {
  logger.debug('list-books.service start');
  const books: Book[] = findAllBooks();
  logger.debug('list-books.service success', { count: books.length });
  return books;
};
