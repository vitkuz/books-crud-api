import { v4 as uuidv4 } from 'uuid';
import logger from '../../../shared/utils/logger';
import { insertCategory } from '../categories.store';
import { Category, CreateCategoryPayload } from '../categories.types';

export const createCategory = (payload: CreateCategoryPayload): Category => {
  logger.debug('create-category.service start', { payload });
  const now = new Date().toISOString();
  const category: Category = {
    id: uuidv4(),
    name: payload.name,
    metadata: { createdAt: now, updatedAt: now },
  };
  const inserted: Category = insertCategory(category);
  logger.debug('create-category.service success', { id: inserted.id });
  return inserted;
};
