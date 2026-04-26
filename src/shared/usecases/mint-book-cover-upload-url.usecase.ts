import { s3 } from '../clients/s3/instance';
import { booksService } from '../services/books.service';
import { Book } from '../types/book.types';
import { ImageContentType, imageContentTypeToExt } from '../utils/content-type.utils';
import logger from '../utils/logger';

const EXPIRES_IN_SECONDS = 900;

export type MintBookCoverUploadUrlInput = {
  contentType: ImageContentType;
};

export type MintBookCoverUploadUrlResult =
  | { ok: true; url: string; key: string; expiresInSeconds: number }
  | { ok: false; error: 'BOOK_NOT_FOUND' };

export const mintBookCoverUploadUrlUseCase = async (
  bookId: string,
  input: MintBookCoverUploadUrlInput,
): Promise<MintBookCoverUploadUrlResult> => {
  logger.debug('mint-book-cover-upload-url.usecase start', { bookId, contentType: input.contentType });

  const existing: Book | undefined = await booksService.findById(bookId);
  if (!existing) {
    logger.debug('mint-book-cover-upload-url.usecase book-not-found', { bookId });
    return { ok: false, error: 'BOOK_NOT_FOUND' };
  }

  const ext: string = imageContentTypeToExt(input.contentType);
  const key = `books/${bookId}/cover.${ext}`;

  const url: string = await s3.createPresignedUrl({
    key,
    operation: 'put',
    contentType: input.contentType,
    expiresInSeconds: EXPIRES_IN_SECONDS,
  });

  await booksService.setBookCoverKey(bookId, key);

  logger.debug('mint-book-cover-upload-url.usecase success', { bookId, key });
  return { ok: true, url, key, expiresInSeconds: EXPIRES_IN_SECONDS };
};
