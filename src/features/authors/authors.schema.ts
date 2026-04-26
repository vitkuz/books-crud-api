import { z } from 'zod';
import { IMAGE_CONTENT_TYPES } from '../../shared/utils/content-type.utils';

export const createAuthorSchema = z.object({
  name: z.string().min(1),
});

export const updateAuthorSchema = createAuthorSchema.partial().refine(
  (patch: Partial<{ name: string }>): boolean => Object.keys(patch).length > 0,
  { message: 'At least one field must be provided' },
);

export const authorIdParamSchema = z.object({
  id: z.string().uuid(),
});

export const batchAuthorsSchema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(100),
});

export const authorPortraitUploadUrlSchema = z.object({
  contentType: z.enum(IMAGE_CONTENT_TYPES),
});
