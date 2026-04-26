import { useMutation, UseMutationResult, useQueryClient } from '@tanstack/react-query';
import { qk } from '@/shared/lib/query/keys';
import { toastRequestError } from '@/shared/lib/http/toastErrors';
import { Category } from '@/shared/types/api.types';
import { categoriesApi, CreateCategoryInput, UpdateCategoryInput } from '../api/categories.api';

export const useCreateCategory = (): UseMutationResult<Category, unknown, CreateCategoryInput> => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: categoriesApi.create,
    onSuccess: (): void => {
      qc.invalidateQueries({ queryKey: qk.categories.all });
    },
    onError: (err: unknown): void => toastRequestError(err, 'Failed to create category'),
  });
};

export const useUpdateCategory = (): UseMutationResult<
  Category,
  unknown,
  { id: string; input: UpdateCategoryInput }
> => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }): Promise<Category> => categoriesApi.update(id, input),
    onSuccess: (updated: Category): void => {
      qc.setQueryData(qk.categories.detail(updated.id), updated);
      qc.invalidateQueries({ queryKey: qk.categories.all });
    },
    onError: (err: unknown): void => toastRequestError(err, 'Failed to update category'),
  });
};

export const useDeleteCategory = (): UseMutationResult<void, unknown, string> => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: categoriesApi.delete,
    onSuccess: (): void => {
      qc.invalidateQueries({ queryKey: qk.categories.all });
      qc.invalidateQueries({ queryKey: qk.books.all });
    },
    onError: (err: unknown): void => toastRequestError(err, 'Failed to delete category'),
  });
};
