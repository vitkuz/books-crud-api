import { booksService } from '../services/books.service';
import { categoriesService } from '../services/categories.service';
import { Book } from '../types/book.types';
import { Category, DeleteCategoryResult } from '../types/category.types';
import logger from '../utils/logger';

export const deleteCategoryUseCase = async (
  id: string,
): Promise<DeleteCategoryResult> => {
  logger.debug('delete-category.usecase start', { id });

  const category: Category | undefined = await categoriesService.findById(id);
  if (!category) {
    logger.debug('delete-category.usecase not-found', { id });
    return { ok: false, error: 'CATEGORY_NOT_FOUND' };
  }

  const refs: Book[] = await booksService.findByCategoryId(id);
  if (refs.length > 0) {
    logger.debug('delete-category.usecase has-books', { id, count: refs.length });
    return { ok: false, error: 'CATEGORY_HAS_BOOKS' };
  }

  await categoriesService.delete(id);
  logger.debug('delete-category.usecase success', { id });
  return { ok: true };
};
