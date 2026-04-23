import logger from '../../../shared/utils/logger';
import { replaceAuthor } from '../authors.store';
import { Author, UpdateAuthorPayload } from '../authors.types';

export const updateAuthor = (id: string, payload: UpdateAuthorPayload): Author | undefined => {
  logger.debug('update-author.service start', { id, payload });
  const updated: Author | undefined = replaceAuthor(id, payload);
  if (!updated) {
    logger.debug('update-author.service not-found', { id });
    return undefined;
  }
  logger.debug('update-author.service success', { id });
  return updated;
};
