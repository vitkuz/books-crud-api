import logger from '../../../shared/utils/logger';
import { replaceCategory } from '../categories.store';
import { Category, UpdateCategoryPayload } from '../categories.types';

export const updateCategory = (
  id: string,
  payload: UpdateCategoryPayload,
): Category | undefined => {
  logger.debug('update-category.service start', { id, payload });
  const updated: Category | undefined = replaceCategory(id, payload);
  if (!updated) {
    logger.debug('update-category.service not-found', { id });
    return undefined;
  }
  logger.debug('update-category.service success', { id });
  return updated;
};
