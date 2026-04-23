import { v4 as uuidv4 } from 'uuid';
import logger from '../../../shared/utils/logger';
import { insertTag } from '../tags.store';
import { CreateTagPayload, Tag } from '../tags.types';

export const createTag = (payload: CreateTagPayload): Tag => {
  logger.debug('create-tag.service start', { payload });
  const now: string = new Date().toISOString();
  const tag: Tag = {
    id: uuidv4(),
    name: payload.name,
    createdAt: now,
    updatedAt: now,
  };
  const inserted: Tag = insertTag(tag);
  logger.debug('create-tag.service success', { id: inserted.id });
  return inserted;
};
