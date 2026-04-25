import { randomBytes } from 'node:crypto';
import { v4 as uuidv4 } from 'uuid';
import { sessionsService } from '../../../shared/services/sessions.service';
import logger from '../../../shared/utils/logger';
import { hashPassword } from '../../../shared/utils/password';
import { toUserResponse } from '../../../shared/utils/user-mapper';
import { countUsers, insertUser } from '../../users/users.store';
import { User } from '../../users/users.types';
import { InitResult } from '../auth.types';

const generateEmail = (): string => {
  const suffix: string = randomBytes(3).toString('hex');
  return `admin-${suffix}@local`;
};

const generatePassword = (): string => randomBytes(12).toString('base64url');

export const init = async (): Promise<InitResult> => {
  logger.debug('init.service start');
  if (countUsers() > 0) {
    logger.debug('init.service already-initialized');
    return { ok: false, error: 'ALREADY_INITIALIZED' };
  }
  const email: string = generateEmail();
  const password: string = generatePassword();
  const now: string = new Date().toISOString();
  const user: User = {
    id: uuidv4(),
    email,
    passwordHash: hashPassword(password),
    name: 'Bootstrap Admin',
    metadata: { createdAt: now, updatedAt: now },
  };
  const inserted: User = insertUser(user);
  const token: string = await sessionsService.create(inserted.id);
  logger.debug('init.service success', { id: inserted.id });
  return { ok: true, user: toUserResponse(inserted), password, token };
};
