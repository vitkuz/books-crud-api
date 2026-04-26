import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(8, 'At least 8 characters'),
  name: z.string().min(1).optional().or(z.literal('')),
});

export type RegisterFormValues = z.infer<typeof registerSchema>;
