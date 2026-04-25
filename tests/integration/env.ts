import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  LOCAL_BASE_URL: z.string().url().default('http://localhost:3000'),
  DEPLOY_BASE_URL: z.string().url(),
  DYNAMODB_TABLE_NAME: z.string().min(1).default('books-api-data-dev'),
  AWS_REGION: z.string().min(1).default('us-east-1'),
});

const env: z.infer<typeof envSchema> = envSchema.parse(process.env);

export default env;
