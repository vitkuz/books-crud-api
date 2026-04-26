import env from '@/app/config/env';
import { HttpError, HttpErrorBody } from './errors';

const tryParseJson = (text: string): HttpErrorBody | undefined => {
  try {
    return JSON.parse(text) as HttpErrorBody;
  } catch {
    return undefined;
  }
};

export const fetchJson = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const url: string = path.startsWith('http')
    ? path
    : `${env.VITE_API_BASE_URL.replace(/\/$/, '')}${path}`;

  const res: Response = await fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });

  if (!res.ok) {
    const text: string = await res.text().catch((): string => '');
    throw new HttpError(res.status, text, tryParseJson(text));
  }

  if (res.status === 204) {
    return undefined as T;
  }

  return (await res.json()) as T;
};
