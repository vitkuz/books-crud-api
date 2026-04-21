import logger from '../../../shared/utils/logger';
import { findCategoryById } from '../categories.store';
import { Category } from '../categories.types';

export const getCategory = (id: string): Category | undefined => {
  logger.debug('get-category.service start', { id });
  const category: Category | undefined = findCategoryById(id);
  if (!category) {
    logger.debug('get-category.service not-found', { id });
    return undefined;
  }
  logger.debug('get-category.service success', { id });
  return category;
};
