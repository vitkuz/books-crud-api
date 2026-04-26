import env from '../../config/env';
import logger from '../../utils/logger';
import { createS3StorageClient } from './client';
import { createSdkClient } from './sdk-client';
import { S3StorageClient } from './types';

export const s3: S3StorageClient = createS3StorageClient({
  bucketName: env.S3_BUCKET_NAME,
  client: createSdkClient({ region: env.AWS_REGION }),
  logger: (msg: string, ctx?: unknown): void => {
    logger.debug(msg, ctx);
  },
});
