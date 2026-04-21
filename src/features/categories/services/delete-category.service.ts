import logger from '../../../shared/utils/logger';
import { findAllBooks } from '../../books/books.store';
import { findCategoryById, removeCategory } from '../categories.store';
import { DeleteCategoryResult } from '../categories.types';

export const deleteCategory = (id: string): DeleteCategoryResult => {
  logger.debug('delete-category.service start', { id });
  if (!findCategoryById(id)) {
    logger.debug('delete-category.service not-found', { id });
    return { ok: false, error: 'CATEGORY_NOT_FOUND' };
  }
  const hasBooks = findAllBooks().some(
    (b: { categoryIds: string[] }): boolean => b.categoryIds.includes(id),
  );
  if (hasBooks) {
    logger.debug('delete-category.service has-books', { id });
    return { ok: false, error: 'CATEGORY_HAS_BOOKS' };
  }
  removeCategory(id);
  logger.debug('delete-category.service success', { id });
  return { ok: true };
};
