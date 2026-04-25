#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { ApiStack } from '../lib/api-stack';

const app: cdk.App = new cdk.App();

const env: cdk.Environment = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION ?? 'us-east-1',
};

new ApiStack(app, 'books-api-stack-dev', {
  env,
  stackName: 'books-api-stack-dev',
  description: 'books-crud-api Express app deployed as a Lambda fronted by API Gateway HTTP API.',
  tags: {
    project: 'books-api',
    env: 'dev',
  },
});
