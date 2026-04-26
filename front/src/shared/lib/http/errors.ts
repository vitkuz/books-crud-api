export type HttpErrorBody = {
  error?: string;
  message?: string;
  missingIds?: string[];
  issues?: { path: (string | number)[]; message: string }[];
};

export class HttpError extends Error {
  public readonly status: number;
  public readonly body: HttpErrorBody | undefined;
  public readonly bodyText: string;

  constructor(status: number, bodyText: string, body?: HttpErrorBody) {
    super(`HTTP ${status}${body?.error ? ` ${body.error}` : ''}`);
    this.name = 'HttpError';
    this.status = status;
    this.bodyText = bodyText;
    this.body = body;
  }
}
