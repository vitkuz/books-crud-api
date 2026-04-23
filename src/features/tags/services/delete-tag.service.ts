import logger from '../../../shared/utils/logger';
import { findAllBooks } from '../../books/books.store';
import { findTagById, removeTag } from '../tags.store';
import { DeleteTagResult } from '../tags.types';

export const deleteTag = (id: string): DeleteTagResult => {
  logger.debug('delete-tag.service start', { id });
  if (!findTagById(id)) {
    logger.debug('delete-tag.service not-found', { id });
    return { ok: false, error: 'TAG_NOT_FOUND' };
  }
  const hasBooks = findAllBooks().some(
    (b: { tagIds: string[] }): boolean => b.tagIds.includes(id),
  );
  if (hasBooks) {
    logger.debug('delete-tag.service has-books', { id });
    return { ok: false, error: 'TAG_HAS_BOOKS' };
  }
  removeTag(id);
  logger.debug('delete-tag.service success', { id });
  return { ok: true };
};
