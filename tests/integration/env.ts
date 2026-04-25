import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  LOCAL_BASE_URL: z.string().url().default('http://localhost:3000'),
  DEPLOY_BASE_URL: z.string().url(),
});

const env: z.infer<typeof envSchema> = envSchema.parse(process.env);

export default env;
