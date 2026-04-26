import { v4 as uuidv4 } from 'uuid';
import { dynamoDb } from '../clients/dynamo-db/instance';
import { DynamoItem, DynamoKey } from '../clients/dynamo-db/types';
import { Author } from '../types/author.types';
import logger from '../utils/logger';

const SK_VALUE = 'AUTHOR';

const authorPk = (id: string): string => `AUTHOR#${id}`;

type AuthorItem = DynamoItem & Author & {
  createdAt: string;
  updatedAt: string;
};

const toItem = (author: Author): AuthorItem => ({
  pk: authorPk(author.id),
  sk: SK_VALUE,
  id: author.id,
  name: author.name,
  portraitKey: author.portraitKey,
  metadata: author.metadata,
  createdAt: author.metadata.createdAt,
  updatedAt: author.metadata.updatedAt,
});

const fromItem = (item: DynamoItem): Author => {
  const a: AuthorItem = item as AuthorItem;
  return {
    id: a.id,
    name: a.name,
    portraitKey: a.portraitKey,
    metadata: a.metadata,
  };
};

export type CreateAuthorInput = { name: string; portraitKey?: string };
export type UpdateAuthorInput = { name?: string; portraitKey?: string };

export type AuthorsService = {
  create: (input: CreateAuthorInput) => Promise<Author>;
  findById: (id: string) => Promise<Author | undefined>;
  findManyByIds: (ids: string[]) => Promise<Author[]>;
  findAll: () => Promise<Author[]>;
  update: (id: string, patch: UpdateAuthorInput) => Promise<Author | undefined>;
  delete: (id: string) => Promise<boolean>;
};

export const authorsService: AuthorsService = {
  create: async (input) => {
    logger.debug('authors.service.create start', { name: input.name });
    const now = new Date().toISOString();
    const author: Author = {
      id: uuidv4(),
      name: input.name,
      portraitKey: input.portraitKey,
      metadata: { createdAt: now, updatedAt: now },
    };
    await dynamoDb.createOne(toItem(author));
    logger.debug('authors.service.create success', { id: author.id });
    return author;
  },

  findById: async (id) => {
    logger.debug('authors.service.findById start', { id });
    const item: DynamoItem | undefined = await dynamoDb.getOneById({
      pk: authorPk(id),
      sk: SK_VALUE,
    });
    if (!item) {
      logger.debug('authors.service.findById not-found', { id });
      return undefined;
    }
    logger.debug('authors.service.findById success', { id });
    return fromItem(item);
  },

  findManyByIds: async (ids) => {
    logger.debug('authors.service.findManyByIds start', { count: ids.length });
    const uniqueIds: string[] = Array.from(new Set(ids));
    if (uniqueIds.length === 0) return [];
    const keys: DynamoKey[] = uniqueIds.map((id: string): DynamoKey => ({
      pk: authorPk(id),
      sk: SK_VALUE,
    }));
    const items: DynamoItem[] = await dynamoDb.getManyByIds(keys);
    logger.debug('authors.service.findManyByIds success', { found: items.length });
    return items.map(fromItem);
  },

  findAll: async () => {
    logger.debug('authors.service.findAll start');
    const items: DynamoItem[] = await dynamoDb.listAll(SK_VALUE);
    logger.debug('authors.service.findAll success', { count: items.length });
    return items.map(fromItem);
  },

  update: async (id, patch) => {
    logger.debug('authors.service.update start', { id });
    const existing: Author | undefined = await authorsService.findById(id);
    if (!existing) {
      logger.debug('authors.service.update not-found', { id });
      return undefined;
    }
    const now = new Date().toISOString();
    const next: Author = {
      id: existing.id,
      name: patch.name !== undefined ? patch.name : existing.name,
      portraitKey: patch.portraitKey !== undefined ? patch.portraitKey : existing.portraitKey,
      metadata: {
        createdAt: existing.metadata.createdAt,
        updatedAt: now,
      },
    };
    const updated: DynamoItem = await dynamoDb.patchOneById(
      { pk: authorPk(id), sk: SK_VALUE },
      {
        name: next.name,
        portraitKey: next.portraitKey,
        metadata: next.metadata,
        updatedAt: now,
      },
    );
    logger.debug('authors.service.update success', { id });
    return fromItem(updated);
  },

  delete: async (id) => {
    logger.debug('authors.service.delete start', { id });
    const existing: Author | undefined = await authorsService.findById(id);
    if (!existing) {
      logger.debug('authors.service.delete not-found', { id });
      return false;
    }
    await dynamoDb.deleteOneById({ pk: authorPk(id), sk: SK_VALUE });
    logger.debug('authors.service.delete success', { id });
    return true;
  },
};
