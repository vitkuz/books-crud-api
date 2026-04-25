import { BatchGetCommand, BatchGetCommandOutput } from '@aws-sdk/lib-dynamodb';
import { DynamoDbClientSettings, DynamoItem, DynamoKey } from '../types';

const BATCH_GET_LIMIT = 100;

const chunk = <T>(arr: T[], size: number): T[][] => {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
};

export const getManyByIdsFactory =
  (settings: DynamoDbClientSettings) =>
  async (keys: DynamoKey[]): Promise<DynamoItem[]> => {
    settings.logger?.('dynamo.getManyByIds start', { count: keys.length });
    if (keys.length === 0) return [];

    const items: DynamoItem[] = [];
    for (const slice of chunk(keys, BATCH_GET_LIMIT)) {
      let request: { Keys: DynamoKey[] } = { Keys: slice };
      let attempt = 0;
      while (request.Keys.length > 0 && attempt < 2) {
        const result: BatchGetCommandOutput = await settings.client.send(
          new BatchGetCommand({ RequestItems: { [settings.tableName]: request } }),
        );
        const found: DynamoItem[] = (result.Responses?.[settings.tableName] ?? []) as DynamoItem[];
        items.push(...found);
        const unprocessed: DynamoKey[] | undefined = (
          result.UnprocessedKeys?.[settings.tableName]?.Keys as DynamoKey[] | undefined
        );
        if (!unprocessed || unprocessed.length === 0) break;
        request = { Keys: unprocessed };
        attempt += 1;
      }
      if (request.Keys.length > 0 && attempt >= 2) {
        settings.logger?.('dynamo.getManyByIds unprocessed-after-retry', {
          remaining: request.Keys.length,
        });
        throw new Error(
          `DynamoDB BatchGetItem left ${request.Keys.length} unprocessed keys after one retry.`,
        );
      }
    }

    settings.logger?.('dynamo.getManyByIds success', { found: items.length });
    return items;
  };
