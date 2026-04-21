import logger from '../../../shared/utils/logger';
import { findAllAuthors } from '../authors.store';
import { Author } from '../authors.types';

export const listAuthors = (): Author[] => {
  logger.debug('list-authors.service start');
  const authors: Author[] = findAllAuthors();
  logger.debug('list-authors.service success', { count: authors.length });
  return authors;
};
