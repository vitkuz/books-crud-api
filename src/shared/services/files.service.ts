import { s3 } from '../clients/s3/instance';
import logger from '../utils/logger';

const DEFAULT_EXPIRES_IN_SECONDS = 900;

export type CreatePresignedUrlInput =
  | { operation: 'get'; key: string }
  | { operation: 'put'; key: string; contentType?: string };

export type PresignedUrlResult = {
  url: string;
  key: string;
  expiresInSeconds: number;
};

export type FilesService = {
  createPresignedUrl: (input: CreatePresignedUrlInput) => Promise<PresignedUrlResult>;
};

export const filesService: FilesService = {
  createPresignedUrl: async (input) => {
    logger.debug('files.service.createPresignedUrl start', {
      operation: input.operation,
      key: input.key,
    });
    const url: string = await s3.createPresignedUrl({
      key: input.key,
      operation: input.operation,
      expiresInSeconds: DEFAULT_EXPIRES_IN_SECONDS,
      contentType: input.operation === 'put' ? input.contentType : undefined,
    });
    logger.debug('files.service.createPresignedUrl success', {
      operation: input.operation,
      key: input.key,
    });
    return { url, key: input.key, expiresInSeconds: DEFAULT_EXPIRES_IN_SECONDS };
  },
};
