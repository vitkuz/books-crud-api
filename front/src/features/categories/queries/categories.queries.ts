import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { qk } from '@/shared/lib/query/keys';
import { Category } from '@/shared/types/api.types';
import { categoriesApi } from '../api/categories.api';

export const useCategories = (): UseQueryResult<Category[]> =>
  useQuery({ queryKey: qk.categories.list(), queryFn: categoriesApi.list });

export const useCategory = (id: string | undefined): UseQueryResult<Category> =>
  useQuery({
    queryKey: qk.categories.detail(id ?? ''),
    queryFn: (): Promise<Category> => categoriesApi.get(id!),
    enabled: id !== undefined && id !== '',
  });
