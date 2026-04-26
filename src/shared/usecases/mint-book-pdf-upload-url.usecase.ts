import { s3 } from '../clients/s3/instance';
import { booksService } from '../services/books.service';
import { Book } from '../types/book.types';
import { PDF_CONTENT_TYPE } from '../utils/content-type.utils';
import logger from '../utils/logger';

const EXPIRES_IN_SECONDS = 900;

export type MintBookPdfUploadUrlResult =
  | { ok: true; url: string; key: string; expiresInSeconds: number }
  | { ok: false; error: 'BOOK_NOT_FOUND' };

export const mintBookPdfUploadUrlUseCase = async (
  bookId: string,
): Promise<MintBookPdfUploadUrlResult> => {
  logger.debug('mint-book-pdf-upload-url.usecase start', { bookId });

  const existing: Book | undefined = await booksService.findById(bookId);
  if (!existing) {
    logger.debug('mint-book-pdf-upload-url.usecase book-not-found', { bookId });
    return { ok: false, error: 'BOOK_NOT_FOUND' };
  }

  const key = `books/${bookId}/pdf.pdf`;

  const url: string = await s3.createPresignedUrl({
    key,
    operation: 'put',
    contentType: PDF_CONTENT_TYPE,
    expiresInSeconds: EXPIRES_IN_SECONDS,
  });

  await booksService.setBookPdfKey(bookId, key);

  logger.debug('mint-book-pdf-upload-url.usecase success', { bookId, key });
  return { ok: true, url, key, expiresInSeconds: EXPIRES_IN_SECONDS };
};
