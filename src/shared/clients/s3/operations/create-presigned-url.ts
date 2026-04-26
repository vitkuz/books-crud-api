import { GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { S3StorageClient, S3StorageClientSettings } from '../types';

const DEFAULT_EXPIRES_IN_SECONDS: number = 900;

export const createPresignedUrlFactory = (
  settings: S3StorageClientSettings,
): S3StorageClient['createPresignedUrl'] => {
  return async ({ key, operation, expiresInSeconds, contentType }) => {
    const expiresIn: number = expiresInSeconds ?? DEFAULT_EXPIRES_IN_SECONDS;
    settings.logger?.('s3.createPresignedUrl start', { key, operation, expiresIn });

    const command: GetObjectCommand | PutObjectCommand =
      operation === 'get'
        ? new GetObjectCommand({ Bucket: settings.bucketName, Key: key })
        : new PutObjectCommand({
            Bucket: settings.bucketName,
            Key: key,
            ContentType: contentType,
          });

    const url: string = await getSignedUrl(settings.client, command, { expiresIn });
    settings.logger?.('s3.createPresignedUrl success', { key, operation });
    return url;
  };
};
