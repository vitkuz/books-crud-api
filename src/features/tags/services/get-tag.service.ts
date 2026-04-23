import { findTagById } from '../tags.store';
import { Tag } from '../tags.types';

export const getTag = (id: string): Tag | undefined => findTagById(id);
