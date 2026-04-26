import { GetObjectCommand, GetObjectCommandOutput, NoSuchKey } from '@aws-sdk/client-s3';
import { S3StorageClient, S3StorageClientSettings } from '../types';

const isNotFound = (err: unknown): boolean => {
  if (err instanceof NoSuchKey) return true;
  const meta: { httpStatusCode?: number } | undefined = (err as { $metadata?: { httpStatusCode?: number } })
    ?.$metadata;
  return meta?.httpStatusCode === 404;
};

export const getFileFactory = (
  settings: S3StorageClientSettings,
): S3StorageClient['getFile'] => {
  return async (key) => {
    settings.logger?.('s3.getFile start', { key });
    try {
      const result: GetObjectCommandOutput = await settings.client.send(
        new GetObjectCommand({
          Bucket: settings.bucketName,
          Key: key,
        }),
      );
      if (result.Body === undefined) {
        settings.logger?.('s3.getFile success empty', { key });
        return Buffer.alloc(0);
      }
      const bytes: Uint8Array = await result.Body.transformToByteArray();
      settings.logger?.('s3.getFile success', { key, bytes: bytes.byteLength });
      return Buffer.from(bytes);
    } catch (err) {
      if (isNotFound(err)) {
        settings.logger?.('s3.getFile not found', { key });
        return undefined;
      }
      throw err;
    }
  };
};
