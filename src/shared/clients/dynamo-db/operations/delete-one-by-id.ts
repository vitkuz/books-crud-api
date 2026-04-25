import { DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { DynamoDbClient, DynamoDbClientSettings } from '../types';

export const deleteOneByIdFactory = (
  settings: DynamoDbClientSettings,
): DynamoDbClient['deleteOneById'] => {
  return async (key) => {
    settings.logger?.('dynamo.deleteOneById start', { key });
    await settings.client.send(
      new DeleteCommand({
        TableName: settings.tableName,
        Key: key,
      }),
    );
    settings.logger?.('dynamo.deleteOneById success', { key });
  };
};
