import logger from '../../../shared/utils/logger';
import { replaceBook } from '../books.store';
import { Book, UpdateBookPayload } from '../books.types';

export const updateBook = (id: string, payload: UpdateBookPayload): Book | undefined => {
  logger.debug('update-book.service start', { id, payload });
  const now: string = new Date().toISOString();
  const updated: Book | undefined = replaceBook(id, { ...payload, updatedAt: now });
  if (!updated) {
    logger.debug('update-book.service not-found', { id });
    return undefined;
  }
  logger.debug('update-book.service success', { id });
  return updated;
};
