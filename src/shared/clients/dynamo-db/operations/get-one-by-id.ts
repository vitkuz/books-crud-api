import { GetCommand, GetCommandOutput } from '@aws-sdk/lib-dynamodb';
import { DynamoDbClient, DynamoDbClientSettings, DynamoItem } from '../types';

export const getOneByIdFactory = (
  settings: DynamoDbClientSettings,
): DynamoDbClient['getOneById'] => {
  return async (key) => {
    settings.logger?.('dynamo.getOneById start', { key });
    const result: GetCommandOutput = await settings.client.send(
      new GetCommand({
        TableName: settings.tableName,
        Key: key,
      }),
    );
    settings.logger?.('dynamo.getOneById success', { found: result.Item !== undefined });
    return result.Item as DynamoItem | undefined;
  };
};
