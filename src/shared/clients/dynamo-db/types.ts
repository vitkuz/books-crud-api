import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

export type DynamoKey = { pk: string; sk: string };

export type DynamoItem = DynamoKey & Record<string, unknown>;

export type SortByOption = 'pk' | 'updatedAt' | 'createdAt';

export type ListAllOptions = {
  sortBy?: SortByOption;
  descending?: boolean;
};

export type DynamoDbClientLogger = (msg: string, ctx?: unknown) => void;

export type DynamoDbClientSettings = {
  tableName: string;
  client: DynamoDBDocumentClient;
  logger?: DynamoDbClientLogger;
};

export type PatchEntry = {
  key: DynamoKey;
  patch: Record<string, unknown>;
};

export type DynamoDbClient = {
  getOneById: (key: DynamoKey) => Promise<DynamoItem | undefined>;
  getManyByIds: (keys: DynamoKey[]) => Promise<DynamoItem[]>;
  createOne: (item: DynamoItem) => Promise<DynamoItem>;
  createMany: (items: DynamoItem[]) => Promise<DynamoItem[]>;
  deleteOneById: (key: DynamoKey) => Promise<void>;
  deleteManyByIds: (keys: DynamoKey[]) => Promise<void>;
  patchOneById: (key: DynamoKey, patch: Record<string, unknown>) => Promise<DynamoItem>;
  patchManyByIds: (entries: PatchEntry[]) => Promise<DynamoItem[]>;
  listAll: (sk: string, options?: ListAllOptions) => Promise<DynamoItem[]>;
};
