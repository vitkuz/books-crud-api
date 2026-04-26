import { S3Client } from '@aws-sdk/client-s3';

type CreateSdkClientParams = {
  region: string;
};

export const createSdkClient = (params: CreateSdkClientParams): S3Client =>
  new S3Client({ region: params.region });
