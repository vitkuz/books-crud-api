import { z } from 'zod';
import { IMAGE_CONTENT_TYPES } from '../../shared/utils/content-type.utils';

export const createBookSchema = z.object({
  title: z.string().min(1),
  authorId: z.string().uuid(),
  categoryIds: z.array(z.string().uuid()).default([]),
  year: z.number().int().min(0).max(9999),
});

export const updateBookSchema = createBookSchema.partial().refine(
  (patch: Partial<{
    title: string;
    authorId: string;
    categoryIds: string[];
    year: number;
  }>): boolean => Object.keys(patch).length > 0,
  { message: 'At least one field must be provided' },
);

export const bookIdParamSchema = z.object({
  id: z.string().uuid(),
});

export const batchBooksSchema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(100),
});

export const bookCoverUploadUrlSchema = z.object({
  contentType: z.enum(IMAGE_CONTENT_TYPES),
});
