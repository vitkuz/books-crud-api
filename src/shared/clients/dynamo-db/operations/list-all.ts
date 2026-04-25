import { QueryCommand, QueryCommandOutput } from '@aws-sdk/lib-dynamodb';
import { DynamoDbClient, DynamoDbClientSettings, DynamoItem, SortByOption } from '../types';
import { indexFor } from '../utils';

export const listAllFactory = (
  settings: DynamoDbClientSettings,
): DynamoDbClient['listAll'] => {
  return async (sk, options) => {
    const sortBy: SortByOption = options?.sortBy ?? 'pk';
    const descending = options?.descending ?? false;
    const indexName = indexFor(sortBy);

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
};
