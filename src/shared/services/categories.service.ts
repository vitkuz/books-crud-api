import { v4 as uuidv4 } from 'uuid';
import { dynamoDb } from '../clients/dynamo-db/instance';
import { DynamoItem, DynamoKey } from '../clients/dynamo-db/types';
import { Category } from '../types/category.types';
import logger from '../utils/logger';

const SK_VALUE = 'CATEGORY';

const categoryPk = (id: string): string => `CATEGORY#${id}`;

type CategoryItem = DynamoItem & Category & {
  createdAt: string;
  updatedAt: string;
};

const toItem = (category: Category): CategoryItem => ({
  pk: categoryPk(category.id),
  sk: SK_VALUE,
  id: category.id,
  name: category.name,
  metadata: category.metadata,
  createdAt: category.metadata.createdAt,
  updatedAt: category.metadata.updatedAt,
});

const fromItem = (item: DynamoItem): Category => {
  const c: CategoryItem = item as CategoryItem;
  return {
    id: c.id,
    name: c.name,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
    metadata: c.metadata,
  };
};

export type CreateCategoryInput = { name: string };
export type UpdateCategoryInput = { name?: string };

export type CategoriesService = {
  create: (input: CreateCategoryInput) => Promise<Category>;
  findById: (id: string) => Promise<Category | undefined>;
  findManyByIds: (ids: string[]) => Promise<Category[]>;
  findAll: () => Promise<Category[]>;
  update: (id: string, patch: UpdateCategoryInput) => Promise<Category | undefined>;
  delete: (id: string) => Promise<boolean>;
};

export const categoriesService: CategoriesService = {
  create: async (input) => {
    logger.debug('categories.service.create start', { name: input.name });
    const now = new Date().toISOString();
    const category: Category = {
      id: uuidv4(),
      name: input.name,
      createdAt: now,
      updatedAt: now,
      metadata: { createdAt: now, updatedAt: now },
    };
    await dynamoDb.createOne(toItem(category));
    logger.debug('categories.service.create success', { id: category.id });
    return category;
  },

  findById: async (id) => {
    logger.debug('categories.service.findById start', { id });
    const item: DynamoItem | undefined = await dynamoDb.getOneById({
      pk: categoryPk(id),
      sk: SK_VALUE,
    });
    if (!item) {
      logger.debug('categories.service.findById not-found', { id });
      return undefined;
    }
    logger.debug('categories.service.findById success', { id });
    return fromItem(item);
  },

  findManyByIds: async (ids) => {
    logger.debug('categories.service.findManyByIds start', { count: ids.length });
    const uniqueIds: string[] = Array.from(new Set(ids));
    if (uniqueIds.length === 0) return [];
    const keys: DynamoKey[] = uniqueIds.map((id: string): DynamoKey => ({
      pk: categoryPk(id),
      sk: SK_VALUE,
    }));
    const items: DynamoItem[] = await dynamoDb.getManyByIds(keys);
    logger.debug('categories.service.findManyByIds success', { found: items.length });
    return items.map(fromItem);
  },

  findAll: async () => {
    logger.debug('categories.service.findAll start');
    const items: DynamoItem[] = await dynamoDb.listAll(SK_VALUE);
    logger.debug('categories.service.findAll success', { count: items.length });
    return items.map(fromItem);
  },

  update: async (id, patch) => {
    logger.debug('categories.service.update start', { id });
    const existing: Category | undefined = await categoriesService.findById(id);
    if (!existing) {
      logger.debug('categories.service.update not-found', { id });
      return undefined;
    }
    const now = new Date().toISOString();
    const next: Category = {
      id: existing.id,
      name: patch.name !== undefined ? patch.name : existing.name,
      createdAt: existing.createdAt,
      updatedAt: now,
      metadata: {
        createdAt: existing.metadata.createdAt,
        updatedAt: now,
      },
    };
    const updated: DynamoItem = await dynamoDb.patchOneById(
      { pk: categoryPk(id), sk: SK_VALUE },
      {
        name: next.name,
        metadata: next.metadata,
        updatedAt: now,
      },
    );
    logger.debug('categories.service.update success', { id });
    return fromItem(updated);
  },

  delete: async (id) => {
    logger.debug('categories.service.delete start', { id });
    const existing: Category | undefined = await categoriesService.findById(id);
    if (!existing) {
      logger.debug('categories.service.delete not-found', { id });
      return false;
    }
    await dynamoDb.deleteOneById({ pk: categoryPk(id), sk: SK_VALUE });
    logger.debug('categories.service.delete success', { id });
    return true;
  },
};
