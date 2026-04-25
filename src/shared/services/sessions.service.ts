import { v4 as uuidv4 } from 'uuid';
import { dynamoDb } from '../clients/dynamo-db/instance';
import { DynamoItem } from '../clients/dynamo-db/types';
import { Session } from '../types/session.types';
import logger from '../utils/logger';

const SK_VALUE = 'DATA';

const sessionPk = (token: string): string => `SESSION#${token}`;

type SessionItem = DynamoItem & {
  userId: string;
  createdAt: string;
  updatedAt: string;
};

export type SessionsService = {
  create: (userId: string) => Promise<string>;
  findByToken: (token: string) => Promise<Session | undefined>;
  deleteByToken: (token: string) => Promise<void>;
};

export const sessionsService: SessionsService = {
  create: async (userId) => {
    logger.debug('sessions.service.create start', { userId });
    const token = uuidv4();
    const now = new Date().toISOString();
    await dynamoDb.createOne({
      pk: sessionPk(token),
      sk: SK_VALUE,
      userId,
      createdAt: now,
      updatedAt: now,
    });
    logger.debug('sessions.service.create success', { userId });
    return token;
  },

  findByToken: async (token) => {
    logger.debug('sessions.service.findByToken start');
    const item: DynamoItem | undefined = await dynamoDb.getOneById({
      pk: sessionPk(token),
      sk: SK_VALUE,
    });
    if (!item) {
      logger.debug('sessions.service.findByToken not-found');
      return undefined;
    }
    const session: SessionItem = item as SessionItem;
    logger.debug('sessions.service.findByToken success');
    return { userId: session.userId, createdAt: session.createdAt };
  },

  deleteByToken: async (token) => {
    logger.debug('sessions.service.deleteByToken start');
    await dynamoDb.deleteOneById({ pk: sessionPk(token), sk: SK_VALUE });
    logger.debug('sessions.service.deleteByToken success');
  },
};
