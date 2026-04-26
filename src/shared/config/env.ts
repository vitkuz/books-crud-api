import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  PORT: z.coerce.number().min(1000),
  NODE_ENV: z.enum(['development', 'production', 'test']),
  AWS_REGION: z.string().min(1).default('us-east-1'),
  DYNAMODB_TABLE_NAME: z.string().min(1),
  S3_BUCKET_NAME: z.string().min(1),
});

const env: z.infer<typeof envSchema> = envSchema.parse(process.env);

export default env;
