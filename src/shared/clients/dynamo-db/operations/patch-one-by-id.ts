import { UpdateCommand, UpdateCommandOutput } from '@aws-sdk/lib-dynamodb';
import { DynamoDbClientSettings, DynamoItem, DynamoKey } from '../types';

const KEY_FIELDS: ReadonlySet<string> = new Set(['pk', 'sk']);

type UpdateExpressionParts = {
  expression: string;
  names: Record<string, string>;
  values: Record<string, unknown>;
};

const buildSetExpression = (patch: Record<string, unknown>): UpdateExpressionParts | undefined => {
  const names: Record<string, string> = {};
  const values: Record<string, unknown> = {};
  const setClauses: string[] = [];
  let i = 0;
  for (const [field, value] of Object.entries(patch)) {
    if (KEY_FIELDS.has(field)) continue;
    const nameToken: string = `#k${i}`;
    const valueToken: string = `:v${i}`;
    names[nameToken] = field;
    values[valueToken] = value;
    setClauses.push(`${nameToken} = ${valueToken}`);
    i += 1;
  }
  if (setClauses.length === 0) return undefined;
  return {
    expression: `SET ${setClauses.join(', ')}`,
    names,
    values,
  };
};

export const patchOneByIdFactory =
  (settings: DynamoDbClientSettings) =>
  async (key: DynamoKey, patch: Record<string, unknown>): Promise<DynamoItem> => {
    settings.logger?.('dynamo.patchOneById start', { key, fields: Object.keys(patch) });
    const parts: UpdateExpressionParts | undefined = buildSetExpression(patch);
    if (!parts) {
      throw new Error('patchOneById requires at least one non-key field in `patch`.');
    }
    const result: UpdateCommandOutput = await settings.client.send(
      new UpdateCommand({
        TableName: settings.tableName,
        Key: key,
        UpdateExpression: parts.expression,
        ExpressionAttributeNames: parts.names,
        ExpressionAttributeValues: parts.values,
        ReturnValues: 'ALL_NEW',
      }),
    );
    settings.logger?.('dynamo.patchOneById success', { key });
    return result.Attributes as DynamoItem;
  };
