import logger from '../../../shared/utils/logger';
import { findTagById, replaceTag } from '../tags.store';
import { Tag, UpdateTagPayload } from '../tags.types';

export const updateTag = (id: string, payload: UpdateTagPayload): Tag | undefined => {
  logger.debug('update-tag.service start', { id, payload });
  if (!findTagById(id)) {
    logger.debug('update-tag.service not-found', { id });
    return undefined;
  }
  const now: string = new Date().toISOString();
  const updated: Tag | undefined = replaceTag(id, { ...payload, updatedAt: now });
  if (updated) {
    logger.debug('update-tag.service success', { id });
  }
  return updated;
};
