import { S3Client } from '@aws-sdk/client-s3';

export type S3ClientLogger = (msg: string, ctx?: unknown) => void;

export type S3StorageClientSettings = {
  bucketName: string;
  client: S3Client;
  logger?: S3ClientLogger;
};

export type PutFileInput = {
  key: string;
  body: Buffer | Uint8Array | string;
  contentType?: string;
};

export type PresignedUrlOperation = 'get' | 'put';

export type CreatePresignedUrlInput = {
  key: string;
  operation: PresignedUrlOperation;
  expiresInSeconds?: number;
  contentType?: string;
};

export type S3StorageClient = {
  getFile: (key: string) => Promise<Buffer | undefined>;
  putFile: (input: PutFileInput) => Promise<void>;
  deleteFile: (key: string) => Promise<void>;
  createPresignedUrl: (input: CreatePresignedUrlInput) => Promise<string>;
};
