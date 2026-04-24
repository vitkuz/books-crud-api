import { v4 as uuidv4 } from 'uuid';
import logger from '../../../shared/utils/logger';
import { hashPassword } from '../../../shared/utils/password';
import { toUserResponse } from '../../../shared/utils/user-mapper';
import { findUserByEmail, insertUser } from '../../users/users.store';
import { User } from '../../users/users.types';
import { createSession } from '../auth.store';
import { RegisterPayload, RegisterResult } from '../auth.types';

export const register = (payload: RegisterPayload): RegisterResult => {
  logger.debug('register.service start', { email: payload.email });
  if (findUserByEmail(payload.email)) {
    logger.debug('register.service email-taken', { email: payload.email });
    return { ok: false, error: 'EMAIL_TAKEN' };
  }
  const now: string = new Date().toISOString();
  const user: User = {
    id: uuidv4(),
    email: payload.email,
    passwordHash: hashPassword(payload.password),
    name: payload.name,
    metadata: { createdAt: now, updatedAt: now },
  };
  const inserted: User = insertUser(user);
  const token: string = createSession(inserted.id);
  logger.debug('register.service success', { id: inserted.id });
  return { ok: true, user: toUserResponse(inserted), token };
};
