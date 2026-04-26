import { fetchJsonAuthed } from '@/shared/lib/http/fetchJsonAuthed';
import { PresignedReadUrlResponse } from '@/shared/types/api.types';

export const filesApi = {
  getReadUrl: (key: string): Promise<PresignedReadUrlResponse> =>
    fetchJsonAuthed<PresignedReadUrlResponse>('/files/presigned-url', {
      method: 'POST',
      body: JSON.stringify({ operation: 'get', key }),
    }),
};
