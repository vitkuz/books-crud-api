import axios, { AxiosInstance, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { v4 as uuidv4 } from 'uuid';

export type HttpAdapter = {
  client: AxiosInstance;
  baseUrl: string;
};

type CreateHttpAdapterParams = {
  baseUrl: string;
  logger?: (msg: string, ctx?: unknown) => void;
};

type RequestMeta = {
  requestId: string;
  startedAt: number;
};

type ConfigWithMeta = InternalAxiosRequestConfig & { metadata?: RequestMeta };

const SECRET_KEYS: ReadonlySet<string> = new Set([
  'password',
  'passwordHash',
  'token',
  'authorization',
]);

const redact = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(redact);
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([k, v]) =>
        SECRET_KEYS.has(k) ? [k, '<redacted>'] : [k, redact(v)],
      ),
    );
  }
  return value;
};

const defaultLogger = (msg: string, ctx?: unknown): void => {
  if (ctx === undefined || ctx === null || ctx === '') {
    console.log(msg);
    return;
  }
  const safe: unknown = redact(ctx);
  console.log(msg, typeof safe === 'string' ? safe : JSON.stringify(safe));
};

export const createHttpAdapter = ({
  baseUrl,
  logger = defaultLogger,
}: CreateHttpAdapterParams): HttpAdapter => {
  const client: AxiosInstance = axios.create({
    baseURL: baseUrl,
    timeout: 15000,
    validateStatus: (): boolean => true,
  });

  client.interceptors.request.use((config: ConfigWithMeta): ConfigWithMeta => {
    const requestId = uuidv4().slice(0, 8);
    config.metadata = { requestId, startedAt: Date.now() };
    config.headers.set('x-request-id', requestId);
    const method = (config.method ?? 'get').toUpperCase();
    logger(`-> [${requestId}] ${method} ${config.url ?? ''}`, config.data);
    return config;
  });

  client.interceptors.response.use((response: AxiosResponse): AxiosResponse => {
    const meta: RequestMeta | undefined = (response.config as ConfigWithMeta).metadata;
    const requestId = meta?.requestId ?? '-';
    const elapsed = meta ? Date.now() - meta.startedAt : 0;
    logger(`<- [${requestId}] ${response.status} (${elapsed}ms)`, response.data);
    return response;
  });

  return { client, baseUrl };
};
