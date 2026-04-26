import { authorsService } from '../services/authors.service';
import { booksService } from '../services/books.service';
import { Author } from '../types/author.types';
import { Book } from '../types/book.types';
import { DeleteAuthorResult } from '../types/author.types';
import logger from '../utils/logger';

export const deleteAuthorUseCase = async (
  id: string,
): Promise<DeleteAuthorResult> => {
  logger.debug('delete-author.usecase start', { id });

  const author: Author | undefined = await authorsService.findById(id);
  if (!author) {
    logger.debug('delete-author.usecase not-found', { id });
    return { ok: false, error: 'AUTHOR_NOT_FOUND' };
  }

  const refs: Book[] = await booksService.findByAuthorId(id);
  if (refs.length > 0) {
    logger.debug('delete-author.usecase has-books', { id, count: refs.length });
    return { ok: false, error: 'AUTHOR_HAS_BOOKS' };
  }

  await authorsService.delete(id);
  logger.debug('delete-author.usecase success', { id });
  return { ok: true };
};
