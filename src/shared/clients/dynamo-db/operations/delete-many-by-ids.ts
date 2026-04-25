import { BatchWriteCommand, BatchWriteCommandOutput } from '@aws-sdk/lib-dynamodb';
import { DynamoDbClientSettings, DynamoKey } from '../types';

const BATCH_WRITE_LIMIT = 25;

const chunk = <T>(arr: T[], size: number): T[][] => {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
};

type DeleteRequest = { DeleteRequest: { Key: DynamoKey } };

export const deleteManyByIdsFactory =
  (settings: DynamoDbClientSettings) =>
  async (keys: DynamoKey[]): Promise<void> => {
    settings.logger?.('dynamo.deleteManyByIds start', { count: keys.length });
    if (keys.length === 0) return;

    for (const slice of chunk(keys, BATCH_WRITE_LIMIT)) {
      let pending: DeleteRequest[] = slice.map((key: DynamoKey): DeleteRequest => ({
        DeleteRequest: { Key: key },
      }));
      let attempt = 0;
      while (pending.length > 0 && attempt < 2) {
        const result: BatchWriteCommandOutput = await settings.client.send(
          new BatchWriteCommand({ RequestItems: { [settings.tableName]: pending } }),
        );
        const unprocessed: DeleteRequest[] | undefined = result.UnprocessedItems?.[
          settings.tableName
        ] as DeleteRequest[] | undefined;
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
