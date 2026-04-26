import { fetchJson } from './fetchJson';
import { getStoredToken } from './tokenStore';

export const fetchJsonAuthed = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const token: string | undefined = getStoredToken();
  return fetchJson<T>(path, {
    ...init,
    headers: {
      ...(init?.headers ?? {}),
      ...(token !== undefined ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
};
