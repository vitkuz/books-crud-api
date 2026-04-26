import { PutObjectCommand } from '@aws-sdk/client-s3';
import { S3StorageClient, S3StorageClientSettings } from '../types';

export const putFileFactory = (
  settings: S3StorageClientSettings,
): S3StorageClient['putFile'] => {
  return async ({ key, body, contentType }) => {
    settings.logger?.('s3.putFile start', { key, contentType });
    await settings.client.send(
      new PutObjectCommand({
        Bucket: settings.bucketName,
        Key: key,
        Body: body,
        ContentType: contentType,
      }),
    );
    settings.logger?.('s3.putFile success', { key });
  };
};
