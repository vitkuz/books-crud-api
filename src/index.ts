import { Application } from 'express';
import env from './shared/config/env';
import logger from './shared/utils/logger';
import { createApp } from './app';

const app: Application = createApp();

app.listen(env.PORT, (): void => {
  logger.info(`server listening on port ${env.PORT}`, { env: env.NODE_ENV });
});
