import { BookFilters, booksService } from '../services/books.service';
import { Book } from '../types/book.types';
import logger from '../utils/logger';

export type ListBooksInput = BookFilters;

export const listBooksUseCase = async (filters: ListBooksInput): Promise<Book[]> => {
  logger.debug('list-books.usecase start', {
    authorIds: filters.authorIds?.length ?? 0,
    categoryIds: filters.categoryIds?.length ?? 0,
  });
  const hasFilter = filters.authorIds !== undefined || filters.categoryIds !== undefined;
  const books: Book[] = hasFilter
    ? await booksService.findManyByFilters(filters)
    : await booksService.findAll();
  logger.debug('list-books.usecase success', { count: books.length });
  return books;
};
