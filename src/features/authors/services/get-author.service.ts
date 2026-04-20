import logger from '../../../shared/utils/logger';
import { findAuthorById } from '../authors.store';
import { Author } from '../authors.types';

export const getAuthor = (id: string): Author | undefined => {
  logger.debug('get-author.service start', { id });
  const author: Author | undefined = findAuthorById(id);
  if (!author) {
    logger.debug('get-author.service not-found', { id });
    return undefined;
  }
  logger.debug('get-author.service success', { id });
  return author;
};
