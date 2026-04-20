import { v4 as uuidv4 } from 'uuid';
import logger from '../../../shared/utils/logger';
import { insertBook } from '../books.store';
import { Book, CreateBookPayload } from '../books.types';

export const createBook = (payload: CreateBookPayload): Book => {
  logger.debug('create-book.service start', { payload });
  const now: string = new Date().toISOString();
  const book: Book = {
    id: uuidv4(),
    title: payload.title,
    author: payload.author,
    year: payload.year,
    createdAt: now,
    updatedAt: now,
  };
  const inserted: Book = insertBook(book);
  logger.debug('create-book.service success', { id: inserted.id });
  return inserted;
};
