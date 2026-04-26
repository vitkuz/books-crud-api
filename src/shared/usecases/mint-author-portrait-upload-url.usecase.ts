import { s3 } from '../clients/s3/instance';
import { authorsService } from '../services/authors.service';
import { Author } from '../types/author.types';
import { ImageContentType, imageContentTypeToExt } from '../utils/content-type.utils';
import logger from '../utils/logger';

const EXPIRES_IN_SECONDS = 900;

export type MintAuthorPortraitUploadUrlInput = {
  contentType: ImageContentType;
};

export type MintAuthorPortraitUploadUrlResult =
  | { ok: true; url: string; key: string; expiresInSeconds: number }
  | { ok: false; error: 'AUTHOR_NOT_FOUND' };

export const mintAuthorPortraitUploadUrlUseCase = async (
  authorId: string,
  input: MintAuthorPortraitUploadUrlInput,
): Promise<MintAuthorPortraitUploadUrlResult> => {
  logger.debug('mint-author-portrait-upload-url.usecase start', {
    authorId,
    contentType: input.contentType,
  });

  const existing: Author | undefined = await authorsService.findById(authorId);
  if (!existing) {
    logger.debug('mint-author-portrait-upload-url.usecase author-not-found', { authorId });
    return { ok: false, error: 'AUTHOR_NOT_FOUND' };
  }

  const ext: string = imageContentTypeToExt(input.contentType);
  const key = `authors/${authorId}/portrait.${ext}`;

  const url: string = await s3.createPresignedUrl({
    key,
    operation: 'put',
    contentType: input.contentType,
    expiresInSeconds: EXPIRES_IN_SECONDS,
  });

  await authorsService.setAuthorPortraitKey(authorId, key);

  logger.debug('mint-author-portrait-upload-url.usecase success', { authorId, key });
  return { ok: true, url, key, expiresInSeconds: EXPIRES_IN_SECONDS };
};
