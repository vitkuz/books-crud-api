import logger from '../../../shared/utils/logger';
import { findAuthorById } from '../authors.store';
import { Author } from '../authors.types';

export const batchAuthors = (ids: string[]): Author[] => {
  logger.debug('batch-authors.service start', { count: ids.length });
  const uniqueIds: string[] = Array.from(new Set(ids));
  const found: Author[] = uniqueIds
    .map((id: string): Author | undefined => findAuthorById(id))
    .filter((a: Author | undefined): a is Author => a !== undefined);
  logger.debug('batch-authors.service success', {
    requested: uniqueIds.length,
    found: found.length,
  });
  return found;
};
