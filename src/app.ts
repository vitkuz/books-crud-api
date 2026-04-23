import express, { Application, NextFunction, Request, Response } from 'express';
import logger from './shared/utils/logger';
import { authorsRouter } from './features/authors';
import { booksRouter } from './features/books';
import { categoriesRouter } from './features/categories';
import { tagsRouter } from './features/tags';

export const createApp = (): Application => {
  const app: Application = express();

  app.use(express.json());

  app.use((req: Request, _res: Response, next: NextFunction): void => {
    logger.debug('http request', { method: req.method, url: req.url });
    next();
  });

  app.get('/health', (_req: Request, res: Response): Response => res.status(200).json({ ok: true }));

  app.use('/authors', authorsRouter);
  app.use('/categories', categoriesRouter);
  app.use('/tags', tagsRouter);
  app.use('/books', booksRouter);

  app.use((_req: Request, res: Response): Response => res.status(404).json({ error: 'NotFound' }));

  app.use((err: Error, _req: Request, res: Response, _next: NextFunction): Response => {
    logger.error('unhandled error', { message: err.message, stack: err.stack });
    return res.status(500).json({ error: 'InternalServerError' });
  });

  return app;
};
