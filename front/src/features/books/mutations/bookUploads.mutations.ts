import { useMutation, UseMutationResult, useQueryClient } from '@tanstack/react-query';
import { qk } from '@/shared/lib/query/keys';
import { toastRequestError } from '@/shared/lib/http/toastErrors';
import { ImageContentType, PresignedUploadUrlResponse } from '@/shared/types/api.types';
import { s3PutFile } from '@/features/files/lib/s3PutFile';
import { booksApi } from '../api/books.api';

export type UploadBookCoverInput = {
  bookId: string;
  file: File;
  contentType: ImageContentType;
};

export const useUploadBookCover = (): UseMutationResult<
  PresignedUploadUrlResponse,
  unknown,
  UploadBookCoverInput
> => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ bookId, file, contentType }): Promise<PresignedUploadUrlResponse> => {
      const minted: PresignedUploadUrlResponse = await booksApi.mintCoverUploadUrl(bookId, contentType);
      await s3PutFile(minted.url, file, contentType);
      return minted;
    },
    onSuccess: (_data, vars): void => {
      qc.invalidateQueries({ queryKey: qk.books.detail(vars.bookId) });
      qc.invalidateQueries({ queryKey: qk.books.all });
    },
    onError: (err: unknown): void => toastRequestError(err, 'Failed to upload cover'),
  });
};

export type UploadBookPdfInput = {
  bookId: string;
  file: File;
};

export const useUploadBookPdf = (): UseMutationResult<
  PresignedUploadUrlResponse,
  unknown,
  UploadBookPdfInput
> => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ bookId, file }): Promise<PresignedUploadUrlResponse> => {
      const minted: PresignedUploadUrlResponse = await booksApi.mintPdfUploadUrl(bookId);
      await s3PutFile(minted.url, file, 'application/pdf');
      return minted;
    },
    onSuccess: (_data, vars): void => {
      qc.invalidateQueries({ queryKey: qk.books.detail(vars.bookId) });
      qc.invalidateQueries({ queryKey: qk.books.all });
    },
    onError: (err: unknown): void => toastRequestError(err, 'Failed to upload PDF'),
  });
};
