import { z } from 'zod';

const envSchema = z.object({
  VITE_API_BASE_URL: z.string().url(),
});

const env: z.infer<typeof envSchema> = envSchema.parse(import.meta.env);

export default env;
