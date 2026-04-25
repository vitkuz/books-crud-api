import env from '../../config/env';
import logger from '../../utils/logger';
import { createDynamoDbClient } from './client';
import { createSdkDocClient } from './sdk-client';
import { DynamoDbClient } from './types';

export const dynamoDb: DynamoDbClient = createDynamoDbClient({
  tableName: env.DYNAMODB_TABLE_NAME,
  client: createSdkDocClient({ region: env.AWS_REGION }),
  logger: (msg: string, ctx?: unknown): void => {
    logger.debug(msg, ctx);
  },
});
