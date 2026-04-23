import { findTagById } from '../tags.store';
import { Tag } from '../tags.types';

export const batchTags = (ids: string[]): Tag[] =>
  ids.map((id: string): Tag => {
    const tag: Tag | undefined = findTagById(id);
    if (!tag) {
      throw new Error(`Data inconsistency: tag ${id} not found`);
    }
    return tag;
  });
