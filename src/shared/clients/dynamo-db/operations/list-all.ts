import { QueryCommand, QueryCommandOutput } from '@aws-sdk/lib-dynamodb';
import {
  DynamoDbClientSettings,
  DynamoItem,
  ListAllOptions,
  SortByOption,
} from '../types';

const indexFor = (sortBy: SortByOption): string => {
  if (sortBy === 'pk') return 'GSI1';
  if (sortBy === 'updatedAt') return 'GSI2';
  return 'GSI3';
};

export const listAllFactory =
  (settings: DynamoDbClientSettings) =>
  async (sk: string, options?: ListAllOptions): Promise<DynamoItem[]> => {
    const sortBy: SortByOption = options?.sortBy ?? 'pk';
    const descending: boolean = options?.descending ?? false;
    const indexName: string = indexFor(sortBy);

    settings.logger?.('dynamo.listAll start', { sk, sortBy, descending, indexName });

    const items: DynamoItem[] = [];
    let lastKey: Record<string, unknown> | undefined;
    let pages = 0;
    do {
      const result: QueryCommandOutput = await settings.client.send(
        new QueryCommand({
          TableName: settings.tableName,
          IndexName: indexName,
          KeyConditionExpression: '#sk = :sk',
          ExpressionAttributeNames: { '#sk': 'sk' },
          ExpressionAttributeValues: { ':sk': sk },
          ScanIndexForward: !descending,
          ExclusiveStartKey: lastKey,
        }),
      );
      items.push(...((result.Items ?? []) as DynamoItem[]));
      lastKey = result.LastEvaluatedKey;
      pages += 1;
    } while (lastKey);

    settings.logger?.('dynamo.listAll success', { sk, count: items.length, pages });
    return items;
  };
