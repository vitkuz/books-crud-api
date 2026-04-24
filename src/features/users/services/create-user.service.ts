import { v4 as uuidv4 } from 'uuid';
import logger from '../../../shared/utils/logger';
import { findUserByEmail, insertUser } from '../users.store';
import {
  CreateUserPayload,
  CreateUserResult,
  User,
} from '../users.types';
import { hashPassword } from '../../../shared/utils/password';

export const createUser = (payload: CreateUserPayload): CreateUserResult => {
  logger.debug('create-user.service start', { email: payload.email });
  if (findUserByEmail(payload.email)) {
    logger.debug('create-user.service email-taken', { email: payload.email });
    return { ok: false, error: 'EMAIL_TAKEN' };
  }
  const now = new Date().toISOString();
  const user: User = {
    id: uuidv4(),
    email: payload.email,
    passwordHash: hashPassword(payload.password),
    name: payload.name,
    metadata: { createdAt: now, updatedAt: now },
  };
  const inserted: User = insertUser(user);
  logger.debug('create-user.service success', { id: inserted.id });
  return { ok: true, user: inserted };
};
