import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  PORT: z.coerce.number().min(1000),
  NODE_ENV: z.enum(['development', 'production', 'test']),
});

const env: z.infer<typeof envSchema> = envSchema.parse(process.env);

export default env;
