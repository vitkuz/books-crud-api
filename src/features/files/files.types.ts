import { z } from 'zod';
import { presignedUrlSchema } from './files.schema';

export type PresignedUrlPayload = z.infer<typeof presignedUrlSchema>;
