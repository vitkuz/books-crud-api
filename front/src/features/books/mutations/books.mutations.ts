import { useMutation, UseMutationResult, useQueryClient } from '@tanstack/react-query';
import { qk } from '@/shared/lib/query/keys';
import { toastRequestError } from '@/shared/lib/http/toastErrors';
import { BookResponse } from '@/shared/types/api.types';
import { booksApi, CreateBookInput, UpdateBookInput } from '../api/books.api';

export const useCreateBook = (): UseMutationResult<BookResponse, unknown, CreateBookInput> => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: booksApi.create,
    onSuccess: (): void => {
      qc.invalidateQueries({ queryKey: qk.books.all });
    },
    onError: (err: unknown): void => toastRequestError(err, 'Failed to create book'),
  });
};

export const useUpdateBook = (): UseMutationResult<
  BookResponse,
  unknown,
  { id: string; input: UpdateBookInput }
> => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }): Promise<BookResponse> => booksApi.update(id, input),
    onSuccess: (updated: BookResponse): void => {
      qc.setQueryData(qk.books.detail(updated.id), updated);
      qc.invalidateQueries({ queryKey: qk.books.all });
    },
    onError: (err: unknown): void => toastRequestError(err, 'Failed to update book'),
  });
};

export const useDeleteBook = (): UseMutationResult<void, unknown, string> => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: booksApi.delete,
    onSuccess: (): void => {
      qc.invalidateQueries({ queryKey: qk.books.all });
    },
    onError: (err: unknown): void => toastRequestError(err, 'Failed to delete book'),
  });
};
