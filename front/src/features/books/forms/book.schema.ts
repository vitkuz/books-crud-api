import { z } from 'zod';

export const bookSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  authorId: z.string().uuid('Pick an author'),
  categoryIds: z.array(z.string().uuid()).default([]),
  year: z.coerce
    .number()
    .int('Year must be a whole number')
    .min(0, 'Year cannot be negative')
    .max(3000, 'Year too far in the future'),
});

export type BookFormValues = z.infer<typeof bookSchema>;
