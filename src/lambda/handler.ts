import serverlessExpress from '@codegenie/serverless-express';
import type { Handler } from 'aws-lambda';
import { createApp } from '../app';

export const handler: Handler = serverlessExpress({ app: createApp() });
