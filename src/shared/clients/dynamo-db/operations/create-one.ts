import { PutCommand } from '@aws-sdk/lib-dynamodb';
import { DynamoDbClient, DynamoDbClientSettings } from '../types';

export const createOneFactory = (
  settings: DynamoDbClientSettings,
): DynamoDbClient['createOne'] => {
  return async (item) => {
    settings.logger?.('dynamo.createOne start', { pk: item.pk, sk: item.sk });
    await settings.client.send(
      new PutCommand({
        TableName: settings.tableName,
        Item: item,
      }),
    );
    settings.logger?.('dynamo.createOne success', { pk: item.pk, sk: item.sk });
    return item;
  };
};
