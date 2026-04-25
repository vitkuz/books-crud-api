import { UpdateCommand, UpdateCommandOutput } from '@aws-sdk/lib-dynamodb';
import { DynamoDbClient, DynamoDbClientSettings, DynamoItem } from '../types';
import { buildSetExpression, UpdateExpressionParts } from '../utils';

export const patchOneByIdFactory = (
  settings: DynamoDbClientSettings,
): DynamoDbClient['patchOneById'] => {
  return async (key, patch) => {
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
};
