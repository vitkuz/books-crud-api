import { z } from 'zod';
import { createAuthorSchema, updateAuthorSchema } from './authors.schema';

export type CreateAuthorPayload = z.infer<typeof createAuthorSchema>;
export type UpdateAuthorPayload = z.infer<typeof updateAuthorSchema>;
