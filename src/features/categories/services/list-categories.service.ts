import logger from '../../../shared/utils/logger';
import { findAllCategories } from '../categories.store';
import { Category } from '../categories.types';

export const listCategories = (): Category[] => {
  logger.debug('list-categories.service start');
  const categories: Category[] = findAllCategories();
  logger.debug('list-categories.service success', { count: categories.length });
  return categories;
};
