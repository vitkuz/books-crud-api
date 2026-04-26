import { DynamoKey, SortByOption } from './types';

const KEY_FIELDS: ReadonlySet<string> = new Set(['pk', 'sk']);

export type UpdateExpressionParts = {
  expression: string;
  names: Record<string, string>;
  values: Record<string, unknown>;
};

export const chunk = <T>(arr: T[], size: number): T[][] => {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
};

export const indexFor = (sortBy: SortByOption): string => {
  if (sortBy === 'pk') return 'GSI1';
  if (sortBy === 'updatedAt') return 'GSI2';
  return 'GSI3';
};

export const buildSetExpression = (
  patch: Record<string, unknown>,
): UpdateExpressionParts | undefined => {
  const names: Record<string, string> = {};
  const values: Record<string, unknown> = {};
  const setClauses: string[] = [];
  let i = 0;
  for (const [field, value] of Object.entries(patch)) {
    if (KEY_FIELDS.has(field)) continue;
    // Skip undefined: DynamoDB rejects an UpdateExpression that references
    // a value name not present in ExpressionAttributeValues, and the SDK
    // strips undefined from that map. Use REMOVE explicitly to clear a field.
    if (value === undefined) continue;
    const nameToken = `#k${i}`;
    const valueToken = `:v${i}`;
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

export type WritePut = { PutRequest: { Item: Record<string, unknown> } };
export type WriteDelete = { DeleteRequest: { Key: DynamoKey } };
