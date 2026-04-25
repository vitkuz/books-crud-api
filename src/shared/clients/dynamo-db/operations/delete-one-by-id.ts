import { DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { DynamoDbClientSettings, DynamoKey } from '../types';

export const deleteOneByIdFactory =
  (settings: DynamoDbClientSettings) =>
  async (key: DynamoKey): Promise<void> => {
    settings.logger?.('dynamo.deleteOneById start', { key });
    await settings.client.send(
      new DeleteCommand({
        TableName: settings.tableName,
        Key: key,
      }),
    );
    settings.logger?.('dynamo.deleteOneById success', { key });
  };
