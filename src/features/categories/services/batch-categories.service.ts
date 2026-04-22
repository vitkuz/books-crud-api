import logger from '../../../shared/utils/logger';
import { findCategoryById } from '../categories.store';
import { Category } from '../categories.types';

export const batchCategories = (ids: string[]): Category[] => {
  logger.debug('batch-categories.service start', { count: ids.length });
  const uniqueIds: string[] = Array.from(new Set(ids));
  const found: Category[] = uniqueIds
    .map((id: string): Category | undefined => findCategoryById(id))
    .filter((c: Category | undefined): c is Category => c !== undefined);
  logger.debug('batch-categories.service success', {
    requested: uniqueIds.length,
    found: found.length,
  });
  return found;
};
