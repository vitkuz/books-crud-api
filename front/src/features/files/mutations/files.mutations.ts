import { useMutation, UseMutationResult } from '@tanstack/react-query';
import { toastRequestError } from '@/shared/lib/http/toastErrors';
import { PresignedUploadUrlResponse } from '@/shared/types/api.types';
import { filesApi } from '../api/files.api';
import { s3PutFile } from '../lib/s3PutFile';

export type UploadFileInput = {
  file: File;
  contentType: string;
};

export type UploadFileResult = {
  key: string;
  expiresInSeconds: number;
};

export const useFileUpload = (): UseMutationResult<UploadFileResult, unknown, UploadFileInput> =>
  useMutation({
    mutationFn: async ({ file, contentType }): Promise<UploadFileResult> => {
      const minted: PresignedUploadUrlResponse = await filesApi.getUploadUrl(contentType);
      await s3PutFile(minted.url, file, contentType);
      return { key: minted.key, expiresInSeconds: minted.expiresInSeconds };
    },
    onError: (err: unknown): void => toastRequestError(err, 'Failed to upload file'),
  });
