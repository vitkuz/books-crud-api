import { z } from 'zod';
import { createUserSchema, updateUserSchema } from './users.schema';

export type CreateUserPayload = z.infer<typeof createUserSchema>;
export type UpdateUserPayload = z.infer<typeof updateUserSchema>;
