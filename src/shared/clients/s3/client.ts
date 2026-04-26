import { createPresignedUrlFactory } from './operations/create-presigned-url';
import { deleteFileFactory } from './operations/delete-file';
import { getFileFactory } from './operations/get-file';
import { putFileFactory } from './operations/put-file';
import { S3StorageClient, S3StorageClientSettings } from './types';

export const createS3StorageClient = (
  settings: S3StorageClientSettings,
): S3StorageClient => ({
  getFile: getFileFactory(settings),
  putFile: putFileFactory(settings),
  deleteFile: deleteFileFactory(settings),
  createPresignedUrl: createPresignedUrlFactory(settings),
});
