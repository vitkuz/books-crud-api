import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { qk } from '@/shared/lib/query/keys';
import { Author } from '@/shared/types/api.types';
import { authorsApi } from '../api/authors.api';

export const useAuthors = (): UseQueryResult<Author[]> =>
  useQuery({ queryKey: qk.authors.list(), queryFn: authorsApi.list });

export const useAuthor = (id: string | undefined): UseQueryResult<Author> =>
  useQuery({
    queryKey: qk.authors.detail(id ?? ''),
    queryFn: (): Promise<Author> => authorsApi.get(id!),
    enabled: id !== undefined && id !== '',
  });
