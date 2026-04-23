import { Tag } from './tags.types';

const store: Map<string, Tag> = new Map<string, Tag>();

export const insertTag = (tag: Tag): Tag => {
  store.set(tag.id, tag);
  return tag;
};

export const findAllTags = (): Tag[] => Array.from(store.values());

export const findTagById = (id: string): Tag | undefined => store.get(id);

export const replaceTag = (id: string, patch: Partial<Tag>): Tag | undefined => {
  const existing: Tag | undefined = store.get(id);
  if (!existing) return undefined;
  const updated: Tag = { ...existing, ...patch, id: existing.id, createdAt: existing.createdAt };
  store.set(id, updated);
  return updated;
};

export const removeTag = (id: string): boolean => store.delete(id);
