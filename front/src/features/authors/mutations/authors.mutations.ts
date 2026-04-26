import { useMutation, UseMutationResult, useQueryClient } from '@tanstack/react-query';
import { qk } from '@/shared/lib/query/keys';
import { toastRequestError } from '@/shared/lib/http/toastErrors';
import { Author } from '@/shared/types/api.types';
import { authorsApi, CreateAuthorInput, UpdateAuthorInput } from '../api/authors.api';

export const useCreateAuthor = (): UseMutationResult<Author, unknown, CreateAuthorInput> => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: authorsApi.create,
    onSuccess: (): void => {
      qc.invalidateQueries({ queryKey: qk.authors.all });
    },
    onError: (err: unknown): void => toastRequestError(err, 'Failed to create author'),
  });
};

export const useUpdateAuthor = (): UseMutationResult<
  Author,
  unknown,
  { id: string; input: UpdateAuthorInput }
> => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }): Promise<Author> => authorsApi.update(id, input),
    onSuccess: (updated: Author): void => {
      qc.setQueryData(qk.authors.detail(updated.id), updated);
      qc.invalidateQueries({ queryKey: qk.authors.all });
    },
    onError: (err: unknown): void => toastRequestError(err, 'Failed to update author'),
  });
};

export const useDeleteAuthor = (): UseMutationResult<void, unknown, string> => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: authorsApi.delete,
    onSuccess: (): void => {
      qc.invalidateQueries({ queryKey: qk.authors.all });
      // book responses include author refs; invalidate books so they refetch
      qc.invalidateQueries({ queryKey: qk.books.all });
    },
    onError: (err: unknown): void => toastRequestError(err, 'Failed to delete author'),
  });
};
