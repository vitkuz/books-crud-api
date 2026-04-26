import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { qk } from '@/shared/lib/query/keys';
import { BookResponse } from '@/shared/types/api.types';
import { booksApi } from '../api/books.api';

export const useBooks = (): UseQueryResult<BookResponse[]> =>
  useQuery({ queryKey: qk.books.list(), queryFn: booksApi.list });

export const useBook = (id: string | undefined): UseQueryResult<BookResponse> =>
  useQuery({
    queryKey: qk.books.detail(id ?? ''),
    queryFn: (): Promise<BookResponse> => booksApi.get(id!),
    enabled: id !== undefined && id !== '',
  });

export const useBooksCount = (): UseQueryResult<{ count: number }> =>
  useQuery({ queryKey: qk.books.count(), queryFn: booksApi.count });
