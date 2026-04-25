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

const defaultLogger = (msg: string, ctx?: unknown): void => {
  if (ctx === undefined || ctx === null || ctx === '') {
    console.log(msg);
    return;
  }
  console.log(msg, typeof ctx === 'string' ? ctx : JSON.stringify(ctx));
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
    const requestId: string = uuidv4().slice(0, 8);
    config.metadata = { requestId, startedAt: Date.now() };
    config.headers.set('x-request-id', requestId);
    const method: string = (config.method ?? 'get').toUpperCase();
    logger(`-> [${requestId}] ${method} ${config.url ?? ''}`, config.data);
    return config;
  });

  client.interceptors.response.use((response: AxiosResponse): AxiosResponse => {
    const meta: RequestMeta | undefined = (response.config as ConfigWithMeta).metadata;
    const requestId: string = meta?.requestId ?? '-';
    const elapsed: number = meta ? Date.now() - meta.startedAt : 0;
    logger(`<- [${requestId}] ${response.status} (${elapsed}ms)`, response.data);
    return response;
  });

  return { client, baseUrl };
};
