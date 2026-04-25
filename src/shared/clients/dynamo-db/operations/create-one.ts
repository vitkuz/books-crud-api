import { PutCommand } from '@aws-sdk/lib-dynamodb';
import { DynamoDbClientSettings, DynamoItem } from '../types';

export const createOneFactory =
  (settings: DynamoDbClientSettings) =>
  async (item: DynamoItem): Promise<DynamoItem> => {
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
