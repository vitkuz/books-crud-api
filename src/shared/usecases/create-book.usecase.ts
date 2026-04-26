import { authorsService } from '../services/authors.service';
import { booksService, CreateBookInput } from '../services/books.service';
import { categoriesService } from '../services/categories.service';
import { Author } from '../types/author.types';
import { Book, CreateBookResult } from '../types/book.types';
import { Category } from '../types/category.types';
import logger from '../utils/logger';

const dedupe = (ids: string[]): string[] => Array.from(new Set(ids));

export const createBookUseCase = async (
  input: CreateBookInput,
): Promise<CreateBookResult> => {
  logger.debug('create-book.usecase start', { title: input.title });

  const author: Author | undefined = await authorsService.findById(input.authorId);
  if (!author) {
    logger.debug('create-book.usecase author-not-found', { authorId: input.authorId });
    return { ok: false, error: 'AUTHOR_NOT_FOUND' };
  }

  const categoryIds: string[] = dedupe(input.categoryIds);
  const fetched: Category[] = await categoriesService.findManyByIds(categoryIds);
  if (fetched.length !== categoryIds.length) {
    const fetchedIds: Set<string> = new Set(fetched.map((c: Category): string => c.id));
    const missingIds: string[] = categoryIds.filter(
      (id: string): boolean => !fetchedIds.has(id),
    );
    logger.debug('create-book.usecase invalid-category-ids', { missingIds });
    return { ok: false, error: 'INVALID_CATEGORY_IDS', missingIds };
  }

  const book: Book = await booksService.create({
    title: input.title,
    authorId: input.authorId,
    categoryIds,
    year: input.year,
  });
  logger.debug('create-book.usecase success', { id: book.id });
  return { ok: true, book };
};
