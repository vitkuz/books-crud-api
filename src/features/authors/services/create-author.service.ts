import { v4 as uuidv4 } from 'uuid';
import logger from '../../../shared/utils/logger';
import { insertAuthor } from '../authors.store';
import { Author, CreateAuthorPayload } from '../authors.types';

export const createAuthor = (payload: CreateAuthorPayload): Author => {
  logger.debug('create-author.service start', { payload });
  const now: string = new Date().toISOString();
  const author: Author = {
    id: uuidv4(),
    name: payload.name,
    createdAt: now,
    updatedAt: now,
  };
  const inserted: Author = insertAuthor(author);
  logger.debug('create-author.service success', { id: inserted.id });
  return inserted;
};
