import logger from '../../../shared/utils/logger';
import { findBookById } from '../books.store';
import { Book } from '../books.types';

export const batchBooks = (ids: string[]): Book[] => {
  logger.debug('batch-books.service start', { count: ids.length });
  const uniqueIds: string[] = Array.from(new Set(ids));
  const found: Book[] = uniqueIds
    .map((id: string): Book | undefined => findBookById(id))
    .filter((b: Book | undefined): b is Book => b !== undefined);
  logger.debug('batch-books.service success', {
    requested: uniqueIds.length,
    found: found.length,
  });
  return found;
};
