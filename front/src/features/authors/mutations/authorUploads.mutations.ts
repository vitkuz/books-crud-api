import { useMutation, UseMutationResult, useQueryClient } from '@tanstack/react-query';
import { qk } from '@/shared/lib/query/keys';
import { toastRequestError } from '@/shared/lib/http/toastErrors';
import { ImageContentType, PresignedUploadUrlResponse } from '@/shared/types/api.types';
import { s3PutFile } from '@/features/files/lib/s3PutFile';
import { authorsApi } from '../api/authors.api';

export type UploadAuthorPortraitInput = {
  authorId: string;
  file: File;
  contentType: ImageContentType;
};

export const useUploadAuthorPortrait = (): UseMutationResult<
  PresignedUploadUrlResponse,
  unknown,
  UploadAuthorPortraitInput
> => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ authorId, file, contentType }): Promise<PresignedUploadUrlResponse> => {
      const minted: PresignedUploadUrlResponse = await authorsApi.mintPortraitUploadUrl(
        authorId,
        contentType,
      );
      await s3PutFile(minted.url, file, contentType);
      return minted;
    },
    onSuccess: (_data, vars): void => {
      qc.invalidateQueries({ queryKey: qk.authors.detail(vars.authorId) });
      qc.invalidateQueries({ queryKey: qk.authors.all });
    },
    onError: (err: unknown): void => toastRequestError(err, 'Failed to upload portrait'),
  });
};
