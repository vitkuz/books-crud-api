import { findAllTags } from '../tags.store';
import { Tag } from '../tags.types';

export const listTags = (): Tag[] => findAllTags();
