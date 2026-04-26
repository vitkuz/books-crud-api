import { authorsService } from '../services/authors.service';
import { booksService, UpdateBookInput } from '../services/books.service';
import { categoriesService } from '../services/categories.service';
import { Author } from '../types/author.types';
import { Book, UpdateBookResult } from '../types/book.types';
import { Category } from '../types/category.types';
import logger from '../utils/logger';

const dedupe = (ids: string[]): string[] => Array.from(new Set(ids));

export const updateBookUseCase = async (
  id: string,
  patch: UpdateBookInput,
): Promise<UpdateBookResult> => {
  logger.debug('update-book.usecase start', { id });

  const existing: Book | undefined = await booksService.findById(id);
  if (!existing) {
    logger.debug('update-book.usecase not-found', { id });
    return { ok: false, error: 'BOOK_NOT_FOUND' };
  }

  if (patch.authorId !== undefined && patch.authorId !== existing.authorId) {
    const author: Author | undefined = await authorsService.findById(patch.authorId);
    if (!author) {
      logger.debug('update-book.usecase author-not-found', { authorId: patch.authorId });
      return { ok: false, error: 'AUTHOR_NOT_FOUND' };
    }
  }

  let categoryIds: string[] | undefined;
  if (patch.categoryIds !== undefined) {
    categoryIds = dedupe(patch.categoryIds);
    const fetched: Category[] = await categoriesService.findManyByIds(categoryIds);
    if (fetched.length !== categoryIds.length) {
      const fetchedIds: Set<string> = new Set(
        fetched.map((c: Category): string => c.id),
      );
      const missingIds: string[] = categoryIds.filter(
        (cid: string): boolean => !fetchedIds.has(cid),
      );
      logger.debug('update-book.usecase invalid-category-ids', { missingIds });
      return { ok: false, error: 'INVALID_CATEGORY_IDS', missingIds };
    }
  }

  const updated: Book | undefined = await booksService.update(id, {
    title: patch.title,
    authorId: patch.authorId,
    categoryIds,
    year: patch.year,
    pdfKey: patch.pdfKey,
    coverKey: patch.coverKey,
  });
  if (!updated) {
    // Race: existed when we checked, gone now. Treat as not-found.
    logger.debug('update-book.usecase not-found-on-replace', { id });
    return { ok: false, error: 'BOOK_NOT_FOUND' };
  }
  logger.debug('update-book.usecase success', { id });
  return { ok: true, book: updated };
};
