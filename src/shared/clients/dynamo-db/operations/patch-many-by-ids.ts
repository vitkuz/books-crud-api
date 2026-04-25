import { DynamoDbClient, DynamoDbClientSettings, DynamoItem, PatchEntry } from '../types';
import { patchOneByIdFactory } from './patch-one-by-id';

export const patchManyByIdsFactory =
  (settings: DynamoDbClientSettings): DynamoDbClient['patchManyByIds'] => {
    const patchOne = patchOneByIdFactory(settings);
    return async (entries: PatchEntry[]): Promise<DynamoItem[]> => {
      settings.logger?.('dynamo.patchManyByIds start', { count: entries.length });
      const updated: DynamoItem[] = [];
      for (const entry of entries) {
        const item: DynamoItem = await patchOne(entry.key, entry.patch);
        updated.push(item);
      }
      settings.logger?.('dynamo.patchManyByIds success', { count: updated.length });
      return updated;
    };
  };
