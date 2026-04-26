import { v4 as uuidv4 } from 'uuid';
import { dynamoDb } from '../clients/dynamo-db/instance';
import { DynamoItem } from '../clients/dynamo-db/types';
import {
  CreateUserResult,
  UpdateUserResult,
  User,
  UserPatch,
} from '../types/user.types';
import logger from '../utils/logger';
import { hashPassword } from '../utils/password';

const SK_VALUE = 'PROFILE';

const userPk = (id: string): string => `USER#${id}`;

type UserItem = DynamoItem & User & {
  createdAt: string;
  updatedAt: string;
};

const toItem = (user: User): UserItem => ({
  pk: userPk(user.id),
  sk: SK_VALUE,
  id: user.id,
  email: user.email,
  passwordHash: user.passwordHash,
  name: user.name,
  metadata: user.metadata,
  createdAt: user.metadata.createdAt,
  updatedAt: user.metadata.updatedAt,
});

const fromItem = (item: DynamoItem): User => {
  const u: UserItem = item as UserItem;
  return {
    id: u.id,
    email: u.email,
    passwordHash: u.passwordHash,
    name: u.name,
    createdAt: u.createdAt,
    updatedAt: u.updatedAt,
    metadata: u.metadata,
  };
};

export type CreateUserInput = {
  email: string;
  password: string;
  name?: string;
};

export type UsersService = {
  create: (input: CreateUserInput) => Promise<CreateUserResult>;
  findById: (id: string) => Promise<User | undefined>;
  findByEmail: (email: string) => Promise<User | undefined>;
  findAll: () => Promise<User[]>;
  update: (id: string, patch: UpdateUserInput) => Promise<UpdateUserResult>;
  delete: (id: string) => Promise<boolean>;
  count: () => Promise<number>;
};

export type UpdateUserInput = {
  email?: string;
  password?: string;
  name?: string;
};

export const usersService: UsersService = {
  create: async (input) => {
    logger.debug('users.service.create start', { email: input.email });
    try {
      const collision: User | undefined = await usersService.findByEmail(input.email);
      if (collision) {
        logger.debug('users.service.create email-taken', { email: input.email });
        return { ok: false, error: 'EMAIL_TAKEN' };
      }
      const now = new Date().toISOString();
      const user: User = {
        id: uuidv4(),
        email: input.email,
        passwordHash: hashPassword(input.password),
        name: input.name,
        createdAt: now,
        updatedAt: now,
        metadata: { createdAt: now, updatedAt: now },
      };
      await dynamoDb.createOne(toItem(user));
      logger.debug('users.service.create success', { id: user.id });
      return { ok: true, user };
    } catch (err) {
      logger.debug('users.service.create internal', {
        error: err instanceof Error ? err.message : String(err),
      });
      return { ok: false, error: 'INTERNAL' };
    }
  },

  findById: async (id) => {
    logger.debug('users.service.findById start', { id });
    const item: DynamoItem | undefined = await dynamoDb.getOneById({
      pk: userPk(id),
      sk: SK_VALUE,
    });
    if (!item) {
      logger.debug('users.service.findById not-found', { id });
      return undefined;
    }
    logger.debug('users.service.findById success', { id });
    return fromItem(item);
  },

  findByEmail: async (email) => {
    logger.debug('users.service.findByEmail start');
    // Single-table approach: list all PROFILE items and filter by email.
    // OK at demo scale; a dedicated email index would replace this when
    // the user table grows.
    const items: DynamoItem[] = await dynamoDb.listAll(SK_VALUE);
    const needle = email.toLowerCase();
    const match: DynamoItem | undefined = items.find(
      (i: DynamoItem): boolean =>
        typeof i.email === 'string' && i.email.toLowerCase() === needle,
    );
    if (!match) {
      logger.debug('users.service.findByEmail not-found');
      return undefined;
    }
    logger.debug('users.service.findByEmail success');
    return fromItem(match);
  },

  findAll: async () => {
    logger.debug('users.service.findAll start');
    const items: DynamoItem[] = await dynamoDb.listAll(SK_VALUE);
    logger.debug('users.service.findAll success', { count: items.length });
    return items.map(fromItem);
  },

  update: async (id, patch) => {
    logger.debug('users.service.update start', { id });
    try {
      const existing: User | undefined = await usersService.findById(id);
      if (!existing) {
        logger.debug('users.service.update not-found', { id });
        return { ok: false, error: 'USER_NOT_FOUND' };
      }
      if (patch.email !== undefined && patch.email !== existing.email) {
        const collision: User | undefined = await usersService.findByEmail(patch.email);
        if (collision && collision.id !== id) {
          logger.debug('users.service.update email-taken', { email: patch.email });
          return { ok: false, error: 'EMAIL_TAKEN' };
        }
      }
      const now = new Date().toISOString();
      const next: User = {
        id: existing.id,
        email: patch.email ?? existing.email,
        passwordHash:
          patch.password !== undefined ? hashPassword(patch.password) : existing.passwordHash,
        name: patch.name !== undefined ? patch.name : existing.name,
        createdAt: existing.createdAt,
        updatedAt: now,
        metadata: {
          createdAt: existing.metadata.createdAt,
          updatedAt: now,
        },
      };
      const updatedItem: DynamoItem = await dynamoDb.patchOneById(
        { pk: userPk(id), sk: SK_VALUE },
        {
          email: next.email,
          passwordHash: next.passwordHash,
          name: next.name,
          metadata: next.metadata,
          updatedAt: now,
        },
      );
      logger.debug('users.service.update success', { id });
      return { ok: true, user: fromItem(updatedItem) };
    } catch (err) {
      logger.debug('users.service.update internal', {
        id,
        error: err instanceof Error ? err.message : String(err),
      });
      return { ok: false, error: 'INTERNAL' };
    }
  },

  delete: async (id) => {
    logger.debug('users.service.delete start', { id });
    const existing: User | undefined = await usersService.findById(id);
    if (!existing) {
      logger.debug('users.service.delete not-found', { id });
      return false;
    }
    await dynamoDb.deleteOneById({ pk: userPk(id), sk: SK_VALUE });
    logger.debug('users.service.delete success', { id });
    return true;
  },

  count: async () => {
    logger.debug('users.service.count start');
    const items: DynamoItem[] = await dynamoDb.listAll(SK_VALUE);
    logger.debug('users.service.count success', { count: items.length });
    return items.length;
  },
};

