import { BatchWriteCommand, BatchWriteCommandOutput } from '@aws-sdk/lib-dynamodb';
import { DynamoDbClient, DynamoDbClientSettings, DynamoKey } from '../types';
import { chunk, WriteDelete } from '../utils';

const BATCH_WRITE_LIMIT = 25;

export const deleteManyByIdsFactory = (
  settings: DynamoDbClientSettings,
): DynamoDbClient['deleteManyByIds'] => {
  return async (keys) => {
    settings.logger?.('dynamo.deleteManyByIds start', { count: keys.length });
    if (keys.length === 0) return;

    for (const slice of chunk(keys, BATCH_WRITE_LIMIT)) {
      let pending: WriteDelete[] = slice.map((key: DynamoKey): WriteDelete => ({
        DeleteRequest: { Key: key },
      }));
      let attempt = 0;
      while (pending.length > 0 && attempt < 2) {
        const result: BatchWriteCommandOutput = await settings.client.send(
          new BatchWriteCommand({ RequestItems: { [settings.tableName]: pending } }),
        );
        const unprocessed: WriteDelete[] | undefined = result.UnprocessedItems?.[
          settings.tableName
        ] as WriteDelete[] | undefined;
        if (!unprocessed || unprocessed.length === 0) {
          pending = [];
          break;
        }
        pending = unprocessed;
        attempt += 1;
      }
      if (pending.length > 0 && attempt >= 2) {
        settings.logger?.('dynamo.deleteManyByIds unprocessed-after-retry', {
          remaining: pending.length,
        });
        throw new Error(
          `DynamoDB BatchWriteItem left ${pending.length} unprocessed Delete requests after one retry.`,
        );
      }
    }

    settings.logger?.('dynamo.deleteManyByIds success', { count: keys.length });
  };
};
