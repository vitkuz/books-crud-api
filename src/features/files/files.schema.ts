import { z } from 'zod';

export const presignedUrlSchema = z.discriminatedUnion('operation', [
  z.object({
    operation: z.literal('get'),
    key: z.string().min(1),
  }),
  z.object({
    operation: z.literal('put'),
    contentType: z.string().min(1).optional(),
  }),
]);
