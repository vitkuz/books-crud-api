import { DeleteObjectCommand } from '@aws-sdk/client-s3';
import { S3StorageClient, S3StorageClientSettings } from '../types';

export const deleteFileFactory = (
  settings: S3StorageClientSettings,
): S3StorageClient['deleteFile'] => {
  return async (key) => {
    settings.logger?.('s3.deleteFile start', { key });
    await settings.client.send(
      new DeleteObjectCommand({
        Bucket: settings.bucketName,
        Key: key,
      }),
    );
    settings.logger?.('s3.deleteFile success', { key });
  };
};
