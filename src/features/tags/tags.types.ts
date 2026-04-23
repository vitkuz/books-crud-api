import { z } from 'zod';
import { createTagSchema, updateTagSchema } from './tags.schema';

export type Tag = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
};

export type TagResponse = Tag;

export type CreateTagPayload = z.infer<typeof createTagSchema>;
export type UpdateTagPayload = z.infer<typeof updateTagSchema>;

export type DeleteTagResult =
  | { ok: true }
  | { ok: false; error: 'TAG_NOT_FOUND' | 'TAG_HAS_BOOKS' };
