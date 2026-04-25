import { BatchWriteCommand, BatchWriteCommandOutput } from '@aws-sdk/lib-dynamodb';
import { DynamoDbClient, DynamoDbClientSettings, DynamoItem } from '../types';
import { chunk, WritePut } from '../utils';

const BATCH_WRITE_LIMIT = 25;

export const createManyFactory = (
  settings: DynamoDbClientSettings,
): DynamoDbClient['createMany'] => {
  return async (items) => {
    settings.logger?.('dynamo.createMany start', { count: items.length });
    if (items.length === 0) return [];

    for (const slice of chunk(items, BATCH_WRITE_LIMIT)) {
      let pending: WritePut[] = slice.map((item: DynamoItem): WritePut => ({
        PutRequest: { Item: item },
      }));
      let attempt = 0;
      while (pending.length > 0 && attempt < 2) {
        const result: BatchWriteCommandOutput = await settings.client.send(
          new BatchWriteCommand({ RequestItems: { [settings.tableName]: pending } }),
        );
        const unprocessed: WritePut[] | undefined = result.UnprocessedItems?.[
          settings.tableName
        ] as WritePut[] | undefined;
        if (!unprocessed || unprocessed.length === 0) {
          pending = [];
          break;
        }
        pending = unprocessed;
        attempt += 1;
      }
      if (pending.length > 0 && attempt >= 2) {
        settings.logger?.('dynamo.createMany unprocessed-after-retry', {
          remaining: pending.length,
        });
        throw new Error(
          `DynamoDB BatchWriteItem left ${pending.length} unprocessed Put requests after one retry.`,
        );
      }
    }

    settings.logger?.('dynamo.createMany success', { count: items.length });
    return items;
  };
};
