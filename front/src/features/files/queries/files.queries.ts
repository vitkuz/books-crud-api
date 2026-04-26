import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { qk } from '@/shared/lib/query/keys';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { PresignedReadUrlResponse } from '@/shared/types/api.types';
import { filesApi } from '../api/files.api';

const FIVE_MINUTES_MS = 5 * 60 * 1000;

export const usePresignedReadUrl = (
  key: string | undefined,
): UseQueryResult<PresignedReadUrlResponse> => {
  const { state } = useAuth();
  const isAuthed = state.status === 'authed';
  return useQuery({
    queryKey: qk.files.readUrl(key ?? ''),
    queryFn: (): Promise<PresignedReadUrlResponse> => filesApi.getReadUrl(key!),
    enabled: isAuthed && key !== undefined && key.length > 0,
    staleTime: FIVE_MINUTES_MS,
  });
};
