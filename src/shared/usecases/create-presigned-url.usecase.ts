import { v4 as uuidv4 } from 'uuid';
import { filesService, PresignedUrlResult } from '../services/files.service';
import logger from '../utils/logger';

const UPLOAD_KEY_PREFIX = 'uploads/';

export type CreatePresignedUrlInput =
  | { operation: 'get'; key: string }
  | { operation: 'put'; contentType?: string };

const generateUploadKey = (): string => `${UPLOAD_KEY_PREFIX}${uuidv4()}`;

export const createPresignedUrlUseCase = async (
  input: CreatePresignedUrlInput,
): Promise<PresignedUrlResult> => {
  logger.debug('create-presigned-url.usecase start', { operation: input.operation });

  if (input.operation === 'put') {
    const key: string = generateUploadKey();
    const result: PresignedUrlResult = await filesService.createPresignedUrl({
      operation: 'put',
      key,
      contentType: input.contentType,
    });
    logger.debug('create-presigned-url.usecase success', { operation: 'put', key });
    return result;
  }

  const result: PresignedUrlResult = await filesService.createPresignedUrl({
    operation: 'get',
    key: input.key,
  });
  logger.debug('create-presigned-url.usecase success', { operation: 'get', key: input.key });
  return result;
};
