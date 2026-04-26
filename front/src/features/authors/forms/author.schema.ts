import { z } from 'zod';

export const authorSchema = z.object({
  name: z.string().min(1, 'Name is required'),
});

export type AuthorFormValues = z.infer<typeof authorSchema>;
