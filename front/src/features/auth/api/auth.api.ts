import { fetchJson } from '@/shared/lib/http/fetchJson';
import { fetchJsonAuthed } from '@/shared/lib/http/fetchJsonAuthed';
import { AuthLoginResponse, UserResponse } from '@/shared/types/api.types';

export type LoginPayload = { email: string; password: string };
export type RegisterPayload = { email: string; password: string; name?: string };

export const authApi = {
  login: (payload: LoginPayload): Promise<AuthLoginResponse> =>
    fetchJson<AuthLoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  register: (payload: RegisterPayload): Promise<AuthLoginResponse> =>
    fetchJson<AuthLoginResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  me: (): Promise<UserResponse> =>
    fetchJsonAuthed<UserResponse>('/auth/me'),

  logout: (): Promise<void> =>
    fetchJsonAuthed<void>('/auth/logout', { method: 'POST' }),
};
