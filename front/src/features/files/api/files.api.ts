import { fetchJsonAuthed } from '@/shared/lib/http/fetchJsonAuthed';
import {
  PresignedReadUrlResponse,
  PresignedUploadUrlResponse,
} from '@/shared/types/api.types';

export const filesApi = {
  getReadUrl: (key: string): Promise<PresignedReadUrlResponse> =>
    fetchJsonAuthed<PresignedReadUrlResponse>('/files/presigned-url', {
      method: 'POST',
      body: JSON.stringify({ operation: 'get', key }),
    }),
  getUploadUrl: (contentType: string): Promise<PresignedUploadUrlResponse> =>
    fetchJsonAuthed<PresignedUploadUrlResponse>('/files/presigned-url', {
      method: 'POST',
      body: JSON.stringify({ operation: 'put', contentType }),
    }),
};
